import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const projectId = Number(id);

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (isNaN(projectId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid Project ID' });
    }

    try {
        const subprojects = await prisma.sub_proyectos.findMany({
            where: { project_id: projectId },
            orderBy: { nombre: 'asc' }
        });
        return res.status(200).json({ status: 'success', subprojects });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Error loading subprojects' });
    }
}
