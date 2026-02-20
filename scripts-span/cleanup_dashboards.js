import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

// Definir __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'datosinter',
  });

  // Obtener identificadores actuales
  const [rows] = await connection.query("SELECT DISTINCT link_identifier FROM spans");
  const uids = rows.map(row => {
    return `spans_${crypto.createHash('md5').update(row.link_identifier).digest('hex').slice(0, 8)}`;
  });

  const dashboardsDir = path.resolve(__dirname, '../grafana/dashboards');
  const files = fs.readdirSync(dashboardsDir).filter(f => f.endsWith('.json'));

  // Agrupar dashboards por UID (spans_<hash8>)
  const groups = {};
  for (const file of files) {
    const base = file.replace(/\.json$/, '');
    const match = base.match(/^(spans_[0-9a-f]{8})/);
    if (match) {
      const uid = match[1];
      (groups[uid] = groups[uid] || []).push(file);
    }
  }
  // Procesar grupos: borrar inactivos y duplicados
  for (const [uid, groupFiles] of Object.entries(groups)) {
    if (!uids.includes(uid)) {
      // UID inactivo: borrar todos los dashboards
      for (const f of groupFiles) {
        fs.unlinkSync(path.join(dashboardsDir, f));
        console.log(`Deleted inactive dashboard: ${f}`);
      }
    } else if (groupFiles.length > 1) {
      // Varios archivos para misma UID: mantener solo el detallado (con sufijo) o el primero
      const detailed = groupFiles.find(f => f.replace(/\.json$/, '').startsWith(uid + '_'));
      const toKeep = detailed || groupFiles[0];
      for (const f of groupFiles) {
        if (f !== toKeep) {
          fs.unlinkSync(path.join(dashboardsDir, f));
          console.log(`Deleted duplicate dashboard: ${f}`);
        }
      }
    }
  }

  await connection.end();
  console.log('Cleanup completed.');
})();
