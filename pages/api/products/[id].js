import { connection } from 'config/db';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return await getItem(req, res);
    case 'DELETE':
      return await deleteProduct(req, res);
    case 'PUT':
      return await updateProduct(req, res);
    default:
      return res.status(400).json({ message: 'bad request' });
  }
}

const getItem = async (req, res) => {
  try {
    // Destructure rows from query result
    const [rows] = await connection.query('SELECT * FROM product WHERE id = ?', [req.query.id]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await connection.query('DELETE FROM product WHERE id = ?', [req.query.id]);
    return res.status(204).json();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    console.log(req.body);
    await connection.query('UPDATE product SET ? WHERE id = ?', [req.body, req.query.id]);
    return res.status(204).json();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
