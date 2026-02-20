require('dotenv').config({ path: '../.env' }); // Load from parent root
const app = require('./src/app');
const { waitForDB } = require('./src/config/db');
const { pool } = require('./src/config/db');
const { setBusData } = require('./src/state');
const { loadFirebaseBackup } = require('./lib/firebaseBackup');

const PORT = process.env.PORT || 5000;

// Inicialización
(async () => {
  try {
    await waitForDB();

    // Cargar backup firebase si es necesario (mantengo lógica legacy por si acaso)
    try {
      const firebaseBackupMap = await loadFirebaseBackup(pool);
      console.log(`✅ Loaded Firebase backup entries: ${Object.keys(firebaseBackupMap).length}`);
    } catch (e) {
      console.warn('⚠️ Firebase backup load skipped or failed', e.message);
    }

    // Cargar busData inicial
    try {
      const [rows] = await pool.query(
        'SELECT bus, card, ne, slot, position_rack, sub_rack, part, serial, type, value, collection_date FROM bus_data'
      );
      setBusData(rows);
      console.log(`✅ Loaded initial busData records: ${rows.length}`);
    } catch (e) {
      console.error('❌ Failed to load initial busData', e);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Performance backend (Refactored) listening on port ${PORT}`);
    });
  } catch (e) {
    console.error('Startup initialization error:', e);
    process.exit(1);
  }
})();
