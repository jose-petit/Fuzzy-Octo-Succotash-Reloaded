import { NextApiRequest, NextApiResponse } from 'next';
import { connection } from 'config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Deposit {
  id: number;
  nombre: string;
  codigo: string;
}

interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  deposit?: Deposit;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM depositos WHERE id = ?',
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Depósito no encontrado' });
      }
      return res.status(200).json({ status: 'success', deposit: rows[0] as Deposit });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ status: 'error', message: 'Error al obtener depósito' });
    }
  }

  if (req.method === 'PUT') {
    const { nombre, codigo } = req.body;
    if (!nombre || !codigo) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Todos los campos son obligatorios' });
    }

    try {
      await connection.query<ResultSetHeader>(
        'UPDATE depositos SET nombre = ?, codigo = ? WHERE id = ?',
        [nombre, codigo, id]
      );
      return res
        .status(200)
        .json({ status: 'success', message: 'Depósito actualizado correctamente' });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ status: 'error', message: 'Error al actualizar depósito' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await connection.query<ResultSetHeader>('DELETE FROM depositos WHERE id = ?', [id]);
      return res
        .status(200)
        .json({ status: 'success', message: 'Depósito eliminado correctamente' });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ status: 'error', message: 'Error al eliminar depósito' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).json({ status: 'error', message: `Método ${req.method} no permitido` });
}
