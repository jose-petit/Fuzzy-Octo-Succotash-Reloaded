// Script CommonJS para actualizar min_span y max_span desde el CSV "depurado min max.csv"
// Ejecutar con: node scripts/update_thresholds.cjs

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  try {
    // Conexión a la base de datos MySQL usando .env
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306,
      multipleStatements: true
    });

    // Leer y parsear el CSV
    const csvPath = path.resolve(__dirname, '../depurado min max.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).slice(1); // saltar encabezado

    for (const row of lines) {
      if (!row.trim()) continue;
      const parts = row.split(';');
      if (parts.length < 6) continue;
      const link = parts[2].trim();
      const minv = parseFloat(parts[4].replace(',', '.'));
      const maxv = parseFloat(parts[5].replace(',', '.'));
      const [result] = await connection.execute(
        'UPDATE spans SET min_span = ?, max_span = ? WHERE link_identifier = ?',
        [minv, maxv, link]
      );
      // Si no se actualizó ningún registro, intentar coincidencia flexible
      if (result.affectedRows === 0) {
        const [rows] = await connection.execute(
          "SELECT id, link_identifier FROM spans WHERE REPLACE(LOWER(link_identifier), ' ', '') = ?",
          [link.replace(/\s+/g, '').toLowerCase()]
        );
        for (const r of rows) {
          await connection.execute(
            'UPDATE spans SET min_span = ?, max_span = ? WHERE id = ?',
            [minv, maxv, r.id]
          );
          console.log(`Enlace flexible: ${r.link_identifier} -> min_span=${minv}, max_span=${maxv}`);
        }
      } else {
        console.log(`Enlace: ${link} -> min_span=${minv}, max_span=${maxv}, affectedRows=${result.affectedRows}`);
      }
    }

    await connection.end();
    console.log('Actualización completada.');
  } catch (error) {
    console.error('Error en update_thresholds:', error);
    process.exit(1);
  }
})();
