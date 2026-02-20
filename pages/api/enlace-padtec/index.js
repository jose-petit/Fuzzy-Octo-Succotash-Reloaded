import { connection } from 'config/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const [rows] = await connection.query('SELECT * FROM enlace_padtec');
      return res.status(200).json({ status: 'success', enlaces: rows });
    } catch (error) {
      console.error('Error in /api/enlace-padtec:', error);
      return res.status(500).json({ status: 'error', message: 'Error Interno' });
    }
  }
  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ status: 'error', message: `Método ${req.method} no permitido` });
}
