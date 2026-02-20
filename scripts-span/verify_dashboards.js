import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'datosinter',
    });
    const [rows] = await connection.query("SELECT DISTINCT link_identifier FROM spans");
    await connection.end();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dashboardsDir = path.resolve(__dirname, '../grafana/dashboards');
    const files = fs.readdirSync(dashboardsDir).filter(f => f.endsWith('.json'));

    const missing = [];
    
    for (const row of rows) {
      const link = row.link_identifier;
      const sanitized = link.replace(/[^a-zA-Z0-9_]/g, '_');
      const filename = `spans_${sanitized}.json`;
      if (!files.includes(filename)) {
        missing.push({ link, expected: filename });
      }
    }

    if (missing.length > 0) {
      console.log('Dashboards missing for the following links:');
      missing.forEach(m => console.log(`- ${m.link} -> ${m.expected}`));
      process.exit(1);
    } else {
      console.log('All dashboards are present.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error verifying dashboards:', err);
    process.exit(1);
  }
})();
