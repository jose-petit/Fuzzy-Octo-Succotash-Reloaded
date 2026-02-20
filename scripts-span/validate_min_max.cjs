const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  try {
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

    let total = 0, correct = 0, incorrect = 0;
    for (const row of lines) {
      if (!row.trim()) continue;
      const parts = row.split(';');
      if (parts.length < 6) continue;
      const link = parts[2].trim();
      const minv = parseFloat(parts[4].replace(',', '.'));
      const maxv = parseFloat(parts[5].replace(',', '.'));
      const normLink = link.replace(/\s|\-|\/|\(|\)|\.|,/g, '').toLowerCase();
      const [rows] = await connection.execute(
        `SELECT link_identifier, min_span, max_span FROM spans WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(link_identifier), ' ', ''), '-', ''), '/', ''), '(', ''), ')', ''), '.', ''), ',', ''), ';', '') = ?`,
        [normLink]
      );
      total += rows.length;
      if (rows.length === 0) {
        incorrect++;
        console.log(`Enlace: ${link} - min/max esperado: ${minv}/${maxv} - min/max actual: NO ENCONTRADO`);
      }
      for (const r of rows) {
        if (r.min_span == minv && r.max_span == maxv) {
          correct++;
        } else {
          incorrect++;
          console.log(`Enlace: ${r.link_identifier} - min/max esperado: ${minv}/${maxv} - min/max actual: ${r.min_span}/${r.max_span}`);
        }
      }
    }
    console.log(`Validación completada. Total: ${total}, Correctos: ${correct}, Incorrectos: ${incorrect}`);
    await connection.end();
  } catch (error) {
    console.error('Error en validación:', error);
    process.exit(1);
  }
})();
