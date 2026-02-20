const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  try {
    // Read busData JSON
    const filePath = path.join(__dirname, '../pages/performance/busData.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Configure DB connection (use env vars or defaults)
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3308,
      user: process.env.DB_USER || 'web_user',
      password: process.env.DB_PASSWORD || 'web_pass',
      database: process.env.DB_NAME || 'web_notifications',
      waitForConnections: true,
      connectionLimit: 10,
    });

    // Clear existing data
    await pool.query('DELETE FROM bus_data');

    // Prepare insert values
    const values = data.map((item) => [
      item.bus,
      item.card,
      item.ne,
      item.slot,
      item.position_rack,
      item.sub_rack,
      item.part,
      item.serial,
      item.type,
      item.value,
      item.collection_date,
    ]);

    // Bulk insert
    const [result] = await pool.query(
      'INSERT INTO bus_data (bus, card, ne, slot, position_rack, sub_rack, part, serial, type, value, collection_date) VALUES ?',
      [values]
    );

    console.log(`Inserted ${result.affectedRows} rows into bus_data`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error populating bus_data:', err);
    process.exit(1);
  }
})();
