import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.rol !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Acceso denegado' });
    }

    if (req.method === 'GET') {
        try {
            const logs = await prisma.audit_logs.findMany({
                orderBy: { fecha: 'desc' },
                take: 100,
            });
            return res.status(200).json({ status: 'success', logs });
        } catch (error) {
            console.error('Audit fetch error:', error);
            return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Método no permitido' });
}
