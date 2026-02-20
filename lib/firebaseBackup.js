/* eslint-disable no-console */
let defaultDb;
try {
  defaultDb = require('../config/db');
} catch (e) {
  // Ignorar error si no encuentra el archivo inmediatamente
}

/**
 * Load Firebase backup data from MySQL into a map.
 * Returns an object where keys are firebase_id and values are the parsed JSON data.
 * @param {Object} [dbConnection] - Optional database connection/pool to use.
 */
async function loadFirebaseBackup(dbConnection) {
  // Prefer injected connection
  let conn = dbConnection;

  // Fallback to imported defaults
  if (!conn && defaultDb) {
    conn = defaultDb.connection || defaultDb.pool;
  }

  if (!conn) {
    throw new Error(
      'No database connection provider found in loadFirebaseBackup. Please pass a pool or connection.'
    );
  }

  // Execute query safely handling different return types (mysql vs mysql2/promise)
  const qReturn = await conn.query('SELECT firebase_id, data FROM data_firebase');

  // mysql2/promise returns [rows, fields]. Standard mysql returns rows (with callback, but if promisified...)
  // Assuming mysql2/promise here based on project usage.
  const rows =
    Array.isArray(qReturn) && qReturn[0] && Array.isArray(qReturn[0]) ? qReturn[0] : qReturn;

  const backupMap = {};
  if (Array.isArray(rows)) {
    rows.forEach(({ firebase_id, data }) => {
      let parsed;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        parsed = data;
        console.warn(`Failed to parse JSON for ${firebase_id}:`, e);
      }
      backupMap[firebase_id] = parsed;
    });
  }
  return backupMap;
}

module.exports = { loadFirebaseBackup };
