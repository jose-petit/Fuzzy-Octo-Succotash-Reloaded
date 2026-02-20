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

  // Obtener todos los link_identifier en uso (historial)
  const [rows] = await connection.query("SELECT DISTINCT link_identifier FROM spans");
  const usedUids = rows.map(row => `spans_${crypto.createHash('md5').update(row.link_identifier).digest('hex').slice(0, 8)}`);

  // Directorio de dashboards
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

  // Eliminar solo dashboards duplicados cuyo UID esté en uso y no sea el principal
  for (const [uid, groupFiles] of Object.entries(groups)) {
    if (usedUids.includes(uid) && groupFiles.length > 1) {
      // Mantener solo el principal (spans_<uid>.json)
      for (const f of groupFiles) {
        if (f !== `${uid}.json`) {
          fs.unlinkSync(path.join(dashboardsDir, f));
          console.log(`Deleted duplicate dashboard: ${f}`);
        }
      }
    }
  }

  await connection.end();
  console.log('Safe cleanup completed.');
})();
