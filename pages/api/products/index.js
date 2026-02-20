import { connection } from 'config/db';

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return await getProducts(req, res);
    case 'POST':
      return await saveProduct(req, res);
    default:
      return res.status(200).send('Method not allowed');
  }
}

const getProducts = async (req, res) => {
  try {
    // Destructure rows from query result
    const [rows] = await connection.query('SELECT * FROM product');
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const saveProduct = async (req, res) => {
  try {
    const payload = { ...req.body, fecha: new Date() };
    // Destructure result packet
    const [result] = await connection.query('INSERT INTO product SET ?', payload);
    return res.status(201).json({ ...payload, id: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
