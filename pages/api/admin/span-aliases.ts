import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/mysql-span';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM span_aliases ORDER BY alias ASC');
            return res.status(200).json({ status: 'success', aliases: rows });
        }

        if (req.method === 'POST') {
            const { link_identifier, alias } = req.body;
            if (!link_identifier || !alias) {
                return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
            }

            await pool.query(
                'INSERT INTO span_aliases (link_identifier, alias) VALUES (?, ?) ON DUPLICATE KEY UPDATE alias = VALUES(alias)',
                [link_identifier, alias]
            );

            return res.status(200).json({ status: 'success', message: 'Alias guardado' });
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ status: 'error', message: 'ID requerido' });
            }

            await pool.query('DELETE FROM span_aliases WHERE id = ?', [id]);
            return res.status(200).json({ status: 'success', message: 'Alias eliminado' });
        }

        return res.status(405).end();
    } catch (error: any) {
        console.error('Error in span-aliases API:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
