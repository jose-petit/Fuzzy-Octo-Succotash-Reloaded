const axios = require('axios');
const { getPivots, getEnlaces, getWorkerStatus } = require('../state');
const { sendTelegramNotification } = require('./telegramService');
const { pool } = require('../config/db');
const { poolSpan } = require('../config/db_span');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let lastUpdateId = 0;

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function handleLiberarCommand(chatId, args) {
    if (!args.length) {
        await sendTelegramNotification('⚠️ Indica el serial o alias para liberar la inhibición.\nEj: <code>/liberar 410</code>', chatId);
        return;
    }

    const input = args.join(' ').toLowerCase();
    const { getEnlaces, loadInhibitionsFromDB } = require('../state');
    const enlaces = getEnlaces();

    const target = enlaces.find(e =>
        String(e.enlace1 || e.enlace) === String(input) ||
        (e.alias && e.alias.toLowerCase().includes(input)) ||
        (e.name1 && e.name1.toLowerCase().includes(input))
    );

    const serial = target ? (target.enlace1 || target.enlace) : input;

    try {
        const [res] = await pool.query('DELETE FROM link_inhibitions WHERE serial1 = ?', [serial]);
        if (res.affectedRows > 0) {
            await loadInhibitionsFromDB();
            await sendTelegramNotification(`✅ Enlace <code>${serial}</code> liberado. Se ha reactivado el monitoreo proactivo.`, chatId);
        } else {
            await sendTelegramNotification(`⚠️ No se encontró una inhibición activa para <code>${serial}</code>.`, chatId);
        }
    } catch (e) {
        console.error('Error liberating link:', e.message);
        await sendTelegramNotification('❌ Error al intentar liberar el enlace.', chatId);
    }
}

async function startTelegramBot() {
    if (!BOT_TOKEN) {
        console.warn('⚠️ Telegram Command Service: BOT_TOKEN not configured. Bot disabled.');
        return;
    }

    console.log('🤖 Telegram Command Service: Initialized.');

    // Clear any existing Webhook to prevent conflicts
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    } catch (e) {
        console.warn('⚠️ Could not clear Telegram Webhook:', e.message);
    }

    // Polling function
    const poll = async () => {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, {
                params: {
                    offset: lastUpdateId + 1,
                    timeout: 30
                },
                timeout: 35000 // Slightly longer than server timeout
            });

            const updates = response.data.result;
            if (updates && updates.length > 0) {
                for (const update of updates) {
                    lastUpdateId = update.update_id;
                    const msg = update.message || update.my_chat_member;
                    const callbackQuery = update.callback_query;

                    if (msg && msg.chat) {
                        await registerChatInDB(msg.chat);
                        if (msg.text) {
                            await handleCommand(msg);
                        }
                    } else if (callbackQuery) {
                        await handleCallbackQuery(callbackQuery);
                    }
                }
            }
        } catch (err) {
            // Only log serious errors, ignore timeouts which are normal in long-polling
            if (err.code !== 'ECONNABORTED' && !err.message.includes('timeout')) {
                console.error('❌ Telegram Polling Error:', err.message);
            }
        } finally {
            // Schedule next poll only AFTER the current one is done
            setTimeout(poll, 1000);
        }
    };

    // Start the first poll
    poll();
}

async function handleCommand(msg) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const command = text.split(' ')[0].toLowerCase();
    const args = text.split(' ').slice(1);

    console.log(`📩 Command received from ${chatId}: ${text}`);

    const { isAuthorized } = require('../state');

    if (command !== '/start' && !isAuthorized(chatId)) {
        await sendTelegramNotification('🚫 <b>Acceso Restringido</b>\n\nTu ID de chat (<code>' + chatId + '</code>) no está autorizado para realizar consultas.\n\nSolicita acceso al administrador del sistema.', chatId);
        return;
    }

    switch (command) {
        case '/start':
        case '/help':
            const welcome = `<b>🤖 Padtec Monitoring Bot EX</b>\n\n` +
                `<b>Comandos de Diagnóstico:</b>\n` +
                `/resumen - 📊 Salud global de la red\n` +
                `/live - ⚠️ Alertas de degradación activas\n` +
                `/enlace [nombre/serial] - 📡 Detalle técnico (Lado A/B + Amplis)\n` +
                `/span [nombre] - 📡 Consultar niveles Cisco Span Processor\n` +
                `/historico [nombre/serial] - 📈 Gráfica 24h (dBm y Tiempo)\n\n` +
                `<b>Comandos de Inventario:</b>\n` +
                `/buscar [nombre] - 🔍 Encontrar equipos por nombre/alias\n` +
                `/nodos [filtro] - 🏢 Ver equipos por NE (Sitio)\n` +
                `/equipos [serial] - 📦 Detalle de stock de una tarjeta específica\n\n` +
                `<b>Comandos de Sistema:</b>\n` +
                `/top [temp] - 🔥 Top equipos por calor\n` +
                `/status - ⚙️ Estado de los servicios\n` +
                `/maint - 🛠️ Consultar mantenimiento\n\n` +
                `<i>Desarrollado para el equipo de Transporte Óptico.</i>`;
            await sendTelegramNotification(welcome, chatId);
            break;

        case '/resumen':
            await handleResumenCommand(chatId);
            break;

        case '/live':
            await handleLiveCommand(chatId);
            break;

        case '/buscar':
            await handleBuscarCommand(chatId, args);
            break;

        case '/status':
            await handleStatusCommand(chatId);
            break;

        case '/maint':
            const { getSettings } = require('../state');
            const config = getSettings();
            const isMaint = config.maintenance_mode === 'true' && config.maintenance_until && new Date() < new Date(config.maintenance_until);
            let maintMsg = `<b>🛠️ Monitor de Mantenimiento</b>\n\n` +
                `<b>Estado Global:</b> ${isMaint ? '🔴 SUPRESIÓN ACTIVA' : '🟢 MONITOREO NORMAL'}\n`;
            if (isMaint) {
                maintMsg += `<b>Vence:</b> <code>${new Date(config.maintenance_until).toLocaleString()}</code>\n`;
            }
            await sendTelegramNotification(maintMsg, chatId);
            await handleMaintCommand(chatId);
            break;

        case '/enlace':
            await handleEnlaceCommand(chatId, args);
            break;

        case '/span':
        case '/last':
            await handleSpanCommand(chatId, args);
            break;

        case '/historico':
            await handleHistoricoCommand(chatId, args);
            break;

        case '/nodos':
            await handleNodosCommand(chatId, args);
            break;

        case '/equipos':
            return handleEquiposCommand(chatId, args);
        case '/liberar':
            return handleLiberarCommand(chatId, args);

        case '/top':
            await handleTopCommand(chatId, args);
            break;

        default:
            break;
    }
}

async function handleCallbackQuery(callback) {
    const chatId = callback.message.chat.id;
    const data = callback.data;
    const { isAuthorized } = require('../state');

    if (!isAuthorized(chatId)) {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: callback.id,
            text: '🚫 No tienes permisos para realizar esta acción.',
            show_alert: true
        });
        return;
    }

    // Acknowledge the callback immediately
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: callback.id
        });
    } catch (e) { }

    if (data.startsWith('site:')) {
        const siteName = data.replace('site:', '');
        await handleNodosCommand(chatId, [siteName]);
    } else if (data.startsWith('hist:')) {
        const serial = data.replace('hist:', '');
        await handleHistoricoCommand(chatId, [serial]);
    } else if (data.startsWith('enl:')) { // New handler for link selection
        const serial = data.replace('enl:', '');
        await handleEnlaceCommand(chatId, [serial]);
    } else if (data.startsWith('ack_drift:')) { // New handler for silencing alerts
        const parts = data.split(':');
        const serial = parts[1];
        const level = parseFloat(parts[2]);

        const { setAckDrift } = require('../state');
        setAckDrift(serial, level);

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: callback.id,
            text: `✅ Atenuación aceptada para este enlace. Silenciado por 24h.`,
            show_alert: true
        });

        // Update the original message to show it was accepted
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            chat_id: chatId,
            message_id: callback.message.message_id,
            text: `${callback.message.text}\n\n✅ <b>ACEPTADO:</b> El equipo ha reconocido este evento a un nivel de <code>${level} dB</code>.`,
            parse_mode: 'HTML'
        });
    }
}

async function handleLiveCommand(chatId) {
    const enlaces = getEnlaces();
    const pivots = getPivots();
    const { isAmplifier, getCardPrefix, getVal } = require('../logic/lossCalculation');

    const liveDegradations = enlaces.map(en => {
        const origin = pivots.find(p => String(p.serial) === String(en.enlace1 || en.enlace));
        if (!origin || !isAmplifier(origin.card)) return null;

        const targets = pivots.filter(p => String(p.serial) === String(en.enlace2));
        const ampTargets = targets.filter(t => isAmplifier(t.card));
        const originPrefix = getCardPrefix(origin.card);
        const opposite = originPrefix === 'EOA2' ? 'HOA2' : (originPrefix === 'HOA2' ? 'EOA2' : null);
        const target = en.isSingle ? null : ((opposite && ampTargets.find(c => getCardPrefix(c.card) === opposite)) || ampTargets[0]);

        if (!en.isSingle && !target) return null;

        const outLineA = getVal(origin, 'OUT Line Power');
        const inLineB = en.isSingle ? 0 : getVal(target, 'IN Line Power');
        const spanLoss = !en.isSingle && target ? outLineA - inLineB : 0;
        const raman1 = Number(en.raman1 || 0);
        const perdida = en.isSingle ? 0 : Math.max(0, spanLoss - raman1);
        const diff = perdida - (Number(en.loss_reference) || 0);

        return { name: en.alias || en.name1, perdida, diff, reference: en.loss_reference };
    }).filter(Boolean);

    const issues = liveDegradations.filter(d => d.diff > 0.5).sort((a, b) => b.diff - a.diff);

    let msg = `<b>⚠️ Degradaciones en Vivo</b>\n\n`;
    if (issues.length === 0) {
        msg += `✅ Red estable. Todos los enlaces operando normal.\n`;
    } else {
        issues.slice(0, 10).forEach(i => {
            msg += `• ${i.name}: <code>${i.perdida.toFixed(2)} dB</code> (+${i.diff.toFixed(2)}dB)\n`;
        });
    }
    await sendTelegramNotification(msg, chatId);
}

async function handleStatusCommand(chatId) {
    const status = getWorkerStatus();
    const pivots = getPivots();
    const msg = `<b>⚙️ Estado del NMS Monitoring</b>\n\n` +
        `<b>Worker:</b> ${status.status === 'ok' ? '✅ Online' : '❌ Error'}\n` +
        `<b>Último poll:</b> <code>${status.last_run ? new Date(status.last_run).toLocaleTimeString() : 'Nunca'}</code>\n` +
        `<b>Tarjetas:</b> ${pivots.length}\n`;
    await sendTelegramNotification(msg, chatId);
}



const renderCard = (card, label = '') => {
    const { getVal, isAmplifier } = require('../logic/lossCalculation');
    if (!card) return `⚠️ <b>${label}:</b> No detectado (Offline).\n`;

    // Check multiple temperature labels
    const temp = getVal(card, 'Board Temperature') || getVal(card, 'Temperature') || getVal(card, 'Fan temperature');
    const cardModel = card.card || 'Desconocido';
    const siteName = card.ne || 'Desconocido';

    let cMsg = `<b>${label || escapeHTML(siteName)}</b>` + (cardModel ? ` (<i>${escapeHTML(cardModel)}</i>)` : '') + `\n` +
        `S/N: <code>${card.serial || '---'}</code>\n` +
        `🌡️ Temp: <code>${temp ? temp.toFixed(1) + '°C' : '--'}</code>\n`;

    const inLine = getVal(card, 'IN Line Power');
    const outLine = getVal(card, 'OUT Line Power');

    if (isAmplifier(cardModel) || inLine !== 0 || outLine !== 0) {
        const inData = getVal(card, 'IN Data Power');
        const outData = getVal(card, 'OUT Data Power');

        cMsg += `\n<b>📊 Nivel de Potencia:</b>\n` +
            `🔹 <b>TX Line:</b> <code>${outLine > -50 ? outLine.toFixed(2) : '--'} dBm</code>\n` +
            `🔸 <b>RX Line:</b> <code>${inLine > -50 ? inLine.toFixed(2) : '--'} dBm</code>\n`;

        if (inData !== 0 || outData !== 0) {
            cMsg += `🔹 <b>TX Data:</b> <code>${outData.toFixed(2)} dBm</code>\n` +
                `🔸 <b>RX Data:</b> <code>${inData.toFixed(2)} dBm</code>\n`;
        }
    } else {
        const fan1 = getVal(card, 'FAN 1 Speed') || getVal(card, 'Fan 1 Speed');
        if (fan1 > 0) cMsg += `🌀 <b>Ventilación:</b> <code>${fan1.toFixed(0)} RPM</code>\n`;
    }

    return cMsg;
};

async function handleEnlaceCommand(chatId, args) {
    if (args.length === 0) {
        await sendTelegramNotification('❌ Uso: <code>/enlace [serial o nombre]</code>', chatId);
        return;
    }

    const input = args.join(' ').replace(/[\[\]]/g, '').trim().toLowerCase();
    const pivots = getPivots();
    const enlaces = getEnlaces();
    const { getVal, isAmplifier } = require('../logic/lossCalculation');

    let targetLink = null;
    let targetCard = pivots.find(p => String(p.serial).toLowerCase() === input);

    if (targetCard) {
        targetLink = enlaces.find(en => String(en.enlace1 || en.enlace) === String(targetCard.serial) || String(en.enlace2) === String(targetCard.serial));
    } else {
        const matches = enlaces.filter(en =>
            (en.alias && en.alias.toLowerCase().includes(input)) ||
            (en.alias1 && en.alias1.toLowerCase().includes(input)) ||
            (en.alias2 && en.alias2.toLowerCase().includes(input))
        );

        if (matches.length > 1) {
            const buttons = matches.slice(0, 10).map(m => ([{ text: `📡 ${m.alias}`, callback_data: `enl:${m.enlace1 || m.enlace}` }]));
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>🔍 Múltiples resultados para "${escapeHTML(input)}":</b>\nSelecciona el enlace correcto:`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons }
            });
            return;
        } else if (matches.length === 1) {
            targetLink = matches[0];
            const sId = targetLink.enlace1 || targetLink.enlace;
            targetCard = pivots.find(p => String(p.serial) === String(sId));
        }
    }

    if (!targetCard && !targetLink) {
        await sendTelegramNotification(`❌ No se encontró nada para "<b>${escapeHTML(input)}</b>".`, chatId);
        return;
    }

    let headerName = targetLink ? targetLink.alias : (targetCard ? targetCard.ne : 'Desconocido');
    let msg = `<b>📡 Detalle: ${escapeHTML(headerName)}</b>\n\n`;
    let currentLoss = 0;

    if (targetLink) {
        const s1 = targetLink.enlace1 || targetLink.enlace;
        const origin = pivots.find(p => String(p.serial) === String(s1));
        const dest = pivots.find(p => String(p.serial) === String(targetLink.enlace2));
        msg += renderCard(origin, `LADO A: ${targetLink.alias1 || '---'}`);
        msg += `\n` + renderCard(dest, `LADO B: ${targetLink.alias2 || '---'}`);

        if (origin && dest && isAmplifier(origin.card) && isAmplifier(dest.card)) {
            const outLineA = getVal(origin, 'OUT Line Power');
            const inLineB = getVal(dest, 'IN Line Power');
            currentLoss = Math.max(0, (outLineA - inLineB) - Number(targetLink.raman1 || 0));
            const ref = Number(targetLink.loss_reference || 0);
            const diff = currentLoss - ref;

            msg += `\n<b>📊 MÉTRICAS:</b>\n` +
                `• Atn. Real: <code>${currentLoss.toFixed(2)} dB</code>\n` +
                `• Variación: <code>${diff > 0 ? '+' : ''}${diff.toFixed(2)} dB</code> ${diff > 0.5 ? '⚠️' : '✅'}\n`;
            msg += `\n📈 <code>/historico ${s1}</code> | 🔮 <code>/prediccion ${s1}</code>`;
        }
    } else if (targetCard) {
        msg += renderCard(targetCard);
    }

    await sendTelegramNotification(msg, chatId);
}

async function handleResumenCommand(chatId) {
    const enlaces = getEnlaces();
    const pivots = getPivots();
    const { isAmplifier, getCardPrefix, getVal } = require('../logic/lossCalculation');
    const { getSettings } = require('../state');
    const threshold = Number(getSettings().loss_threshold) || 3.0;

    let critical = 0, warning = 0, ok = 0;
    enlaces.forEach(en => {
        const origin = pivots.find(p => String(p.serial) === String(en.enlace1 || en.enlace));
        if (!origin || !isAmplifier(origin.card)) return;
        const targets = pivots.filter(p => String(p.serial) === String(en.enlace2));
        const target = en.isSingle ? null : targets.find(t => isAmplifier(t.card));
        if (!en.isSingle && !target) return;
        const outA = getVal(origin, 'OUT Line Power'), inB = en.isSingle ? 0 : getVal(target, 'IN Line Power');
        const loss = en.isSingle ? 0 : Math.max(0, (outA - inB) - Number(en.raman1 || 0));
        const diff = loss - (Number(en.loss_reference) || 0);
        if (diff > threshold) critical++; else if (diff > 0.5) warning++; else ok++;
    });

    const total = ok + warning + critical || 1;
    const bar = '🟩'.repeat(Math.round((ok / total) * 10)) + '🟨'.repeat(Math.round((warning / total) * 10)) + '🟥'.repeat(Math.round((critical / total) * 10));
    const msg = `<b>📊 Salud de Enlaces</b>\n<code>${bar.padEnd(10, '⬜')}</code>\n\n✅ Ok: ${ok} | ⚠️ Deg: ${warning} | 🔥 Alarma: ${critical}\n<i>Total: ${total}</i>`;
    await sendTelegramNotification(msg, chatId);
}

async function handleBuscarCommand(chatId, args) {
    if (!args.length) return sendTelegramNotification('🔍 Indica nombre: <code>/buscar [texto]</code>', chatId);
    const term = args.join(' ').toLowerCase();
    const results = getEnlaces().filter(en => (en.name1 || '').toLowerCase().includes(term) || (en.alias || '').toLowerCase().includes(term)).slice(0, 10);
    if (!results.length) return sendTelegramNotification(`❌ Sin resultados para "<b>${term}</b>".`, chatId);
    let msg = `<b>🔍 Resultados:</b>\n\n`;
    results.forEach(res => msg += `📍 <code>${res.enlace1 || res.enlace}</code> - ${res.alias || res.name1}\n`);
    await sendTelegramNotification(msg, chatId);
}

async function handleEquiposCommand(chatId, args) {
    const pivots = getPivots();
    if (args.length) {
        const term = args[0].toLowerCase();
        const found = pivots.filter(p => String(p.serial).toLowerCase().includes(term));
        if (!found.length) return sendTelegramNotification(`❌ No se encontró serial: "<b>${term}</b>".`, chatId);
        let msg = `<b>📦 Detalle de Tarjeta:</b>\n\n`;
        found.slice(0, 3).forEach(p => msg += `🏢 <b>Sitio:</b> ${escapeHTML(p.ne)}\n🃏 <b>Modelo:</b> ${escapeHTML(p.card)}\n🔢 <b>Serial:</b> <code>${p.serial}</code>\n──────────────────\n`);
        return sendTelegramNotification(msg, chatId);
    }
    const nodes = [...new Set(pivots.map(p => p.ne).filter(Boolean))];
    await sendTelegramNotification(`<b>📦 Inventario</b>\n\n🌐 <b>Sitios:</b> ${nodes.length}\n🃏 <b>Tarjetas:</b> ${pivots.length}`, chatId);
}

async function handleHistoricoCommand(chatId, args) {
    if (!args.length) return sendTelegramNotification('❌ Uso: <code>/historico [serial o nombre]</code>', chatId);
    const input = args.join(' ').replace(/[\[\]]/g, '').trim().toLowerCase();
    const pivots = getPivots();
    const enlaces = getEnlaces();

    let targetCard = pivots.find(p => String(p.serial).toLowerCase() === input);
    if (!targetCard) {
        const matches = enlaces.filter(en =>
            (en.alias && en.alias.toLowerCase().includes(input)) ||
            (en.alias1 && en.alias1.toLowerCase().includes(input)) ||
            (en.alias2 && en.alias2.toLowerCase().includes(input))
        );
        if (matches.length > 1) {
            const buttons = matches.slice(0, 10).map(m => ([{ text: `📈 Hist: ${m.alias}`, callback_data: `hist:${m.enlace1 || m.enlace}` }]));
            return axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `<b>🔍 Múltiples resultados para "${escapeHTML(input)}":</b>\nSelecciona enlace para ver historial 24h:`,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons }
            });
        } else if (matches.length === 1) {
            const sId = matches[0].enlace1 || matches[0].enlace;
            targetCard = pivots.find(p => String(p.serial) === String(sId));
        }
    }

    const targetLink = enlaces.find(en => String(en.enlace1 || en.enlace) === String(targetCard.serial) || String(en.enlace2) === String(targetCard.serial));
    const displayName = targetLink?.alias || (targetLink ? `${targetLink.name1} - ${targetLink.name2 || '??'}` : targetCard.ne);

    try {
        const [stats] = await pool.query(`SELECT MIN(perdida) as min_loss, MAX(perdida) as max_loss, AVG(perdida) as avg_loss, COUNT(*) as samples FROM spans WHERE serial1 = ? AND fecha_lote > DATE_SUB(NOW(), INTERVAL 24 HOUR)`, [targetCard.serial]);
        if (!stats[0] || stats[0].samples < 3) return sendTelegramNotification(`❌ Datos insuficientes para <b>${escapeHTML(displayName)}</b> (Muestras: ${stats[0]?.samples || 0}). Espera al próximo ciclo de escaneo.`, chatId);

        const [rows] = await pool.query(`SELECT perdida, DATE_FORMAT(fecha_lote, '%H:%i') as time FROM spans WHERE serial1 = ? AND fecha_lote > DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY fecha_lote ASC`, [targetCard.serial]);

        // Filter labels
        const totalRows = rows.length;
        const labelStep = Math.max(1, Math.floor(totalRows / 8));
        const labels = rows.map((r, i) => (i % labelStep === 0) ? r.time : '');

        const chartConfig = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pérdida (dBm)',
                    data: rows.map(r => r.perdida.toFixed(2)),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true, pointRadius: 0, borderWidth: 3, lineTension: 0.3
                }]
            },
            options: {
                title: { display: true, text: `Historial 24h: ${displayName}`, fontSize: 18 },
                scales: {
                    yAxes: [{
                        ticks: { beginAtZero: false, fontSize: 10 },
                        scaleLabel: { display: true, labelString: 'Pérdida (dBm)', fontSize: 14, fontStyle: 'bold' }
                    }],
                    xAxes: [{
                        ticks: { fontSize: 10 },
                        scaleLabel: { display: true, labelString: 'Tiempo (HH:mm)', fontSize: 14, fontStyle: 'bold' }
                    }]
                }
            }
        };
        const chartUrl = `https://quickchart.io/chart?w=600&h=350&c=${encodeURIComponent(JSON.stringify(chartConfig))}&bkg=white`;
        const s = stats[0];
        const msg = `<b>📈 Historial 24h: ${escapeHTML(displayName)}</b>\n\n• Mín: <code>${s.min_loss.toFixed(2)}</code> | Máx: <code>${s.max_loss.toFixed(2)}</code>\n• Prom: <code>${s.avg_loss.toFixed(2)}</code>\n📊 <b>Fluctuación:</b> <code>${(s.max_loss - s.min_loss).toFixed(2)} dB</code>`;
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { chat_id: chatId, photo: chartUrl, caption: msg, parse_mode: 'HTML' });
    } catch (e) {
        console.error(e);
        await sendTelegramNotification('❌ Error al consultar la base de datos histórica.', chatId);
    }
}

async function handleNodosCommand(chatId, args) {
    const pivots = getPivots();
    const filter = args.length ? args.join(' ').toLowerCase() : '';
    const nodes = [...new Set(pivots.map(p => p.ne).filter(Boolean))].filter(n => n.toLowerCase().includes(filter)).sort();

    if (nodes.length === 1 || (args.length && nodes.includes(args.join(' ')))) {
        const ne = nodes.includes(args.join(' ')) ? args.join(' ') : nodes[0];
        let msg = `📍 <b>Inventario: ${escapeHTML(ne)}</b>\n\n`;
        pivots.filter(p => p.ne === ne).forEach(c => msg += `• <code>${c.serial}</code>: ${escapeHTML(c.card)}\n`);
        return axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: chatId, text: msg, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '⬅️ Volver', callback_data: 'site:' }]] } });
    }

    let msg = `<b>🏢 Selecciona un sitio:</b>`;
    const buttons = nodes.slice(0, 15).map(n => ([{ text: `📍 ${n}`, callback_data: `site:${n}` }]));
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: chatId, text: msg, parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
}

async function handleTopCommand(chatId) {
    const pivots = getPivots();
    const { getVal } = require('../logic/lossCalculation');
    const tops = pivots.map(p => ({ ne: p.ne, val: getVal(p, 'Board Temperature') || getVal(p, 'Temperature') || 0, sn: p.serial }))
        .filter(i => i.val > 0).sort((a, b) => b.val - a.val).slice(0, 10);
    let msg = `<b>🔥 Top 10 Puntos Calientes</b>\n\n`;
    tops.forEach((t, i) => msg += `${i + 1}. ${t.val > 60 ? '🔴' : '🟡'} <b>${t.val.toFixed(1)}°C</b> - ${escapeHTML(t.ne)} (<code>${t.sn}</code>)\n`);
    await sendTelegramNotification(msg, chatId);
}

async function handlePrediccionCommand(chatId, args) {
    if (!args.length) return sendTelegramNotification('🔮 Indica serial: <code>/prediccion [serial]</code>', chatId);
    const serial = args[0];
    try {
        const [rows] = await pool.query(`SELECT perdida, UNIX_TIMESTAMP(fecha_lote) as ts FROM spans WHERE serial1 = ? AND fecha_lote > DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY fecha_lote ASC`, [serial]);
        if (rows.length < 10) return sendTelegramNotification('❌ Datos insuficientes para análisis de tendencia.', chatId);

        // Simple Linear Regression
        const n = rows.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        const firstTs = rows[0].ts;
        rows.forEach(r => {
            const x = (r.ts - firstTs) / 3600; // hours
            const y = r.perdida;
            sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
        });
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const currentLoss = rows[n - 1].perdida;

        let msg = `<b>🔮 Predicción de Tendencia:</b>\n\n`;
        if (slope <= 0.001) {
            msg += `✅ <b>Estable:</b> El enlace no muestra degradación progresiva.\n📈 Pendiente: <code>${(slope * 24).toFixed(2)} dB/día</code>`;
        } else {
            const hoursToCrit = (8.0 - currentLoss) / slope;
            msg += `⚠️ <b>Degradación Detectada:</b>\n`;
            msg += `📈 Ritmo: <code>+${(slope * 24).toFixed(2)} dB/día</code>\n`;
            if (hoursToCrit > 0 && hoursToCrit < 168) {
                const dateCrit = new Date(Date.now() + hoursToCrit * 3600000);
                msg += `🚨 <b>Nivel Crítico (8dB) en:</b> <code>~${Math.round(hoursToCrit)} horas</code>\n📅 Est: <code>${dateCrit.toLocaleString()}</code>`;
            } else {
                msg += `🛡️ Nivel crítico no alcanzado en los próximos 7 días.`;
            }
        }
        await sendTelegramNotification(msg, chatId);
    } catch (e) { console.error(e); }
}

async function handleMaintCommand(chatId) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM maintenance_windows WHERE end_date > NOW() AND status != 'cancelled' ORDER BY start_date ASC LIMIT 15"
        );

        if (!rows.length) {
            return sendTelegramNotification('✅ No hay ventanas de mantenimiento programadas o activas.', chatId);
        }

        let msg = `<b>🛠️ Monitor de Mantenimiento</b>\n\n`;
        const { getEnlaces } = require('../state');
        const enlaces = getEnlaces();

        rows.forEach((m, i) => {
            const now = new Date();
            const start = new Date(m.start_date);
            const end = new Date(m.end_date);
            const isActive = now >= start && now <= end;

            const startStr = start.toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
            const endStr = end.toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });

            let entityLabel = m.entity_id || 'Global';
            if (m.entity_id) {
                const en = enlaces.find(e => String(e.enlace1 || e.enlace) === String(m.entity_id) || String(e.enlace2) === String(m.entity_id));
                if (en) entityLabel = en.alias || `${en.name1} - ${en.name2}`;
            }

            const statusEmoji = isActive ? '🟡' : '🔵';
            const statusLabel = isActive ? 'EN PROGRESO' : 'PROGRAMADA';

            msg += `${statusEmoji} <b>${escapeHTML(m.title)}</b>\n`;
            msg += `📌 <b>Estado:</b> <code>${statusLabel}</code>\n`;
            if (m.description) msg += `📝 <i>${escapeHTML(m.description)}</i>\n`;
            msg += `🔗 <b>Afecta:</b> ${escapeHTML(entityLabel)}\n`;
            msg += `📅 <b>Desde:</b> <code>${startStr}</code>\n`;
            msg += `📅 <b>Hasta:</b> <code>${endStr}</code>\n`;
            msg += `──────────────────\n`;
        });

        await sendTelegramNotification(msg, chatId);
    } catch (e) {
        console.error('Error in handleMaintCommand:', e);
        await sendTelegramNotification('❌ Error al consultar la base de datos de mantenimiento.', chatId);
    }
}

/**
 * Handle Cisco Span Processor commands
 */
async function handleSpanCommand(chatId, args) {
    if (!args.length) {
        // Show summary of last batch if no args
        try {
            const [lastBatch] = await poolSpan.query('SELECT upload_batch_id FROM spans ORDER BY last_updated DESC LIMIT 1');
            if (!lastBatch.length) return sendTelegramNotification('❌ No hay datos de spans cargados.', chatId);

            const batchId = lastBatch[0].upload_batch_id;
            const [rows] = await poolSpan.query('SELECT * FROM spans WHERE upload_batch_id = ?', [batchId]);

            let statusOk = 0, statusCrit = 0, statusWarn = 0;
            rows.forEach(r => {
                const isCrit = r.max_span && r.last_span > r.max_span;
                const isWarn = !isCrit && r.max_span && r.last_span > (r.max_span - 0.5);
                if (isCrit) statusCrit++;
                else if (isWarn) statusWarn++;
                else statusOk++;
            });

            let msg = `<b>📡 Cisco Span Processor - Último Lote</b>\n` +
                `📅 Lote: <code>${batchId}</code>\n` +
                `📊 Total Enlaces: ${rows.length}\n\n` +
                `✅ OK: ${statusOk}\n` +
                `⚠️ PRECAUCIÓN: ${statusWarn}\n` +
                `🔥 CRÍTICO: ${statusCrit}\n\n` +
                `Uso: <code>/span [nombre]</code> para detalle.`;
            await sendTelegramNotification(msg, chatId);
            return;
        } catch (e) {
            console.error('Error in handleSpanCommand (summary):', e.message);
            return sendTelegramNotification('❌ Error al consultar la base de datos de spans.', chatId);
        }
    }

    const term = args.join(' ').toLowerCase();
    try {
        const [results] = await poolSpan.query(
            'SELECT * FROM spans WHERE (link_identifier LIKE ? OR source_node LIKE ? OR dest_node LIKE ?) AND id IN (SELECT MAX(id) FROM spans GROUP BY link_identifier) LIMIT 5',
            [`%${term}%`, `%${term}%`, `%${term}%`]
        );

        if (!results.length) return sendTelegramNotification(`❌ Sin resultados para "<b>${term}</b>" en Cisco.`, chatId);

        let msg = `<b>📡 Cisco Span Detail</b>\n\n`;
        results.forEach(r => {
            const diffMin = r.min_span ? (r.last_span - r.min_span).toFixed(2) : '--';
            const isCrit = r.max_span && r.last_span > r.max_span;
            const isWarn = !isCrit && r.max_span && r.last_span > (r.max_span - 0.5);
            const status = isCrit ? '🔴 CRÍTICO' : isWarn ? '🟡 PRECAUCIÓN' : '🟢 OK';

            msg += `🔗 <b>${escapeHTML(r.link_identifier)}</b>\n` +
                `📍 Origen: ${escapeHTML(r.source_node || '---')}\n` +
                `📍 Destino: ${escapeHTML(r.dest_node || '---')}\n` +
                `📶 Atenuación: <code>${r.last_span.toFixed(2)} dB</code>\n` +
                `📉 Min/Max: <code>${r.min_span?.toFixed(2) || '--'} / ${r.max_span?.toFixed(2) || '--'}</code>\n` +
                `📊 Estado: ${status} (${diffMin > 0 ? '+' : ''}${diffMin} dB vs Min)\n` +
                `📅 Act: <code>${new Date(r.last_updated).toLocaleString()}</code>\n` +
                `──────────────────\n`;
        });
        await sendTelegramNotification(msg, chatId);
    } catch (e) {
        console.error('Error in handleSpanCommand (search):', e.message);
        await sendTelegramNotification('❌ Error al procesar consulta de Cisco spans.', chatId);
    }
}

async function registerChatInDB(chat) {
    try {
        const chatId = String(chat.id), name = chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || chat.username;
        await pool.execute(`INSERT INTO telegram_destinations (chat_id, chat_name, chat_type, is_active, updated_at) VALUES (?, ?, ?, false, NOW()) ON DUPLICATE KEY UPDATE chat_name = VALUES(chat_name), updated_at = NOW()`, [chatId, name, chat.type || 'group']);
    } catch (e) { }
}

module.exports = { startTelegramBot };
