const { connection } = require('../../../config/db');

export default async function handler(req, res) {
  // Ensure spans history table exists
  await connection.query(
    `CREATE TABLE IF NOT EXISTS spans_history (
			 id INT AUTO_INCREMENT PRIMARY KEY,
			 fecha_lote DATETIME NOT NULL,
			 name1 VARCHAR(255),
			 name2 VARCHAR(255),
			 serial1 INT,
			 serial2 INT,
			 raman1 FLOAT,
			 raman2 FLOAT,
			 umbral FLOAT,
			 perdida FLOAT
		 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );
  if (req.method === 'POST') {
    try {
      const { spans } = req.body;
      const now = new Date();
      const inserts = spans.map((s) =>
        connection.query(
          `INSERT INTO spans_history (fecha_lote, name1, name2, serial1, serial2, raman1, raman2, umbral, perdida)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [now, s.name1, s.name2, s.serial1, s.serial2, s.raman1, s.raman2, s.umbral, s.perdida]
        )
      );
      await Promise.all(inserts);
      return res.status(200).json({ inserted: spans.length });
    } catch (error) {
      console.error('Error inserting spans history:', error);
      return res.status(500).json({ error: 'Failed to persist spans history' });
    }
  }
  if (req.method === 'GET') {
    try {
      const [rows] = await connection.query('SELECT * FROM spans_history ORDER BY fecha_lote DESC');
      return res.status(200).json({ history: rows });
    } catch (error) {
      console.error('Error fetching spans history:', error);
      return res.status(500).json({ error: 'Failed to fetch spans history' });
    }
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
