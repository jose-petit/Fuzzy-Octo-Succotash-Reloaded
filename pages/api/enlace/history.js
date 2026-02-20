const { connection } = require('../../../config/db');

export default async function handler(req, res) {
  // Ensure history table exists
  await connection.query(
    `CREATE TABLE IF NOT EXISTS enlace_history (
			   id INT AUTO_INCREMENT PRIMARY KEY,
			   fecha_lote DATETIME NOT NULL,
			   name1 VARCHAR(255),
			   name2 VARCHAR(255),
			   enlace1 INT,
			   enlace2 INT,
			   raman1 FLOAT,
			   raman2 FLOAT,
			   umbral FLOAT,
			   edfa_o FLOAT,
			   edfa_d FLOAT
		   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );
  if (req.method === 'POST') {
    try {
      const { enlaces } = req.body;
      const now = new Date();
      const inserts = enlaces.map((e) => {
        return connection.query(
          `INSERT INTO enlace_history (fecha_lote, name1, name2, enlace1, enlace2, raman1, raman2, umbral, edfa_o, edfa_d)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            now,
            e.name1,
            e.name2,
            e.enlace1,
            e.enlace2,
            e.raman1,
            e.raman2,
            e.umbral,
            e.edfaO,
            e.edfaD,
          ]
        );
      });
      await Promise.all(inserts);
      return res.status(200).json({ inserted: enlaces.length });
    } catch (error) {
      console.error('Error inserting enlace history:', error);
      return res.status(500).json({ error: 'Failed to persist history' });
    }
  }
  if (req.method === 'GET') {
    try {
      const [rows] = await connection.query(
        'SELECT * FROM enlace_history ORDER BY fecha_lote DESC'
      );
      return res.status(200).json({ history: rows });
    } catch (error) {
      console.error('Error fetching enlace history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
