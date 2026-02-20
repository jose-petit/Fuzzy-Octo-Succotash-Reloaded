const mysql = require('mysql2/promise');

const poolSpan = mysql.createPool({
    host: process.env.DB_SPAN_HOST || 'mysql-span',
    port: Number(process.env.DB_SPAN_PORT) || 3306,
    user: process.env.DB_SPAN_USER || 'dwdmcisco1',
    password: process.env.DB_SPAN_PASSWORD || 'dwdmspan1',
    database: process.env.DB_SPAN_NAME || 'datosinter',
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
});

async function waitForSpanDB(retries = 15, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            const conn = await poolSpan.getConnection();
            conn.release();
            console.log('✅ MySQL Span connection established');
            return;
        } catch (err) {
            console.log(`[Span DB Attempt ${i + 1}/${retries}] Waiting for MySQL Span at ${process.env.DB_SPAN_HOST}: ${err.message}`);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
    throw new Error('Could not connect to MySQL Span after multiple attempts');
}

module.exports = { poolSpan, waitForSpanDB };
