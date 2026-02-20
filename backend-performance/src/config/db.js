const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-wn',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'web_user',
  password: process.env.DB_PASSWORD || 'web_pass',
  database: process.env.DB_NAME || 'web_notifications',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function waitForDB(retries = 15, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log('✅ MySQL connection established');
      return;
    } catch (err) {
      console.log(`[Attempt ${i + 1}/${retries}] Waiting for MySQL at ${process.env.DB_HOST}: ${err.message}`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('Could not connect to MySQL after multiple attempts');
}

module.exports = { pool, waitForDB };
