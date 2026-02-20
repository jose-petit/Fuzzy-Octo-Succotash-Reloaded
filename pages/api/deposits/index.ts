import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const deposits = await prisma.depositos.findMany({
          orderBy: { nombre: 'asc' }
        });
        return res.status(200).json({ status: 'success', deposits });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Error loading deposits' });
      }

    case 'POST':
      try {
        const { nombre, codigo } = req.body;
        if (!nombre) {
          return res.status(400).json({ status: 'error', message: 'El nombre es obligatorio' });
        }
        const newDeposit = await prisma.depositos.create({
          data: { nombre, codigo }
        });
        return res.status(201).json({ status: 'success', message: 'Depósito creado', deposit: newDeposit });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Error al crear depósito' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
