import mysql from 'mysql2/promise';

console.log('--- DB Config Debug ---');
console.log('HOST:', process.env.DB_HOST);
console.log('PORT:', process.env.DB_PORT);
console.log('USER:', process.env.DB_USER);
console.log('DB:', process.env.DB_NAME);
console.log('-----------------------');

export const connection = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-wn',
  user: process.env.DB_USER || 'web_user',
  password: process.env.DB_PASSWORD || 'web_pass',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  database: process.env.DB_NAME || 'web_notifications',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  connectTimeout: 20000, // 20s
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10s
});

connection.getConnection()
  .then(conn => {
    console.log('✅ Pool test: Connection successful');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Pool test: Connection failed:', err.message);
  });
