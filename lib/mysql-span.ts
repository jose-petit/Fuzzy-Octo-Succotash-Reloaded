import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_SPAN_HOST || 'localhost',
    port: Number(process.env.DB_SPAN_PORT) || 3307,
    user: process.env.DB_SPAN_USER || 'dwdmcisco1',
    password: process.env.DB_SPAN_PASSWORD || 'dwdmspan1',
    database: process.env.DB_SPAN_NAME || 'datosinter',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;
