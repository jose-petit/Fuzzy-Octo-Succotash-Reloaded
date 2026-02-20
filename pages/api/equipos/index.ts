import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            const { id_deposito, id_proyecto, id_sub_proyecto, codigo_gx, ciudad } = req.query;
            const where: any = {};

            if (id_deposito) where.id_deposito = Number(id_deposito);
            if (id_proyecto) where.id_proyecto = Number(id_proyecto);
            if (id_sub_proyecto) where.id_sub_proyecto = Number(id_sub_proyecto);
            if (codigo_gx) where.codigo_gx = { contains: String(codigo_gx) };
            if (ciudad) where.ciudad = { contains: String(ciudad) };

            const equipos = await prisma.equipos.findMany({
                where,
                include: {
                    depositos: true,
                    proyectos: true,
                    sub_proyectos: true,
                    usuarios: true,
                },
                orderBy: { id: 'desc' }
            });

            return res.status(200).json({ status: 'success', equipos });
        }

        if (req.method === 'POST') {
            const data = req.body;
            console.log('📦 Recibida solicitud de creación de equipo:', data);

            try {
                const equipo = await prisma.equipos.create({
                    data: {
                        id_deposito: Number(data.id_deposito),
                        id_proyecto: Number(data.id_proyecto),
                        id_sub_proyecto: Number(data.id_sub_proyecto),
                        codigo_gx: data.codigo_gx,
                        num_parte: data.num_parte,
                        descripcion: data.descripcion,
                        observacion: data.observacion,
                        cantidad: Number(data.cantidad),
                        autorizado_solicitado_por: Number(data.autorizado_solicitado_por),
                        fecha: new Date(data.fecha),
                        ciudad: data.ciudad,
                    }
                });

                // Audit Log Creation
                await (prisma as any).inventory_logs.create({
                    data: {
                        id_equipo: equipo.id,
                        tipo: 'CREACION',
                        cantidad: Number(data.cantidad),
                        new_stock: Number(data.cantidad),
                        descripcion: `Alta inicial de equipo: ${data.descripcion || data.codigo_gx}`,
                        user_id: Number(data.autorizado_solicitado_por)
                    }
                });

                console.log('✅ Equipo persistido y auditado con éxito:', equipo.id);
                return res.status(200).json({ status: 'success', message: 'Equipo creado y auditado correctamente', equipo });
            } catch (dbError: any) {
                console.error('❌ Error de persistencia Prisma:', dbError.message);
                return res.status(500).json({
                    status: 'error',
                    message: `Error de base de datos: ${dbError.message}`,
                    code: dbError.code
                });
            }
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    } catch (error: any) {
        console.error('🔥 Fatal API Error:', error);
        res.status(500).json({ status: 'error', message: `Critical failure: ${error.message}` });
    }
}
