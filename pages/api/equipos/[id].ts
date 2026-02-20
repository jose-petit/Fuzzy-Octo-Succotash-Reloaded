import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const equipoId = Number(id);

    if (isNaN(equipoId)) {
        return res.status(400).json({ status: 'error', message: 'ID inválido' });
    }

    try {
        if (req.method === 'GET') {
            const equipo = await prisma.equipos.findUnique({
                where: { id: equipoId },
                include: {
                    depositos: true,
                    proyectos: true,
                    sub_proyectos: true,
                    usuarios: true,
                },
            });
            if (!equipo) return res.status(404).json({ status: 'error', message: 'Equipo no encontrado' });
            return res.status(200).json({ status: 'success', equipo });
        }

        if (req.method === 'PUT') {
            const data = req.body;

            // Fetch current state for auditing
            const current = await prisma.equipos.findUnique({ where: { id: equipoId } });
            if (!current) return res.status(404).json({ status: 'error', message: 'Equipo no encontrado' });

            const updated = await prisma.equipos.update({
                where: { id: equipoId },
                data: {
                    id_deposito: data.id_deposito ? Number(data.id_deposito) : undefined,
                    id_proyecto: data.id_proyecto ? Number(data.id_proyecto) : undefined,
                    id_sub_proyecto: data.id_sub_proyecto ? Number(data.id_sub_proyecto) : undefined,
                    codigo_gx: data.codigo_gx,
                    num_parte: data.num_parte,
                    descripcion: data.descripcion,
                    observacion: data.observacion,
                    cantidad: data.cantidad !== undefined ? Number(data.cantidad) : undefined,
                    autorizado_solicitado_por: data.autorizado_solicitado_por ? Number(data.autorizado_solicitado_por) : undefined,
                    fecha: data.fecha ? new Date(data.fecha) : undefined,
                    ciudad: data.ciudad,
                },
            });

            // Audit Log
            await (prisma as any).inventory_logs.create({
                data: {
                    id_equipo: equipoId,
                    tipo: 'EDICION',
                    cantidad: (Number(data.cantidad) || 0) - (current.cantidad || 0),
                    prev_stock: current.cantidad,
                    new_stock: updated.cantidad,
                    descripcion: `Edición de equipo. Cantidad ajustada de ${current.cantidad} a ${updated.cantidad}`,
                    user_id: Number(data.autorizado_solicitado_por) || current.autorizado_solicitado_por
                }
            });

            return res.status(200).json({ status: 'success', message: 'Equipo actualizado correctamente', equipo: updated });
        }

        if (req.method === 'DELETE') {
            // Audit before delete
            const current = await prisma.equipos.findUnique({ where: { id: equipoId } });
            if (current) {
                await (prisma as any).inventory_logs.create({
                    data: {
                        id_equipo: equipoId,
                        tipo: 'ELIMINACION',
                        cantidad: -(current.cantidad || 0),
                        prev_stock: current.cantidad,
                        new_stock: 0,
                        descripcion: `Eliminación de registro: ${current.descripcion || current.codigo_gx}`
                    }
                });
            }

            await prisma.equipos.delete({ where: { id: equipoId } });
            return res.status(200).json({ status: 'success', message: 'Equipo eliminado correctamente' });
        }

        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    } catch (error: any) {
        console.error('🔥 API Error [id]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
