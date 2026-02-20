import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const { entity_id } = req.query;
            const events = await prisma.network_events.findMany({
                where: entity_id ? { entity_id: String(entity_id) } : {},
                orderBy: { start_date: 'desc' },
                take: 100
            });
            return res.status(200).json({ status: 'success', events });
        } catch (error: any) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { entity_id, event_type, description, severity, start_date, end_date, details } = req.body;
            const event = await prisma.network_events.create({
                data: {
                    entity_id,
                    event_type,
                    description,
                    severity,
                    start_date: start_date ? new Date(start_date) : undefined,
                    end_date: end_date ? new Date(end_date) : undefined,
                    details: details || {}
                }
            });
            return res.status(200).json({ status: 'success', event });
        } catch (error: any) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
