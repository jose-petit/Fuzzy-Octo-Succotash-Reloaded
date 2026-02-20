const axios = require('axios');
const { pool } = require('../config/db');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a notification to Telegram.
 * @param {string} message - HTML formatted message.
 * @param {string} [chatId] - Optional target Chat ID.
 * @param {Array} [buttons] - Optional inline keyboard buttons.
 */
async function sendTelegramNotification(message, chatId, buttons = null) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const finalChatId = chatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !finalChatId) {
        console.error('❌ Telegram Service: Falta Token o Chat ID');
        return;
    }

    try {
        const payload = {
            chat_id: finalChatId,
            text: message,
            parse_mode: 'HTML',
        };

        if (buttons && buttons.length > 0) {
            payload.reply_markup = {
                inline_keyboard: [buttons]
            };
        }

        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, payload);
        console.log(`✅ Mensaje enviado a Telegram: ${finalChatId}`);
    } catch (error) {
        console.error('❌ Error enviando a Telegram:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Broadcasts a notification to ALL active destinations in the database.
 * If no destinations are found, falls back to the default Chat ID.
 * @param {string} message - HTML formatted message.
 * @param {Array} [buttons] - Optional inline keyboard buttons.
 */
async function broadcastTelegramNotification(message, buttons = null) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.error('❌ Telegram Broadcast: No hay Token configurado');
        return { success: 0, failed: 0 };
    }

    try {
        // Consultar destinos guardados en la tabla que estén ACTIVOS
        console.log('🔍 [Telegram Service] Consultando tabla telegram_destinations...');
        const [destinations] = await pool.query(
            'SELECT chat_id, chat_name FROM telegram_destinations WHERE is_active = 1'
        );

        // Si no hay destinos activos grabados, usamos el default (tu grupo principal)
        if (!destinations || destinations.length === 0) {
            console.warn('⚠️ [Telegram Broadcast] No hay destinos activos en BD. Usando Fallback.');
            if (DEFAULT_CHAT_ID) {
                console.log(`📡 [Fallback] Enviando a ID Default: ${DEFAULT_CHAT_ID}`);
                await sendTelegramNotification(message, DEFAULT_CHAT_ID, buttons);
                return { success: 1, failed: 0 };
            }
            return { success: 0, failed: 0 };
        }

        console.log(`📡 [Telegram Broadcast] Enviando a ${destinations.length} destinos REALES en BD:`);

        let successCount = 0;
        let failedCount = 0;

        for (const dest of destinations) {
            try {
                console.log(`   -> Intentando enviar a: ${dest.chat_name} (${dest.chat_id})`);
                await sendTelegramNotification(message, dest.chat_id, buttons);
                console.log(`   ✅ Éxito: ${dest.chat_name}`);
                successCount++;
            } catch (err) {
                console.error(`   ❌ Fallo en ${dest.chat_name} (${dest.chat_id}):`, err.message);
                failedCount++;
            }
        }

        console.log(`🏁 [Broadcast Finalizado] Éxitos: ${successCount}, Fallos: ${failedCount}`);
        return { success: successCount, failed: failedCount };

    } catch (error) {
        console.error('❌ [Error Crítico Broadcast]:', error.message);
        return { success: 0, failed: 0 };
    }
}

module.exports = {
    sendTelegramNotification,
    broadcastTelegramNotification
};
