const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuración de la base de datos (ajustar si es necesario)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',  // servicio DB en Compose
    user: process.env.DB_USER || 'dwdmcisco1',
    password: process.env.DB_PASSWORD || 'dwdmspan1',
    database: process.env.DB_NAME || 'datosinter',
    port: process.env.DB_PORT || 3306,  // puerto interno
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Ruta ajustada al directorio tmp montado en Docker
  const csvPath = path.resolve(__dirname, '../tmp/depurado min max.csv');
  const data = await fs.promises.readFile(csvPath, 'utf8');
  const lines = data.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('Codigo;'));

  let updated = 0;
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 7) continue;
    const enlace = parts[2].trim();
    let min = parts[4].replace(',', '.').trim();
    let max = parts[5].replace(',', '.').trim();
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    if (!enlace || isNaN(minVal) || isNaN(maxVal)) continue;
    // Actualizar en la base de datos
    const [result] = await pool.query(
      'UPDATE spans SET min_span = ?, max_span = ? WHERE link_identifier = ?',
      [minVal, maxVal, enlace]
    );
    if (result.affectedRows > 0) updated++;
  }
  console.log(`Actualizados ${updated} enlaces con valores depurados de min y max.`);
  await pool.end();
}

main().catch(err => {
  console.error('Error actualizando min/max:', err);
  process.exit(1);
});
