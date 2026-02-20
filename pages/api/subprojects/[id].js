import { connection } from 'config/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const subproject = await connection.query('SELECT * FROM sub_proyectos WHERE id = ?', [id]);
    if (subproject[0].length === 0) {
      return res.status(200).json({ message: 'Subproyecto no encontrado' });
    }
    return res.status(200).json({ status: 'success', subproject: subproject[0][0] });
  }

  if (req.method === 'PUT') {
    const { nombre, descripcion, estado } = req.body;
    if (!nombre || !descripcion || !estado) {
      return res.status(200).json({ message: 'Todos los campos son obligatorios' });
    }

    await connection.query(
      'UPDATE sub_proyectos SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?',
      [nombre, descripcion, estado, id]
    );

    return res
      .status(200)
      .json({ status: 'success', message: 'Subproyecto actualizado correctamente' });
  }

  if (req.method === 'DELETE') {
    await connection.query('DELETE FROM sub_proyectos WHERE id = ?', [id]);
    return res
      .status(200)
      .json({ status: 'success', message: 'Subproyecto eliminado correctamente' });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(200).end({ status: 'error', message: `Método ${req.method} no permitido` });
}
