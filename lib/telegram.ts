import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(message: string, chatId?: string) {
    if (!BOT_TOKEN) {
        console.warn('Telegram BOT_TOKEN not configured');
        return null;
    }

    const targetChatId = chatId || DEFAULT_CHAT_ID;

    if (!targetChatId) {
        console.warn('Telegram CHAT_ID not configured');
        return null;
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: targetChatId,
            text: message,
            parse_mode: 'HTML'
        });
        return response.data;
    } catch (error: any) {
        console.error('Error sending Telegram message:', error?.response?.data || error.message);
        return null;
    }
}
