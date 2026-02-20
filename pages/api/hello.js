// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { connection } from 'config/db';

export default async function handler(req, res) {
  const results = await connection.query('SELECT 1 as status');
  res.status(200).json({ status: 'UP', results: results[0] });
}
