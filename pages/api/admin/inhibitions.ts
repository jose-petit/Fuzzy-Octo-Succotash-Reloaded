import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { pool } from "@/backend-performance/src/config/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const [rows] = await pool.query('SELECT serial1, inhibited_by, created_at FROM link_inhibitions ORDER BY created_at DESC');
            return res.status(200).json({ status: 'success', inhibitions: rows });
        } catch (err: any) {
            return res.status(500).json({ status: 'error', message: err.message });
        }
    }

    if (req.method === 'POST') {
        const { serial, inhibited_by } = req.body;
        if (!serial) return res.status(400).json({ status: 'error', message: 'Serial es requerido' });

        try {
            await pool.query(
                'INSERT IGNORE INTO link_inhibitions (serial1, inhibited_by) VALUES (?, ?)',
                [serial, inhibited_by || 'Web Admin']
            );
            return res.status(200).json({ status: 'success', message: 'Equipo inhibido correctamente' });
        } catch (err: any) {
            return res.status(500).json({ status: 'error', message: err.message });
        }
    }

    if (req.method === 'DELETE') {
        const { serial } = req.body;
        if (!serial) return res.status(400).json({ status: 'error', message: 'Serial es requerido' });

        try {
            await pool.query('DELETE FROM link_inhibitions WHERE serial1 = ?', [serial]);
            return res.status(200).json({ status: 'success', message: 'Inhibición removida' });
        } catch (err: any) {
            return res.status(500).json({ status: 'error', message: err.message });
        }
    }

    return res.status(405).end();
}
