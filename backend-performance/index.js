const app = require('./src/app');
const { pool, waitForDB } = require('./src/config/db');
const { poolSpan, waitForSpanDB } = require('./src/config/db_span');
const { loadBusDataFromDB, loadEnlacesFromDB } = require('./src/state');
const { loadFirebaseBackup } = require('./lib/firebaseBackup');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
    try {
        console.log('🚀 Starting refactored performance-backend bootstrap...');

        // 1. Wait for DBs
        await waitForDB();
        await waitForSpanDB();

        // 2. Database schema & indexes preparation
        const { ensureBusDataIndexes, ensureTablesExist } = require('./src/services/dbInit');
        const { initSpansTable } = require('./src/routes/spans'); // We should export this
        await ensureTablesExist(pool);
        await ensureBusDataIndexes(pool);
        await initSpansTable();

        // 3. Load Firebase Backup (master config recovery)
        try {
            const backupMap = await loadFirebaseBackup(pool);
            console.log(`✅ Loaded Firebase backup entries: ${Object.keys(backupMap).length}`);
        } catch (err) {
            console.warn('⚠️ Firebase backup load failed, continuing anyway:', err.message);
        }

        // 3. Initial Cache Load
        const { loadSettingsFromDB } = require('./src/state');
        await loadSettingsFromDB();
        await loadBusDataFromDB();
        await loadEnlacesFromDB();

        // 4. Start NMS Background Worker (Autonomous Polling)
        const { startNmsWorker } = require('./src/services/nmsWorker');
        const { startTelegramBot } = require('./src/services/commandService');

        await startNmsWorker();
        await startTelegramBot();

        // 5. Start Server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Performance backend listening on 0.0.0.0:${PORT} (Modular Mode)`);
        });

    } catch (err) {
        console.error('❌ Failed to start performance-backend:', err);
        process.exit(1);
    }
}

bootstrap();
