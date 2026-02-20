const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',       // servicio DB en docker-compose
      user: process.env.DB_USER || 'dwdmcisco1',
      password: process.env.DB_PASSWORD || 'dwdmspan1',
      database: process.env.DB_NAME || 'datosinter',
      port: process.env.DB_PORT || 3306,        // puerto interno de MySQL
      multipleStatements: true
    });

    // Leer y parsear el CSV
    // Ruta al CSV en tmp montado en el contenedor
    const csvPath = path.resolve(__dirname, '../tmp/depurado min max.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).slice(1); // saltar encabezado

    let total = 0, updated = 0, notFound = [], outOfRange = [];
    // Rango razonable para DOUBLE (ajustable si se requiere)
    const MIN_VAL = -1e6, MAX_VAL = 1e6;
    for (const row of lines) {
      if (!row.trim()) continue;
      const parts = row.split(';');
      if (parts.length < 6) continue;
      const link = parts[2].trim();
      const minv = parseFloat(parts[4].replace(',', '.'));
      const maxv = parseFloat(parts[5].replace(',', '.'));
      // Validar valores numéricos y dentro de rango
      if (isNaN(minv) || isNaN(maxv) || minv < MIN_VAL || minv > MAX_VAL || maxv < MIN_VAL || maxv > MAX_VAL) {
        outOfRange.push({ link, minv, maxv });
        total++;
        continue;
      }
      // Coincidencia flexible: ignora espacios, guiones, barras, paréntesis, puntos y comas
      const normLink = link.replace(/\s|\-|\/|\(|\)|\.|,/g, '').toLowerCase();
      // UPDATE masivo usando LIKE y REPLACE para normalizar en SQL
      const [result] = await connection.execute(
        `UPDATE spans SET min_span = ?, max_span = ? WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(link_identifier), ' ', ''), '-', ''), '/', ''), '(', ''), ')', ''), '.', ''), ',', ''), ';', '') = ?`,
        [minv, maxv, normLink]
      );
      if (result.affectedRows > 0) {
        console.log(`Actualizado: ${link} -> min: ${minv}, max: ${maxv} (${result.affectedRows} registros)`);
        updated += result.affectedRows;
      } else {
        notFound.push(link);
      }
      total++;
    }
    console.log(`Actualización completada. Total enlaces CSV: ${total}, registros actualizados: ${updated}, no encontrados: ${notFound.length}, valores fuera de rango: ${outOfRange.length}`);
    if (notFound.length > 0) {
      console.log('Enlaces no encontrados:');
      notFound.forEach(e => console.log(e));
    }
    if (outOfRange.length > 0) {
      console.log('Enlaces con valores fuera de rango o inválidos:');
      outOfRange.forEach(e => console.log(`${e.link} (min: ${e.minv}, max: ${e.maxv})`));
    }
    await connection.end();
  } catch (error) {
    console.error('Error en update_thresholds_all:', error);
    process.exit(1);
  }
})();
