const axios = require('axios');
const { ingestPivotedRecords } = require('./ingestionService');
const { makePivot } = require('../logic/lossCalculation');
const { pool } = require('../config/db');
const { setWorkerStatus } = require('../state');

// Padtec API Configuration from Env Vars
const PADTEC_URL = process.env.PADTEC_URL || 'http://10.253.0.118';
const PADTEC_USER = process.env.PADTEC_USER || 'josepetit';
const PADTEC_PASS = process.env.PADTEC_PASS || 'jose123+';

let workerRunning = false;
let sessionToken = null;

/**
 * Authenticates with Padtec NMS to get a fresh session token.
 */
async function loginToPadtec() {
    try {
        console.log(`🔐 NMS Worker: Attempting login to ${PADTEC_URL}...`);
        const { data } = await axios.post(`${PADTEC_URL}/api/auth/login/`, {
            username: PADTEC_USER,
            password: PADTEC_PASS
        }, { timeout: 10000 });

        sessionToken = data.token;
        console.log('✅ NMS Worker: Session token acquired.');
        return sessionToken;
    } catch (err) {
        console.error('❌ NMS Worker Login Error:', err.message);
        return null;
    }
}

/**
 * Fetches raw performance records from Padtec NMS.
 */
async function fetchPerformanceData() {
    if (!sessionToken) await loginToPadtec();
    if (!sessionToken) return null;

    try {
        const headers = {
            Authorization: `Token ${sessionToken}`,
            Referer: `${PADTEC_URL}/measurementsPerformance`
        };
        const { data } = await axios.get(
            `${PADTEC_URL}/api/ne/performance?metadata=true&page=1&per_page=10000`,
            { headers, timeout: 30000 }
        );
        return data;
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('⚠️ NMS Worker: Token expired, re-authenticating...');
            sessionToken = null;
            return fetchPerformanceData();
        }
        console.error('❌ NMS Worker Fetch Error:', err.message);
        return null;
    }
}

/**
 * Formats Padtec raw data into pivoted JSON objects.
 */
function processPadtecRecords(raw) {
    const records = raw.results?.records || [];
    const fields = raw.results?.fields || [];

    const flattened = records.map(record => {
        const obj = {};
        fields.forEach((field, i) => { obj[field.name] = record[i]; });
        return obj;
    }).filter(r =>
        r.card && (
            r.card.includes('FT-') ||
            r.card.includes('EOA2') ||
            r.card.includes('HOA2') ||
            r.card.includes('FAN')
        )
    );

    return makePivot(flattened);
}

/**
 * Main worker loop.
 */
async function startNmsWorker() {
    if (workerRunning) return;
    workerRunning = true;
    console.log('🚀 NMS Background Worker Initialized.');

    // Immediate first run
    await runCycle();

    // Loop every 5 minutes (300,000 ms)
    setInterval(runCycle, 300000);
}

async function runCycle() {
    console.log(`🕒 NMS Worker Cycle Start: ${new Date().toISOString()}`);

    try {
        // Hot-reload settings, daily baselines, and inhibitions
        const { loadSettingsFromDB, getSettings, loadDailyBaselines, loadInhibitionsFromDB, loadAuthorizedChatsFromDB, loadEnlacesFromDB, loadAcksFromDB } = require('../state');
        await loadSettingsFromDB();
        await loadInhibitionsFromDB();
        await loadAuthorizedChatsFromDB();
        await loadEnlacesFromDB();
        await loadAcksFromDB();

        // Refresh 12h baselines every 30 mins (approx every 6 cycles of 5m)
        if (!global.lastBaselineRefresh || Date.now() - global.lastBaselineRefresh > 1800000) {
            await loadDailyBaselines();
            global.lastBaselineRefresh = Date.now();
        }

        const config = getSettings();

        const rawData = await fetchPerformanceData();
        if (!rawData) {
            setWorkerStatus({ last_run: new Date(), status: 'error', error: 'Could not fetch data from NMS' });
            return;
        }

        const pivoted = processPadtecRecords(rawData);
        if (pivoted.length > 0) {
            await ingestPivotedRecords(pivoted);
            console.log(`✅ NMS Worker: Ingested ${pivoted.length} cards.`);
            setWorkerStatus({ last_run: new Date(), status: 'ok', error: null });

            // Maintenance list cleanup: Delete windows older than 10 hours from START
            await purgeOldMaintenanceWindows();

            // PROACTIVE INTELLIGENT ALERTS
            await checkProactiveAlerts(pivoted, config);

            // AUTOMATIC PERSISTENCE WITH DYNAMIC INTERVAL
            await checkAndAutoPersist(config);
        }
    } catch (err) {
        console.error('❌ NMS Worker Cycle Failed:', err.message);
        setWorkerStatus({ last_run: new Date(), status: 'error', error: err.message });
    }
}

async function purgeOldMaintenanceWindows() {
    try {
        const [res] = await pool.query(
            "DELETE FROM maintenance_windows WHERE start_date < DATE_SUB(NOW(), INTERVAL 10 HOUR)"
        );
        if (res.affectedRows > 0) {
            console.log(`🧹 Maintenance Cleanup: Removed ${res.affectedRows} expired windows.`);
        }
    } catch (err) {
        console.error('❌ Maintenance Cleanup Error:', err.message);
    }
}

async function checkAndAutoPersist(config) {
    try {
        // Query current persistence status from a separate small table or the same system_settings
        const [rows] = await pool.query("SELECT svalue, next_at FROM settings WHERE skey = 'refresh_interval_ms' LIMIT 1");
        if (!rows.length) return;

        const now = Date.now();
        const nextAt = Number(rows[0].next_at);

        if (now >= nextAt) {
            console.log('🏁 Auto-Persist: It is time to save a history batch.');

            const { persistSpansInternal } = require('../routes/spans');
            await persistSpansInternal();

            // Calculate next run based on dynamic scan_interval setting (min -> ms)
            const intervalMinutes = Number(config.scan_interval) || 5;
            const intervalMs = intervalMinutes * 60 * 1000;

            const newNextAt = now + intervalMs;
            await pool.query("UPDATE settings SET next_at = ?, svalue = ? WHERE skey = 'refresh_interval_ms'", [String(newNextAt), String(intervalMs)]);
            console.log(`✅ Auto-Persist Complete. Next run at: ${new Date(newNextAt).toLocaleString()} (Interval: ${intervalMinutes}m)`);

            const { purgeOldSpans } = require('../routes/spans');
            await purgeOldSpans();
        }
    } catch (err) {
        console.error('❌ Auto-Persist Error:', err.message);
    }
}

async function checkProactiveAlerts(currentPivots, config) {
    const { getEnlaces, getLastValues, getDailyBaselines, getAcknowledgedDrifts, isInhibited } = require('../state');
    const { isAmplifier, getCardPrefix, getVal } = require('../logic/lossCalculation');
    const { broadcastTelegramNotification } = require('./telegramService');

    const enlaces = getEnlaces();
    const lastValues = getLastValues();
    const dailyBaselines = getDailyBaselines();
    const acknowledgedDrifts = getAcknowledgedDrifts();
    const driftWindow = Number(config.alert_drift_window_hours) || 12;

    const rapidThreshold = Number(config.alert_rapid_increase_threshold) || 1.5;
    const confirmationSamples = Math.min(5, Math.max(2, Number(config.alert_confirmation_samples) || 2));
    const jitterThreshold = Number(config.alert_jitter_threshold) || 0.3;
    const driftThreshold = 1.0;

    enlaces.forEach(async (en) => {
        const originId = String(en.enlace1 || en.enlace);

        // CHECK INHIBITION: Hardware-level (Serial)
        if (isInhibited(originId)) return;

        const origin = currentPivots.find(p => String(p.serial) === originId);
        if (!origin || !isAmplifier(origin.card)) return;

        const targets = currentPivots.filter(p => String(p.serial) === String(en.enlace2));
        const target = en.isSingle ? null : targets.find(t => isAmplifier(t.card));

        if (!en.isSingle && !target) return;

        const outLineA = getVal(origin, 'OUT Line Power');
        const inLineB = en.isSingle ? 0 : getVal(target, 'IN Line Power');

        // HARDENING: Ignore if data is missing or suspicious for DWDM
        if (outLineA === null || inLineB === null) {
            // console.log(`[Worker] Telemetry incomplete for ${en.name1 || originId}. Skipping.`);
            return;
        }

        const currentLoss = en.isSingle ? 0 : Math.max(0, (outLineA - inLineB) - Number(en.raman1 || 0));

        // Skip if loss is zero or suspiciously low (e.g. < 0.1dB) indicating a likely data glitch for fiber links
        if (currentLoss < 0.1 && !en.isSingle) {
            console.log(`⚠️ Suspicious Low Loss for ${en.name1 || originId}: ${currentLoss.toFixed(2)} dB (TX:${outLineA}, RX:${inLineB}). Discarding.`);
            return;
        }

        const name = en.alias || en.name1 || 'Enlace';
        const cacheKey = `loss_${originId}`;
        const history = lastValues.get(cacheKey) || [];

        // CHECK 1: RAPID JUMP (15 min window) with MULTI-SAMPLE VERIFICATION
        // history[0] is oldest, history[1] is middle, history[2] is previous
        const prevLoss = history.length >= 1 ? history[history.length - 1] : null;

        if (prevLoss !== null && prevLoss > 0) {
            const jumpDiff = currentLoss - prevLoss;

            // 1. JITTER FILTER: Ignore small oscillations based on web settings
            if (Math.abs(jumpDiff) < jitterThreshold) {
                // Not enough change to bother processing
            } else if (jumpDiff >= rapidThreshold) {
                // 2. STRICT MULTI-SAMPLE VERIFICATION:
                // We check that ALL recent samples in the window are consistently high.
                const needed = Math.min(5, Math.max(2, Number(config.alert_confirmation_samples) || 3));
                const recentHistory = [...history, currentLoss].slice(-needed);

                if (recentHistory.length >= needed) {
                    const firstInWindow = recentHistory[0];
                    // We need to compare against the value BEFORE the jump window started
                    // Let's find the baseline value just before this window
                    const baselineIndex = history.length - (needed - 1);
                    const baselineValue = baselineIndex >= 0 ? history[baselineIndex - 1] : firstInWindow;

                    // Verify that EVERY sample in recentHistory is >= (baseline + rapidThreshold - jitter)
                    // We use jitter as a small margin of tolerance
                    const thresholdLimit = (baselineValue || firstInWindow) + rapidThreshold - 0.1;
                    const isSustained = recentHistory.every(val => val >= thresholdLimit);

                    if (isSustained) {
                        const totalJump = currentLoss - (baselineValue || firstInWindow);
                        const recentAlarms = global.rapidAlarms?.get(originId) || 0;
                        if (Date.now() - recentAlarms > 3600000) {
                            const msg = `<b>⚡ ALERTA: SALTO RÁPIDO (${needed} muestras sostenidas)</b>\n\n` +
                                `🔗 <b>Enlace:</b> ${name}\n` +
                                `📉 <b>Incremento:</b> <code>+${totalJump.toFixed(2)} dB</code>\n` +
                                `📊 <b>Pérdida Actual:</b> <code>${currentLoss.toFixed(2)} dB</code>\n\n` +
                                `<i>Verificación: Todas las muestras por encima del umbral.</i>`;

                            const buttons = [
                                { text: '📊 Ver Histórico', callback_data: `hist:${originId}` }
                            ];
                            await broadcastTelegramNotification(msg, buttons);

                            if (!global.rapidAlarms) global.rapidAlarms = new Map();
                            global.rapidAlarms.set(originId, Date.now());
                        }
                    } else {
                        console.log(`ℹ️ Jump detected on ${name} but NOT sustained over ${needed} samples. Suppressing alert.`);
                    }
                }
            }
        }

        // CHECK 2: CUMULATIVE DRIFT (12h/24h window)
        const dailyMin = dailyBaselines.get(originId);
        if (dailyMin !== undefined && dailyMin > 0) {
            const driftDiff = currentLoss - dailyMin;

            if (driftDiff >= driftThreshold) {
                const ack = acknowledgedDrifts.get(originId);
                if (ack && Date.now() < ack.expires && currentLoss <= ack.loss + 0.2) return;

                const lastDriftAlert = global.driftAlerts?.get(originId) || 0;
                if (Date.now() - lastDriftAlert > 14400000) {
                    const msg = `<b>📉 ALERTA: DEGRADACIÓN ACUMULADA (${driftWindow}h)</b>\n\n` +
                        `🔗 <b>Enlace:</b> ${name}\n` +
                        `🔴 <b>Deriva Total:</b> <code>+${driftDiff.toFixed(2)} dB</code> vs Mínimo.\n` +
                        `📊 <b>Pérdida Actual:</b> <code>${currentLoss.toFixed(2)} dB</code>\n\n` +
                        `<i>Tendencia lenta. ¿Aceptar nivel por 24h?</i>`;

                    const buttons = [
                        { text: '✅ Aceptar', callback_data: `ack_drift:${originId}:${currentLoss.toFixed(2)}` },
                        { text: '📊 Ver Histórico', callback_data: `hist:${originId}` }
                    ];

                    await broadcastTelegramNotification(msg, buttons);
                    if (!global.driftAlerts) global.driftAlerts = new Map();
                    global.driftAlerts.set(originId, Date.now());
                }
            }
        }

        // Update history cache (keep last 3 samples)
        history.push(currentLoss);
        if (history.length > 5) history.shift();
        lastValues.set(cacheKey, history);
    });
}

module.exports = { startNmsWorker };
