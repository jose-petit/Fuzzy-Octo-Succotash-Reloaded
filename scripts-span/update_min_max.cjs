const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuración de la base de datos (ajustar si es necesario)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const csvPath = path.resolve(__dirname, '../depurado min max.csv');
  const data = await fs.promises.readFile(csvPath, 'utf8');
  const lines = data.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('Codigo;'));

  let updated = 0;
  let notFound = [];
  // Obtener todos los enlaces actuales de la base de datos
  const [dbLinks] = await pool.query('SELECT id, link_identifier FROM spans');
  // Crear un mapa normalizado para búsqueda rápida y lista para coincidencias flexibles
  const dbArr = dbLinks.map(row => ({
    id: row.id,
    original: row.link_identifier,
    norm: row.link_identifier.replace(/\s|\-|\/|\(|\)|\.|,/g, '').toLowerCase()
  }));
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 7) continue;
    const enlace = parts[2].trim();
    let min = parts[4].replace(',', '.').trim();
    let max = parts[5].replace(',', '.').trim();
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    if (!enlace || isNaN(minVal) || isNaN(maxVal)) continue;
    const normEnlace = enlace.replace(/\s|\-|\/|\(|\)|\.|,/g, '').toLowerCase();
    // Buscar coincidencia flexible
    const dbMatch = dbArr.find(db => db.norm === normEnlace || db.norm.includes(normEnlace) || normEnlace.includes(db.norm));
    if (!dbMatch) {
      notFound.push(enlace);
      continue;
    }
    // Actualizar en la base de datos por id
    const [result] = await pool.query(
      'UPDATE spans SET min_span = ?, max_span = ? WHERE id = ?',
      [minVal, maxVal, dbMatch.id]
    );
    if (result.affectedRows > 0) updated++;
  }
  console.log(`Actualizados ${updated} enlaces con valores depurados de min y max.`);
  if (notFound.length > 0) {
    console.log('No se encontraron en la base de datos los siguientes enlaces:');
    notFound.forEach(e => console.log(e));
  }
  await pool.end();
}

main().catch(err => {
  console.error('Error actualizando min/max:', err);
  process.exit(1);
});
