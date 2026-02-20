import { connection } from 'config/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const user = await connection.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (user.length === 0)
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    const resp = {
      status: 'success',
      user: user[0][0],
    };
    return res.status(200).json(resp);
  }

  if (req.method === 'PUT') {
    const { nombre, email, password, rol } = req.body;
    // 🔒 Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.query(
      'UPDATE usuarios SET nombre = ?, email = ?, password = ?, rol = ? WHERE id = ?',
      [nombre, email, hashedPassword, rol, id]
    );
    return res
      .status(200)
      .json({ status: 'success', message: 'Usuario actualizado correctamente' });
  }

  if (req.method === 'DELETE') {
    await connection.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return res.status(200).json({ status: 'success', message: 'Usuario eliminado correctamente' });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(200).end({ status: 'error', message: `Método ${req.method} no permitido` });
}
