const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3308,
    user: process.env.DB_USER || 'web_user',
    password: process.env.DB_PASSWORD || 'web_pass',
    database: process.env.DB_NAME || 'web_notifications',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    const [rows] = await pool.query('SELECT firebase_id, data FROM data_firebase');
    const mismatches = [];

    for (const row of rows) {
      let parsed;
      try {
        parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch {
        console.error(`Invalid JSON for ID ${row.firebase_id}`);
        continue;
      }
      const toCheck = [
        ['enlace1', parsed.enlace1],
        ['enlace2', parsed.enlace2],
      ];
      for (const [key, val] of toCheck) {
        if (val == null) {
          mismatches.push({ id: row.firebase_id, type: key, serial: val, reason: 'null' });
        } else {
          const [res] = await pool.query('SELECT COUNT(*) AS cnt FROM bus_data WHERE serial = ?', [
            val,
          ]);
          if (res[0].cnt === 0) {
            mismatches.push({ id: row.firebase_id, type: key, serial: val, reason: 'not_found' });
          }
        }
      }
    }

    if (mismatches.length === 0) {
      console.log('No mismatches found: all enlaces exist in bus_data.');
    } else {
      console.log('Mismatches found:');
      mismatches.forEach((m) => console.log(`ID=${m.id} ${m.type}='${m.serial}' (${m.reason})`));
    }
  } catch (err) {
    console.error('Error checking mismatches:', err);
  } finally {
    await pool.end();
  }
})();
