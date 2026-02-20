import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
        return res.status(400).json({ status: 'error', message: 'Token de Telegram no configurado en .env' });
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
        const response = await axios.get(url, { timeout: 5000 });

        // Extraer los chats únicos que han interactuado con el bot
        const updates = response.data.result || [];
        const chatMap = new Map();

        updates.forEach((u: any) => {
            const chat = u.message?.chat || u.my_chat_member?.chat || u.callback_query?.message?.chat;
            const date = u.message?.date || u.my_chat_member?.date || u.callback_query?.message?.date;

            if (chat && chat.id) {
                const existing = chatMap.get(chat.id);
                if (!existing || (date && date > existing.date)) {
                    chatMap.set(chat.id, { ...chat, date });
                }
            }
        });

        const uniqueChats = Array.from(chatMap.values());

        return res.status(200).json({
            status: 'success',
            chats: uniqueChats
        });
    } catch (error: any) {
        console.error('Error fetching Telegram updates:', error.message);
        return res.status(500).json({ status: 'error', message: 'Error al conectar con la API de Telegram' });
    }
}
