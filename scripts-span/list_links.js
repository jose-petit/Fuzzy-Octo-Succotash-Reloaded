import mysql from 'mysql2/promise';

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'datosinter',
  });
  const [rows] = await connection.query("SELECT DISTINCT link_identifier FROM spans ORDER BY link_identifier");
  for (const row of rows) {
    console.log(row.link_identifier);
  }
  await connection.end();
})();
