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
            const windows = await prisma.maintenance_windows.findMany({
                orderBy: { start_date: 'desc' }
            });
            return res.status(200).json({ status: 'success', windows });
        } catch (error: any) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { title, description, start_date, end_date, entity_id, status } = req.body;
            const window = await prisma.maintenance_windows.create({
                data: {
                    title,
                    description,
                    start_date: new Date(start_date),
                    end_date: new Date(end_date),
                    entity_id,
                    status: status || 'scheduled'
                }
            });
            return res.status(200).json({ status: 'success', window });
        } catch (error: any) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, title, description, start_date, end_date, entity_id, status } = req.body;
            const window = await prisma.maintenance_windows.update({
                where: { id: Number(id) },
                data: {
                    title,
                    description,
                    start_date: start_date ? new Date(start_date) : undefined,
                    end_date: end_date ? new Date(end_date) : undefined,
                    entity_id,
                    status
                }
            });
            return res.status(200).json({ status: 'success', window });
        } catch (error: any) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            await prisma.maintenance_windows.delete({
                where: { id: Number(id) }
            });
            return res.status(200).json({ status: 'success' });
        } catch (error: any) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
