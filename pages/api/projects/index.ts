import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const projects = await prisma.proyectos.findMany({
                    orderBy: { nombre: 'asc' }
                });
                return res.status(200).json({ status: 'success', projects });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ status: 'error', message: 'Error loading projects' });
            }

        case 'POST':
            try {
                const { nombre, descripcion, estado } = req.body;
                if (!nombre) {
                    return res.status(400).json({ status: 'error', message: 'El nombre es obligatorio' });
                }
                const newProject = await prisma.proyectos.create({
                    data: {
                        nombre,
                        descripcion,
                        estado: estado || 'activo'
                    }
                });
                return res.status(201).json({ status: 'success', message: 'Proyecto creado', project: newProject });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ status: 'error', message: 'Error al crear proyecto' });
            }

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).end(`Method ${method} Not Allowed`);
    }
}
