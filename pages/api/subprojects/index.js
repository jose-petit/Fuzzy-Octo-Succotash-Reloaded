import { connection } from 'config/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const subprojects =
      await connection.query(`SELECT sub.id, sub.nombre, sub.descripcion, sub.estado, pro.nombre as pro_nombre FROM sub_proyectos sub
INNER JOIN proyectos pro ON pro.id=sub.project_id`);
    return res.status(200).json({ status: 'success', subprojects: subprojects[0] });
  }

  if (req.method === 'POST') {
    const { nombre, descripcion, estado, project_id } = req.body;
    if (!nombre || !descripcion || !estado || !project_id) {
      return res.status(200).json({ message: 'Todos los campos son obligatorios' });
    }

    await connection.query(
      'INSERT INTO sub_proyectos (nombre, descripcion, estado, project_id) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, estado, project_id]
    );

    return res.status(200).json({ status: 'success', message: 'Subproyecto creado correctamente' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(200).end({ status: 'error', message: `Método ${req.method} no permitido` });
}
