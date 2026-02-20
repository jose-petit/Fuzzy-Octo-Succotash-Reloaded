const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { getBusData, getEnlaces, loadEnlacesFromDB, loadBusDataFromDB } = require('../state');
const { isAmplifier, getCardPrefix, makePivot, getVal } = require('../logic/lossCalculation');

function getTrendArrow(current, previous) {
    if (previous === undefined || previous === null) return '→';
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return '→';
    return diff > 0 ? '↑ (+dB)' : '↓ (-dB)';
}

// Ensure spans table with proper schema exists
async function initSpansTable() {
    try {
        await pool.query(
            `CREATE TABLE IF NOT EXISTS spans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          serial1 VARCHAR(255),
          serial2 VARCHAR(255),
          name1 VARCHAR(255),
          name2 VARCHAR(255),
          raman1 DOUBLE,
          raman2 DOUBLE,
          umbral DOUBLE,
          perdida DOUBLE,
          raman_offset1 DOUBLE,
          hoa_rx_gain1 DOUBLE,
          edfa_gain1 DOUBLE,
          raman_offset2 DOUBLE,
          hoa_rx_gain2 DOUBLE,
          edfa_gain2 DOUBLE,
          is_single BOOLEAN DEFAULT 0,
          line_initial1 DOUBLE,
          loss_reference DOUBLE,
          diff_line1 DOUBLE,
          diff_loss DOUBLE,
          fecha_lote DATETIME,
          details JSON
        )`
        );

        // Schema migration: Add missing columns if table already existed
        const [cols] = await pool.query('SHOW COLUMNS FROM spans');
        const existingCols = new Set(cols.map((c) => c.Field));
        const newCols = [
            ['raman_offset1', 'DOUBLE'],
            ['hoa_rx_gain1', 'DOUBLE'],
            ['edfa_gain1', 'DOUBLE'],
            ['raman_offset2', 'DOUBLE'],
            ['hoa_rx_gain2', 'DOUBLE'],
            ['edfa_gain2', 'DOUBLE'],
            ['is_single', 'BOOLEAN DEFAULT 0'],
            ['line_initial1', 'DOUBLE'],
            ['loss_reference', 'DOUBLE'],
            ['diff_line1', 'DOUBLE'],
            ['diff_loss', 'DOUBLE'],
        ];

        for (const [col, type] of newCols) {
            if (!existingCols.has(col)) {
                console.log(`🚀 Migrating table: Adding column ${col} to spans`);
                try {
                    await pool.query(`ALTER TABLE spans ADD COLUMN ${col} ${type}`);
                } catch (err) {
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.warn(`⚠️ Column ${col} already exists, skipping.`);
                    } else {
                        throw err;
                    }
                }
            }
        }

        // Create index on fecha_lote if it doesn't exist
        const [idxRows] = await pool.query(
            `SELECT COUNT(1) as cnt
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE table_schema = DATABASE()
            AND table_name = 'spans'
            AND index_name = 'idx_spans_fecha_lote'`
        );
        if (!idxRows[0] || Number(idxRows[0].cnt) === 0) {
            await pool.query('CREATE INDEX idx_spans_fecha_lote ON spans (fecha_lote)');
            console.log('✅ Created index idx_spans_fecha_lote');
        }
    } catch (err) {
        console.error('❌ Error recreating spans table:', err);
        throw err;
    }
}

// GET persisted spans from database
router.get('/', async (req, res) => {
    try {
        const { desde, hasta, limit = 1500 } = req.query;

        let sql = 'SELECT * FROM spans';
        const params = [];

        if (desde || hasta) {
            sql += ' WHERE 1=1';
            if (desde) {
                sql += ' AND fecha_lote >= ?';
                params.push(desde);
            }
            if (hasta) {
                sql += ' AND fecha_lote <= ?';
                params.push(hasta);
            }
        }

        sql += ' ORDER BY fecha_lote DESC, id DESC';
        if (limit) {
            sql += ' LIMIT ?';
            params.push(Number(limit));
        }

        const [rows] = await pool.query(sql, params);
        const spans = rows.map((r) => {
            const det = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
            return {
                id: r.id,
                serial1: r.serial1,
                serial2: r.serial2,
                name1: r.name1,
                name2: r.name2,
                raman1: r.raman1,
                raman2: r.raman2,
                umbral: r.umbral,
                perdida: r.perdida,
                raman_offset1: r.raman_offset1,
                hoa_rx_gain1: r.hoa_rx_gain1,
                edfa_gain1: r.edfa_gain1,
                raman_offset2: r.raman_offset2,
                hoa_rx_gain2: r.hoa_rx_gain2,
                edfa_gain2: r.edfa_gain2,
                is_single: r.is_single,
                line_initial1: r.line_initial1,
                loss_reference: r.loss_reference,
                diff_line1: r.diff_line1,
                diff_loss: r.diff_loss,
                fecha_lote: r.fecha_lote || null,
                details: det,
            };
        });
        res.json({ spans });
    } catch (err) {
        console.error('Error fetching spans:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

// GET spans in real-time (WITHOUT persisting to DB)
router.get('/live', async (req, res) => {
    try {
        const enlaces = getEnlaces();
        const busData = getBusData();
        const pivots = makePivot(busData);

        const liveSpans = enlaces.map((en) => {
            const origin = pivots.find((p) => String(p.serial) === String(en.enlace1));
            if (!origin || !isAmplifier(origin.card)) return null;

            const targets = pivots.filter((p) => String(p.serial) === String(en.enlace2));
            const ampTargets = targets.filter((t) => isAmplifier(t.card));
            if (!ampTargets.length && !en.isSingle) return null;

            const originPrefix = getCardPrefix(origin.card);
            const opposite = originPrefix === 'EOA2' ? 'HOA2' : originPrefix === 'HOA2' ? 'EOA2' : null;
            const target = en.isSingle ? null : ((opposite && ampTargets.find((c) => getCardPrefix(c.card) === opposite)) || ampTargets[0]);

            const outLineA = getVal(origin, 'OUT Line Power');
            const inLineB = en.isSingle ? 0 : getVal(target, 'IN Line Power');
            const spanLoss = !en.isSingle && target ? outLineA - inLineB : 0;
            const raman1 = Number(en.raman1 || 0);
            const perdida = en.isSingle ? 0 : Math.max(0, spanLoss - raman1);

            return {
                serial1: en.enlace1,
                name1: en.name1,
                name2: en.isSingle ? 'STANDALONE' : en.name2,
                perdida: Number(perdida.toFixed(2)),
                umbral: Number(en.umbral || 0),
                loss_reference: Number(en.loss_reference || 0),
                line_initial1: Number(en.line_initial1 || 0),
                fecha_lote: 'LIVE',
            };
        }).filter(Boolean);

        res.json({ spans: liveSpans });
    } catch (err) {
        console.error('Error in /api/spans/live:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

// DELETE spans by fecha_lote
router.delete('/by-fecha', async (req, res) => {
    try {
        const { fechaKey } = req.query;
        if (!fechaKey || typeof fechaKey !== 'string') {
            return res
                .status(400)
                .json({ status: 'error', error: 'fechaKey requerido (YYYY-MM-DD HH:mm)' });
        }
        const like = `${fechaKey}%`;
        const [result] = await pool.query('DELETE FROM spans WHERE fecha_lote LIKE ?', [like]);
        res.json({ status: 'ok', deleted: result.affectedRows || 0 });
    } catch (err) {
        console.error('Error deleting spans by fecha:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

// DELETE multiple batches
router.delete('/by-fechas', async (req, res) => {
    try {
        const fechaKeys = Array.isArray(req.body?.fechaKeys) ? req.body.fechaKeys.filter(Boolean) : [];
        if (!fechaKeys.length) {
            return res
                .status(400)
                .json({
                    status: 'error',
                    error: 'fechaKeys requerido (array de strings YYYY-MM-DD HH:mm)',
                });
        }
        const likes = fechaKeys.map((k) => `${k}%`);
        const where = fechaKeys.map(() => 'fecha_lote LIKE ?').join(' OR ');
        const sql = `DELETE FROM spans WHERE ${where}`;
        const [result] = await pool.query(sql, likes);
        res.json({ status: 'ok', deleted: result.affectedRows || 0, lotes: fechaKeys.length });
    } catch (err) {
        console.error('Error deleting spans by fechas:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

// Normalization Route (Cascades master changes to history)
router.post('/normalize', async (req, res) => {
    const { serial1, field, newValue } = req.body;
    if (!serial1 || !field || newValue === undefined) {
        return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
    }

    const numericVal = Number(newValue);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Update master configuration in data_firebase
        const [configRows] = await pool.query('SELECT firebase_id, data FROM data_firebase');
        let targetFirebaseId = null;
        let updatedData = null;

        for (const row of configRows) {
            const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            if (String(data.enlace1) === String(serial1)) {
                targetFirebaseId = row.firebase_id;
                data[field] = numericVal;
                updatedData = data;
                break;
            }
        }

        if (targetFirebaseId && updatedData) {
            await conn.query('UPDATE data_firebase SET data = ? WHERE firebase_id = ?', [JSON.stringify(updatedData), targetFirebaseId]);
        }

        // 2. Cascade Update to history
        if (field === 'line_initial1') {
            await conn.query(
                `UPDATE spans SET line_initial1 = ?, diff_line1 = ROUND(? - CAST(JSON_UNQUOTE(JSON_EXTRACT(details, '$.components.inLineA')) AS DOUBLE), 2) WHERE serial1 = ?`,
                [numericVal, numericVal, serial1]
            );
        } else if (field === 'loss_reference') {
            await conn.query(`UPDATE spans SET loss_reference = ?, diff_loss = ROUND(perdida - ?, 2) WHERE serial1 = ?`, [numericVal, numericVal, serial1]);
        }

        await conn.commit();
        await loadEnlacesFromDB(); // Sync in-memory state
        res.json({ status: 'ok', message: 'Normalización completada' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ status: 'error', error: err.toString() });
    } finally {
        conn.release();
    }
});

// Calibrate All: Set current perdida as the new baseline (loss_reference) for all links
router.post('/calibrate-all', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Get current live data
        const enlaces = getEnlaces();
        const busData = getBusData();
        const pivots = makePivot(busData);

        const [configRows] = await conn.query('SELECT firebase_id, data FROM data_firebase');
        let updatedCount = 0;

        for (const row of configRows) {
            const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            const originStr = String(data.enlace1);

            // Calculate current live loss for this specific enlace
            const origin = pivots.find((p) => String(p.serial) === originStr);
            if (!origin || !isAmplifier(origin.card)) continue;

            const targets = pivots.filter((p) => String(p.serial) === String(data.enlace2));
            const ampTargets = targets.filter((t) => isAmplifier(t.card));

            const originPrefix = getCardPrefix(origin.card);
            const opposite = originPrefix === 'EOA2' ? 'HOA2' : originPrefix === 'HOA2' ? 'EOA2' : null;
            const target = data.isSingle ? null : ((opposite && ampTargets.find((c) => getCardPrefix(c.card) === opposite)) || ampTargets[0]);

            const outLineA = getVal(origin, 'OUT Line Power');
            const inLineB = data.isSingle ? 0 : (target ? getVal(target, 'IN Line Power') : 0);
            const spanLoss = !data.isSingle && target ? outLineA - inLineB : 0;
            const raman1 = Number(data.raman1 || 0);
            const currentLoss = data.isSingle ? 0 : Math.max(0, spanLoss - raman1);

            // Update baseline
            data.loss_reference = Number(currentLoss.toFixed(2));
            await conn.query('UPDATE data_firebase SET data = ? WHERE firebase_id = ?', [JSON.stringify(data), row.firebase_id]);
            updatedCount++;
        }

        // 2. Clear all active alarms as the baseline has changed
        await conn.query('DELETE FROM active_alarms');

        await conn.commit();
        await loadEnlacesFromDB(); // Sync memory
        res.json({ status: 'ok', message: `Calibración masiva completada: ${updatedCount} enlaces actualizados.` });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error in calibrate-all:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    } finally {
        if (conn) conn.release();
    }
});

// Internal persistence logic (shared between API and Background Worker)
async function persistSpansInternal(payloadEnlaces = []) {
    await loadEnlacesFromDB();
    await loadBusDataFromDB();

    const enlaces = payloadEnlaces.length > 0 ? payloadEnlaces : getEnlaces();
    const busData = getBusData();
    const pivots = makePivot(busData);

    const validEnlaces = enlaces.filter((e) => e.enlace1 != null && e.enlace2 != null);

    const spansToPersist = [];
    const unmatched = [];

    validEnlaces.forEach((en) => {
        const origin = pivots.find((p) => String(p.serial) === String(en.enlace1));
        if (!origin || !isAmplifier(origin.card)) {
            unmatched.push({ enlace: en, reason: origin ? 'originNotAmplifier' : 'originNotFound' });
            return;
        }

        const targets = pivots.filter((p) => String(p.serial) === String(en.enlace2));
        const ampTargets = targets.filter((t) => isAmplifier(t.card));
        if (!ampTargets.length && !en.isSingle) {
            unmatched.push({ enlace: en, reason: 'noAmplifierTargets' });
            return;
        }

        const originPrefix = getCardPrefix(origin.card);
        const opposite = originPrefix === 'EOA2' ? 'HOA2' : originPrefix === 'HOA2' ? 'EOA2' : null;
        const target = en.isSingle ? null : ((opposite && ampTargets.find((c) => getCardPrefix(c.card) === opposite)) || ampTargets[0]);

        const inLineA = getVal(origin, 'IN Line Power');
        const inDataA = getVal(origin, 'IN Data Power');
        const outDataA = getVal(origin, 'OUT Data Power');
        const outLineA = getVal(origin, 'OUT Line Power');

        // HARDENING: Skip if critical telemetry is missing
        if (inLineA === null || outLineA === null) {
            unmatched.push({ enlace: en, reason: 'incompleteTelemetry' });
            return;
        }

        const g1_a = Number((outDataA - inLineA).toFixed(2));
        const g2_a = Number((outLineA - inDataA).toFixed(2));

        let r_offset2 = 0, hoa_rx2 = 0, edfa2 = 0;
        let inLineB = 0;

        if (!en.isSingle && target) {
            inLineB = getVal(target, 'IN Line Power');
            const inDataB = getVal(target, 'IN Data Power');
            const outDataB = getVal(target, 'OUT Data Power');
            const outLineB = getVal(target, 'OUT Line Power');

            // Skip if target telemetry is missing
            if (inLineB === null || outLineB === null) {
                unmatched.push({ enlace: en, reason: 'incompleteTargetTelemetry' });
                return;
            }

            r_offset2 = Number((outDataB - inLineB).toFixed(2));
            hoa_rx2 = r_offset2;
            edfa2 = Number((outLineB - inDataB).toFixed(2));
        }

        const spanLoss = !en.isSingle && target ? outLineA - inLineB : 0;
        const raman1 = Number(en.raman1 || 0);
        const perdida = en.isSingle ? 0 : Math.max(0, spanLoss - raman1);

        // EXTRA HARDENING: If loss is suspiciously low/0 on a multi-span link, skip it
        if (!en.isSingle && perdida < 0.1) {
            unmatched.push({ enlace: en, reason: 'suspiciousZeroLoss' });
            return;
        }

        spansToPersist.push({
            serial1: en.enlace1,
            serial2: en.isSingle ? null : en.enlace2,
            name1: en.name1,
            name2: en.isSingle ? 'STANDALONE' : en.name2,
            alias: en.alias,
            raman1: Number(en.raman1 || 0),
            raman2: en.isSingle ? 0 : (Number(en.raman2) || 0),
            umbral: en.umbral,
            perdida: Number(perdida.toFixed(2)),
            raman_offset1: g1_a,
            hoa_rx_gain1: g1_a,
            edfa_gain1: g2_a,
            raman_offset2: r_offset2,
            hoa_rx_gain2: hoa_rx2,
            edfa_gain2: edfa2,
            is_single: en.isSingle ? 1 : 0,
            line_initial1: Number(en.line_initial1 || 0),
            loss_reference: Number(en.loss_reference || 0),
            diff_line1: Number((inLineA - Number(en.line_initial1 || 0)).toFixed(2)), // How much we deviated from install power
            diff_loss: Number((perdida - Number(en.loss_reference || 0)).toFixed(2)), // Degradation in dB
            details: {
                origin,
                target: en.isSingle ? null : target,
                components: { inLineA, inDataA, outDataA, outLineA, inLineB, raman1 },
            },
        });
    });

    if (spansToPersist.length > 0) {
        const formatCaracas = (date) => {
            const partsArr = new Intl.DateTimeFormat('es-VE', {
                timeZone: 'America/Caracas',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            }).formatToParts(date);
            const parts = partsArr.reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
            if (parts.hour === '24') parts.hour = '00';
            return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
        };
        const fechaLoteStr = formatCaracas(new Date());
        const rows = spansToPersist.map((s) => [
            s.serial1, s.serial2, s.name1, s.name2, s.raman1, s.raman2, s.umbral, s.perdida,
            s.raman_offset1, s.hoa_rx_gain1, s.edfa_gain1, s.raman_offset2, s.hoa_rx_gain2, s.edfa_gain2,
            s.is_single, s.line_initial1, s.loss_reference, s.diff_line1, s.diff_loss, fechaLoteStr, JSON.stringify(s.details)
        ]);
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query(
                `INSERT INTO spans (serial1, serial2, name1, name2, raman1, raman2, umbral, perdida, raman_offset1, hoa_rx_gain1, edfa_gain1, raman_offset2, hoa_rx_gain2, edfa_gain2, is_single, line_initial1, loss_reference, diff_line1, diff_loss, fecha_lote, details) VALUES ?`,
                [rows]
            );

            // ⚠️ STATEFUL ALARM SYSTEM: Deduplication and Auto-Clear
            const { sendTelegramNotification, broadcastTelegramNotification } = require('../services/telegramService');
            const { getSettings } = require('../state');
            const config = getSettings();

            const thresholdValue = Number(config.loss_threshold) || 3.0;
            const chatTarget = config.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
            let headerText = config.telegram_header || '🔴 ALERTA DE TRANSPORTE';
            const footerText = config.telegram_footer || 'Equipo de Transporte Óptico - Monitoreo Activo';
            const publicUrl = config.public_url || 'http://localhost:3005';

            // Check Maintenance Mode
            const isMaint = config.maintenance_mode === 'true' && config.maintenance_until && new Date() < new Date(config.maintenance_until);
            if (isMaint) {
                headerText = `🛠️ [MANTENIMIENTO] ${headerText}`;
            }

            const [activeAlarms] = await conn.query('SELECT * FROM active_alarms');
            const activeMap = new Map(activeAlarms.map(a => [a.entity_id, a]));

            // Fetch last known values for trend analysis
            const [lastValues] = await conn.query(
                'SELECT serial1, perdida FROM spans WHERE id IN (SELECT MAX(id) FROM spans GROUP BY serial1)'
            );
            const lastValuesMap = new Map(lastValues.map(lv => [lv.serial1, lv.perdida]));

            for (const s of spansToPersist) {
                const reference = Number(s.loss_reference || 0);
                const limit = reference + thresholdValue;
                const isFaulty = s.perdida > limit && s.perdida > 0;
                const existingAlarm = activeMap.get(s.serial1);

                if (isFaulty) {
                    if (!existingAlarm) {
                        // NEW ALARM: Notify and persist
                        const title = `⚠️ ALARMA CRÍTICA: ${s.name1}`;
                        const message = `Se ha detectado una pérdida de ${s.perdida} dB, superando el umbral de ${thresholdValue} dB sobre la referencia (${reference} dB).`;

                        await conn.query(
                            `INSERT INTO notifications (type, title, message, severity, entity_type, entity_id, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            ['CRITICAL_LOSS', title, message, 'CRITICAL', 'LINK', s.serial1, new Date()]
                        );

                        await conn.query(
                            `INSERT INTO active_alarms (entity_id, type, severity, start_value, current_value, threshold, fecha_inicio) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE current_value = VALUES(current_value), fecha_update = NOW()`,
                            [s.serial1, 'CRITICAL_LOSS', 'CRITICAL', s.perdida, s.perdida, thresholdValue, new Date()]
                        );

                        const prevVal = lastValuesMap.get(s.serial1);
                        const arrow = getTrendArrow(s.perdida, prevVal);

                        const telegramMsg = `<b>${headerText}</b>\n\n` +
                            `<b>Evento:</b> Pérdida Crítica DETECTADA\n` +
                            `<b>Enlace:</b> ${s.alias || s.name1}\n` +
                            `<b>Pérdida:</b> <code>${s.perdida} dB</code> ${arrow}\n` +
                            `<b>Referencia:</b> <code>${reference} dB</code>\n` +
                            `<b>Umbral:</b> <code>+${thresholdValue} dB</code>\n\n` +
                            `<i>${footerText}</i>`;

                        if (!isMaint) {
                            await broadcastTelegramNotification(telegramMsg);
                        } else {
                            console.log(`🛠️ [MANTENIMIENTO] Notificación de Alarma SUPRIMIDA para ${s.name1}`);
                        }
                        // Esto enviará la alerta a TODOS los que tengan el check azul en settings (si no hay mantenimiento)
                    } else {
                        // RECURRING FAULT: Update current value in DB but suppress Telegram
                        await conn.query(
                            `UPDATE active_alarms SET current_value = ?, fecha_update = NOW() WHERE entity_id = ?`,
                            [s.perdida, s.serial1]
                        );
                        console.log(`⏳ Alarma persistente para ${s.name1} (${s.perdida} dB). Notificación suprimida.`);
                    }
                } else if (!isFaulty && existingAlarm) {
                    // RECOVERY: Fault cleared!
                    await conn.query('DELETE FROM active_alarms WHERE entity_id = ?', [s.serial1]);

                    const title = `✅ RECUPERACIÓN: ${s.name1}`;
                    const message = `El enlace se ha restablecido. Pérdida actual: ${s.perdida} dB (dentro del umbral de ${thresholdValue} dB).`;

                    await conn.query(
                        `INSERT INTO notifications (type, title, message, severity, entity_type, entity_id, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        ['LINK_RECOVERY', title, message, 'INFO', 'LINK', s.serial1, new Date()]
                    );

                    let recHeader = '🟢 RESTABLECIMIENTO DE RED';
                    const prevVal = lastValuesMap.get(s.serial1);
                    const arrow = getTrendArrow(s.perdida, prevVal);

                    const telegramMsg = `<b>${recHeader}</b>\n\n` +
                        `<b>Evento:</b> Pérdida Normalizada (CLEAR)\n` +
                        `<b>Enlace:</b> ${s.alias || s.name1}\n` +
                        `<b>Pérdida Actual:</b> <code>${s.perdida} dB</code> ${arrow}\n` +
                        `<b>Estado:</b> Operativo bajo umbral\n\n` +
                        `<i>La alarma ha sido removida del panel de monitoreo activo.</i>`;

                    if (!isMaint) {
                        await broadcastTelegramNotification(telegramMsg);
                    } else {
                        console.log(`🛠️ [MANTENIMIENTO] Notificación de Recuperación SUPRIMIDA para ${s.name1}`);
                    }
                }
            }

            await conn.commit();
        } catch (e) {
            if (conn) await conn.rollback();
            throw e;
        } finally {
            if (conn) conn.release();
        }
    }
    return { spans: spansToPersist, unmatched };
}

// GET spans calculados (Persist)
router.post('/persist', async (req, res) => {
    console.log('--- /api/spans/persist (Modular) called ---');
    try {
        const result = await persistSpansInternal(req.body.enlaces || []);
        res.json({ status: 'ok', count: result.spans.length, spans: result.spans, unmatched: result.unmatched });
    } catch (err) {
        console.error('Error persisting spans:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

/**
 * Purges span history older than 6 months to maintain DB performance.
 */
async function purgeOldSpans() {
    try {
        console.log('🧹 Span Purge: Checking for records older than 2 years...');
        const [result] = await pool.query("DELETE FROM spans WHERE fecha_lote < DATE_SUB(NOW(), INTERVAL 2 YEAR)");
        if (result.affectedRows > 0) {
            console.log(`✅ Span Purge: Removed ${result.affectedRows} historical records.`);
        }
    } catch (err) {
        console.error('❌ Span Purge Error:', err.message);
    }
}

// Enhanced Simulation Engine (Admin validation)
router.post('/simulate', async (req, res) => {
    try {
        const { type = 'critical' } = req.body;
        const { broadcastTelegramNotification } = require('../services/telegramService');
        const { getSettings, loadSettingsFromDB } = require('../state');

        // Force hot-reload of settings from DB to catch recent changes
        await loadSettingsFromDB();

        const config = getSettings();
        const chatTarget = config.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
        const footerText = config.telegram_footer || 'Equipo de Transporte Óptico - Monitoreo Activo';
        let headerText = config.telegram_header || '🔴 ALERTA DE TRANSPORTE';

        let msg = '';
        if (type === 'critical') {
            msg = `<b>🚨 [SIMULACIÓN] ALERTA CRÍTICA</b>\n\n` +
                `<b>Evento:</b> Pérdida Crítica DETECTADA\n` +
                `<b>Enlace:</b> ENLACE PRUEBA ALFA\n` +
                `<b>Pérdida:</b> <code>12.50 dB</code> ↑ (+dB)\n` +
                `<b>Referencia:</b> <code>5.00 dB</code>\n` +
                `<b>Umbral:</b> <code>+3.0 dB</code>\n\n` +
                `<i>${footerText}</i>`;
        } else if (type === 'recovery') {
            msg = `<b>🟢 [SIMULACIÓN] RECUPERACIÓN</b>\n\n` +
                `<b>Evento:</b> Pérdida Normalizada (CLEAR)\n` +
                `<b>Enlace:</b> ENLACE PRUEBA ALFA\n` +
                `<b>Pérdida Actual:</b> <code>4.80 dB</code> ↓ (-dB)\n` +
                `<b>Estado:</b> Operativo bajo umbral\n\n` +
                `<i>La alerta ha sido removida del panel de monitoreo.</i>`;
        } else if (type === 'maintenance') {
            msg = `<b>🛠️ [SIMULACIÓN] MANTENIMIENTO</b>\n\n` +
                `<b>${headerText}</b>\n` +
                `<b>Nota:</b> Ventana de mantenimiento activa.\n` +
                `<b>Enlace:</b> NODO TRONCAL X\n` +
                `<b>Estado:</b> Degradación controlada\n\n` +
                `<i>Avisar a NOC que es una prueba de configuración.</i>`;
        } else if (type === 'report') {
            msg = `<b>📊 [SIMULACIÓN] REPORTE DE CRITICIDAD</b>\n\n` +
                `<b>Periodo:</b> Últimos 7 días\n` +
                `<b>Top Enlaces Afectados:</b>\n` +
                `1. Caracas-Valencia (Avg: 3.5dB)\n` +
                `2. Maracay-Coro (Avg: 3.1dB)\n\n` +
                `<b>Recomendación:</b> Revisar empalmes en tramo 1.\n\n` +
                `<i>${footerText}</i>`;
        }

        await broadcastTelegramNotification(msg);
        res.json({ status: 'ok', message: `Simulación ${type} enviada` });
    } catch (err) {
        console.error('Simulation error:', err);
        res.status(500).json({ status: 'error', error: err.toString() });
    }
});

module.exports = { router, initSpansTable, persistSpansInternal, purgeOldSpans };
