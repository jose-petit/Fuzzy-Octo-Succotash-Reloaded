import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        const alarms = await prisma.active_alarms.findMany({
            orderBy: { fecha_inicio: 'desc' }
        });
        return res.status(200).json({ status: 'success', alarms });
    }

    if (req.method === 'PATCH') {
        const { entityId } = req.body;
        if (!entityId) return res.status(400).json({ status: 'error', message: 'Falta ID de entidad' });

        await prisma.active_alarms.update({
            where: { entity_id: String(entityId) },
            data: {
                acknowledged: true,
                acknowledged_by: session.user?.name || 'Especialista de Transporte'
            }
        });

        return res.status(200).json({ status: 'success', message: 'Incidente aceptado' });
    }

    if (req.method === 'DELETE') {
        const { entityId } = req.query;
        if (!entityId) return res.status(400).json({ status: 'error', message: 'Falta ID de entidad' });

        await prisma.active_alarms.delete({
            where: { entity_id: String(entityId) }
        });

        return res.status(200).json({ status: 'success', message: 'Alarma removida' });
    }

    return res.status(405).end();
}
