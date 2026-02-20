const { pool } = require('../config/db');
const { loadBusDataFromDB } = require('../state');

/**
 * Ingests raw pivoted records into the bus_data table.
 * @param {Array} registros - Array of pivoted record objects.
 */
async function ingestPivotedRecords(registros) {
    if (!Array.isArray(registros) || !registros.length) {
        throw new Error('registros vacío');
    }

    const rows = [];
    registros.forEach((r) => {
        // Standard Padtec cards usually have up to 20 metric slots (types/values)
        for (let i = 1; i <= 20; i++) {
            const tKey = `type${i}`;
            const vKey = `value${i}`;
            if (r[tKey] != null && r[vKey] != null) {
                rows.push([
                    r.bus || '',
                    r.card || '',
                    r.ne || '',
                    null, // slot
                    null, // position_rack
                    null, // sub_rack
                    null, // part
                    r.serial || '',
                    r[tKey],
                    Number(r[vKey]) || 0,
                    new Date(),
                ]);
            }
        }
    });

    console.log(`🔄 Ingestion Service: Flattening ${registros.length} pivoted records into ${rows.length} rows.`);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Nuclear option: clear current and insert fresh. 
        // This allows the "Live" system to always have the latest snapshot.
        await conn.query('TRUNCATE TABLE bus_data');
        if (rows.length) {
            await conn.query(
                'INSERT INTO bus_data (bus, card, ne, slot, position_rack, sub_rack, part, serial, type, value, collection_date) VALUES ?',
                [rows]
            );
        }
        await conn.commit();

        // Refresh memory cache for real-time /live endpoint
        await loadBusDataFromDB();

        return rows.length;
    } catch (err) {
        if (conn) await conn.rollback();
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = { ingestPivotedRecords };
