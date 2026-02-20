import { connection } from 'config/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const project = await connection.query('SELECT * FROM proyectos WHERE id = ?', [id]);
      if (project[0].length === 0) {
        return res.status(200).json({ status: 'error', message: 'Proyecto no encontrado' });
      }
      return res.status(200).json({ status: 'success', project: project[0][0] });
    } catch (error) {
      return res
        .status(200)
        .json({ status: 'error', message: 'Error al obtener el proyecto', error });
    }
  }

  if (req.method === 'PUT') {
    const { nombre, descripcion, estado } = req.body;
    if (!nombre || !descripcion || !estado) {
      return res
        .status(200)
        .json({ status: 'error', message: 'Todos los campos son obligatorios' });
    }

    try {
      await connection.query(
        'UPDATE proyectos SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?',
        [nombre, descripcion, estado, id]
      );
      return res
        .status(200)
        .json({ status: 'success', message: 'Proyecto actualizado correctamente' });
    } catch (error) {
      return res
        .status(200)
        .json({ status: 'error', message: 'Error al actualizar el proyecto', error });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await connection.query('DELETE FROM proyectos WHERE id = ?', [id]);
      return res
        .status(200)
        .json({ status: 'success', message: 'Proyecto eliminado correctamente' });
    } catch (error) {
      return res
        .status(200)
        .json({ status: 'error', message: 'Error al eliminar el proyecto', error });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(200).end({ status: 'error', message: `Método ${req.method} no permitido` });
}
