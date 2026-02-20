import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { chatId, message, isCisco } = req.body;
    let botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (isCisco) {
        // Buscar token de Cisco en settings
        const ciscoTokenRecord = await prisma.system_settings.findUnique({
            where: { key: 'telegram_bot_token_cisco' }
        });
        if (ciscoTokenRecord?.value) {
            botToken = ciscoTokenRecord.value;
        }
    }

    if (!botToken || !chatId) {
        return res.status(400).json({ status: 'error', message: 'Faltan parámetros (Token o Chat ID)' });
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text: `<b>${isCisco ? 'SISTEMA CISCO SPAN' : 'SISTEMA DWDM PADTEC'}</b>\n\n${message}\n\n<i>ID de Chat verificado: ${chatId}</i>`,
            parse_mode: 'HTML'
        });

        return res.status(200).json({ status: 'success' });
    } catch (error: any) {
        console.error('Error sending test message:', error.response?.data || error.message);
        return res.status(500).json({ status: 'error', message: 'Error al enviar mensaje' });
    }
}
