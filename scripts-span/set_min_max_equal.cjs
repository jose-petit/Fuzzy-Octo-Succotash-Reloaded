const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Actualizar solo registros donde last_span no sea nulo
  const [result] = await pool.query(
    'UPDATE spans SET min_span = last_span, max_span = last_span WHERE last_span IS NOT NULL'
  );
  console.log(`Actualizados ${result.affectedRows} registros: min_span y max_span igualados a last_span (solo donde last_span no es nulo).`);
  await pool.end();
}

main().catch(err => {
  console.error('Error actualizando min/max:', err);
  process.exit(1);
});
