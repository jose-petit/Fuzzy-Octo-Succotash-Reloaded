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
            // Obtener los enlaces únicos (último registro por link_identifier) 
            // y unir con los alias si existen
            const query = `
                SELECT 
                    s.link_identifier, 
                    s.min_span, 
                    s.max_span, 
                    s.last_span,
                    a.alias
                FROM (
                    SELECT link_identifier, MAX(id) as last_id
                    FROM spans
                    GROUP BY link_identifier
                ) as latest
                JOIN spans s ON s.id = latest.last_id
                LEFT JOIN span_aliases a ON s.link_identifier = a.link_identifier
                ORDER BY a.alias ASC, s.link_identifier ASC
            `;
            const [rows] = await pool.query(query);

            // Asegurar que min/max no sean null
            const links = (rows as any[]).map(row => ({
                ...row,
                min_span: row.min_span || 0,
                max_span: row.max_span || 0
            }));

            return res.status(200).json({ status: 'success', links });
        }

        if (req.method === 'PATCH') {
            const { link_identifier, min, max } = req.body;
            if (!link_identifier || min === undefined || max === undefined) {
                return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
            }

            // Actualizamos los thresholds para TODOS los registros de ese enlace en la tabla spans
            // para que los nuevos registros también tomen estos valores si se usa ON DUPLICATE KEY logic
            // o simplemente para mantener consistencia.
            await pool.query(
                'UPDATE spans SET min_span = ?, max_span = ? WHERE link_identifier = ?',
                [min, max, link_identifier]
            );

            return res.status(200).json({ status: 'success', message: 'Thresholds actualizados' });
        }

        return res.status(405).end();
    } catch (error: any) {
        console.error('Error in span-links API:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
