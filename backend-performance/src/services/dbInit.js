async function ensureBusDataIndexes(pool) {
    try {
        const [idxs] = await pool.query(
            `SELECT index_name FROM INFORMATION_SCHEMA.STATISTICS
       WHERE table_schema = DATABASE() AND table_name = 'bus_data'`
        );
        const existing = new Set(idxs.map((r) => r.index_name));
        const want = [
            ['idx_busdata_serial', 'CREATE INDEX idx_busdata_serial ON bus_data (serial)'],
            ['idx_busdata_ne', 'CREATE INDEX idx_busdata_ne ON bus_data (ne)'],
            ['idx_busdata_card', 'CREATE INDEX idx_busdata_card ON bus_data (card)'],
        ];
        for (const [name, sql] of want) {
            if (!existing.has(name)) {
                console.log(`🚀 Creating index ${name} for optimization...`);
                await pool.query(sql);
                console.log(`✅ Created index ${name}`);
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not ensure bus_data indexes:', err.toString());
    }
}

async function ensureTablesExist(pool) {
    try {
        console.log('🚀 Ensuring base tables exist...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS link_inhibitions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                serial1 VARCHAR(100) NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS link_acks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                serial VARCHAR(100) NOT NULL UNIQUE,
                loss DOUBLE NOT NULL,
                expires DATETIME NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Base tables verified.');
    } catch (err) {
        console.warn('⚠️ Could not ensure base tables:', err.toString());
    }
}

module.exports = { ensureBusDataIndexes, ensureTablesExist };
