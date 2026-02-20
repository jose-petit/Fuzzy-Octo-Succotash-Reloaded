import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const destinations = await prisma.telegram_destinations.findMany({
                orderBy: { created_at: 'desc' }
            });
            return res.status(200).json({ status: 'success', destinations });
        } catch (error: any) {
            console.error('Error fetching Telegram destinations:', error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { chat_id, chat_name, chat_type, is_active, can_query, alias, last_hidden_at } = req.body;

            if (!chat_id) {
                return res.status(400).json({ status: 'error', message: 'chat_id is required' });
            }

            const destination = await prisma.telegram_destinations.upsert({
                where: { chat_id: String(chat_id) },
                update: {
                    chat_name: chat_name || undefined,
                    chat_type: chat_type || undefined,
                    is_active: is_active !== undefined ? Boolean(is_active) : undefined,
                    can_query: can_query !== undefined ? Boolean(can_query) : undefined,
                    alias: alias !== undefined ? alias : undefined,
                    last_hidden_at: last_hidden_at !== undefined ? (last_hidden_at === null ? null : new Date(last_hidden_at)) : undefined
                },
                create: {
                    chat_id: String(chat_id),
                    chat_name: chat_name || 'N/A',
                    chat_type: chat_type || 'group',
                    is_active: is_active !== undefined ? Boolean(is_active) : true,
                    can_query: can_query !== undefined ? Boolean(can_query) : false,
                    alias: alias || null,
                    last_hidden_at: last_hidden_at ? new Date(last_hidden_at) : null
                }
            });

            return res.status(200).json({ status: 'success', destination });
        } catch (error: any) {
            console.error('Error creating/updating Telegram destination:', error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, is_active } = req.body;

            if (!id) {
                return res.status(400).json({ status: 'error', message: 'id is required' });
            }

            const destination = await prisma.telegram_destinations.update({
                where: { id: Number(id) },
                data: { is_active: Boolean(is_active) }
            });

            return res.status(200).json({ status: 'success', destination });
        } catch (error: any) {
            console.error('Error updating Telegram destination:', error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ status: 'error', message: 'id is required' });
            }

            await prisma.telegram_destinations.delete({
                where: { id: Number(id) }
            });

            return res.status(200).json({ status: 'success', message: 'Destination deleted' });
        } catch (error: any) {
            console.error('Error deleting Telegram destination:', error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
