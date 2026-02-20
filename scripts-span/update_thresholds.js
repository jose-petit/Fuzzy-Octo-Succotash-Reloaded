// Script para actualizar min_span y max_span desde el CSV "depurado min max.csv"
// Ubica este archivo en la raíz de tu proyecto y ejecuta: node scripts/update_thresholds.js

const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  try {
    // Conexión a la base de datos MySQL (ajusta 'localhost' si es necesario)
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'dwdmcisco1',
      password: 'dwdmspan1',
      database: 'datosinter',
      port: 3307
    });

    // Leer y parsear el CSV
    const csvPath = 'depurado min max.csv';
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).slice(1); // saltar encabezado

    for (const row of lines) {
      if (!row.trim()) continue;
      const parts = row.split(';');
      if (parts.length < 6) continue;
      const link = parts[2].trim();
      const minv = parseFloat(parts[4].replace(',', '.'));
      const maxv = parseFloat(parts[5].replace(',', '.'));
      // Ejecutar UPDATE por cada enlace
      const [result] = await connection.execute(
        'UPDATE spans SET min_span = ?, max_span = ? WHERE link_identifier = ?',
        [minv, maxv, link]
      );
      console.log(`Enlace: ${link} -> min_span=${minv}, max_span=${maxv}, affectedRows=${result.affectedRows}`);
    }

    await connection.end();
    console.log('Actualización completada.');
  } catch (error) {
    console.error('Error en update_thresholds:', error);
    process.exit(1);
  }
})();
