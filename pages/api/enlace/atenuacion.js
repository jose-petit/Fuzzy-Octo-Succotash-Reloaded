import { connection } from 'config/db';

export default async function handler(req, res) {
  const { method } = req;
  try {
    if (method === 'GET') {
      // Opcional: filtrar por enlace_id
      const { enlace_id } = req.query;
      let query = 'SELECT * FROM enlace_atenuacion';
      const params = [];
      if (enlace_id) {
        query += ' WHERE enlace_id = ?';
        params.push(enlace_id);
      }
      const [rows] = await connection.query(query, params);
      return res.status(200).json({ status: 'success', data: rows });
    }

    if (method === 'POST') {
      const { enlace_id, valor } = req.body;
      if (!enlace_id || valor == null) {
        return res
          .status(400)
          .json({ status: 'error', message: 'enlace_id y valor son obligatorios' });
      }
      const [result] = await connection.query(
        'INSERT INTO enlace_atenuacion (enlace_id, valor) VALUES (?, ?)',
        [enlace_id, valor]
      );
      return res.status(200).json({ status: 'success', id: result.insertId });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: `Método ${method} no permitido` });
  } catch (error) {
    console.error('Error en /api/enlace/atenuacion:', error);
    return res.status(500).json({ status: 'error', message: 'Error Interno' });
  }
}
