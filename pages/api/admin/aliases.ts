import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ status: 'error', message: 'No autorizado' });

    if (req.method === 'GET') {
        const aliases = await prisma.link_aliases.findMany();
        return res.status(200).json({ status: 'success', aliases });
    }

    if (req.method === 'POST') {
        const { serial, alias } = req.body;
        if (!serial || !alias) return res.status(400).json({ status: 'error', message: 'Faltan datos' });

        const newAlias = await prisma.link_aliases.upsert({
            where: { serial: String(serial) },
            update: { alias },
            create: { serial: String(serial), alias }
        });

        return res.status(200).json({ status: 'success', alias: newAlias });
    }

    if (req.method === 'DELETE') {
        const { serial } = req.body;
        if (!serial) return res.status(400).json({ status: 'error', message: 'Falta serial' });

        await prisma.link_aliases.delete({
            where: { serial: String(serial) }
        });

        return res.status(200).json({ status: 'success', message: 'Alias eliminado' });
    }

    if (req.method === 'PATCH') {
        const { syncFromTopology } = req.body;
        if (!syncFromTopology) return res.status(400).json({ status: 'error', message: 'Acción no reconocida' });

        const topologyRows = await prisma.data_firebase.findMany();
        const aliasMap = new Map<string, string>();

        for (const row of topologyRows) {
            let data: any;
            try {
                data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            } catch (e) { continue; }

            if (data.enlace1 && data.name1) aliasMap.set(String(data.enlace1).trim(), String(data.name1).trim());
            if (!data.isSingle && data.enlace2 && data.name2) aliasMap.set(String(data.enlace2).trim(), String(data.name2).trim());
        }

        let count = 0;
        const entries = Array.from(aliasMap.entries());
        for (const [serial, alias] of entries) {
            await prisma.link_aliases.upsert({
                where: { serial },
                update: { alias },
                create: { serial, alias }
            });
            count++;
        }

        return res.status(200).json({ status: 'success', message: `Sincronizados ${count} registros` });
    }

    return res.status(405).json({ status: 'error', message: 'Método no permitido' });
}
