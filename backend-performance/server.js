const express = require('express');
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
// MySQL client for persisting spans
const mysql = require('mysql2/promise');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Enable gzip compression for responses
app.use(compression());

// Load busData from MySQL table
let busData = [];
async function loadBusDataFromDB() {
  try {
    const [rows] = await pool.query(
      'SELECT bus, card, ne, slot, position_rack, sub_rack, part, serial, type, value, collection_date FROM bus_data'
    );
    busData = rows;
    console.log(`✅ Loaded busData records: ${busData.length}`);
  } catch (err) {
    console.error('❌ Error loading busData from DB:', err);
  }
}

// Ingest live registros (overwrite bus_data)
app.post('/api/ingest/registros', async (req, res) => {
  const registros = Array.isArray(req.body?.registros) ? req.body.registros : [];
  if (!registros.length) {
    return res.status(400).json({ status: 'error', error: 'registros vacío' });
  }
  // Expect each registro shaped like { bus, card, ne, serial, type1..5?, value1..5? }
  // We'll flatten into rows (one per type/value pair) matching bus_data schema.
  const rows = [];
  registros.forEach((r) => {
    for (let i = 1; i <= 10; i++) {
      // allow future expansion
      const tKey = `type${i}`;
      const vKey = `value${i}`;
      if (r[tKey] != null && r[vKey] != null) {
        rows.push([
          r.bus || '',
          r.card || '',
          r.ne || '',
          null, // slot unknown
          null, // position_rack unknown
          null, // sub_rack unknown
          null, // part unknown
          r.serial || '',
          r[tKey],
          Number(r[vKey]) || 0,
          new Date(), // collection_date now
        ]);
      }
    }
  });
  console.log(`🔄 Ingestando ${rows.length} filas derivadas de ${registros.length} registros`);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('TRUNCATE TABLE bus_data');
    if (rows.length) {
      await conn.query(
        'INSERT INTO bus_data (bus, card, ne, slot, position_rack, sub_rack, part, serial, type, value, collection_date) VALUES ?',
        [rows]
      );
    }
    await conn.commit();
    // Reload in-memory busData
    await loadBusDataFromDB();
    res.json({ status: 'ok', insertedTypes: rows.length });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error ingesting registros:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  } finally {
    conn.release();
  }
});
// Setup MySQL connection pool using env vars
const pool = mysql.createPool({
  // Default to external host on Windows Docker or local DB if set
  host: process.env.DB_HOST || 'host.docker.internal',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'performance',
  // Return DATETIME/TIMESTAMP as strings to avoid implicit UTC conversion
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Wait until MySQL is ready
async function waitForDB(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log('✅ MySQL is ready');
      return;
    } catch (err) {
      console.log(`⏳ Waiting for MySQL (${i + 1}/${retries})...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('Cannot connect to MySQL after multiple retries');
}

// Ensure spans table with proper schema exists
async function initSpansTable() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS spans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serial1 VARCHAR(255),
        serial2 VARCHAR(255),
        name1 VARCHAR(255),
        name2 VARCHAR(255),
        raman1 DOUBLE,
        raman2 DOUBLE,
        umbral DOUBLE,
        perdida DOUBLE,
        raman_offset1 DOUBLE,
        hoa_rx_gain1 DOUBLE,
        edfa_gain1 DOUBLE,
        raman_offset2 DOUBLE,
        hoa_rx_gain2 DOUBLE,
        edfa_gain2 DOUBLE,
        is_single BOOLEAN DEFAULT 0,
        line_initial1 DOUBLE,
        loss_reference DOUBLE,
        diff_line1 DOUBLE,
        diff_loss DOUBLE,
        fecha_lote DATETIME,
        details JSON
      )`
    );

    // Schema migration: Add missing columns if table already existed
    const [cols] = await pool.query('SHOW COLUMNS FROM spans');
    const existingCols = new Set(cols.map((c) => c.Field));
    const newCols = [
      ['raman_offset1', 'DOUBLE'],
      ['hoa_rx_gain1', 'DOUBLE'],
      ['edfa_gain1', 'DOUBLE'],
      ['raman_offset2', 'DOUBLE'],
      ['hoa_rx_gain2', 'DOUBLE'],
      ['edfa_gain2', 'DOUBLE'],
      ['is_single', 'BOOLEAN DEFAULT 0'],
      ['line_initial1', 'DOUBLE'],
      ['loss_reference', 'DOUBLE'],
      ['diff_line1', 'DOUBLE'],
      ['diff_loss', 'DOUBLE'],
    ];

    for (const [col, type] of newCols) {
      if (!existingCols.has(col)) {
        console.log(`🚀 Migrating table: Adding column ${col} to spans`);
        try {
          await pool.query(`ALTER TABLE spans ADD COLUMN ${col} ${type}`);
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.warn(`⚠️ Column ${col} already exists, skipping.`);
          } else {
            throw err;
          }
        }
      }
    }
    // Create index on fecha_lote if it doesn't exist (MySQL lacks IF NOT EXISTS for indexes)
    const [idxRows] = await pool.query(
      `SELECT COUNT(1) as cnt
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE table_schema = DATABASE()
         AND table_name = 'spans'
         AND index_name = 'idx_spans_fecha_lote'`
    );
    if (!idxRows[0] || Number(idxRows[0].cnt) === 0) {
      await pool.query('CREATE INDEX idx_spans_fecha_lote ON spans (fecha_lote)');
      console.log('✅ Created index idx_spans_fecha_lote');
    }
    console.log('✅ Spans table is ready');
  } catch (err) {
    console.error('❌ Error recreating spans table:', err);
    throw err;
  }
}

// Ensure bus_data has helpful indexes for lookups by serial/ne/card
async function ensureBusDataIndexes() {
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
        await pool.query(sql);
        console.log(`✅ Created index ${name}`);
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not ensure bus_data indexes:', err.toString());
  }
}

// Helper: makePivot
function makePivot(filtered) {
  const groups = {};
  filtered.forEach((rec) => {
    const key = `${rec.bus}|${rec.ne}|${rec.serial}`;
    if (!groups[key]) {
      groups[key] = { bus: rec.bus, ne: rec.ne, serial: rec.serial, entries: [] };
    }
    groups[key].entries.push(rec);
  });
  return Object.values(groups).map((grp) => {
    const obj = {
      bus: grp.entries[0].bus,
      card: grp.entries[0].card,
      ne: grp.ne,
      serial: grp.serial,
    };
    grp.entries.forEach((e, i) => {
      obj[`type${i + 1}`] = e.type;
      obj[`value${i + 1}`] = e.value;
    });
    return obj;
  });
}

// Helper to pick a peer by preference: same bus, then same NE, else first
function pickPeer(candidates, origin) {
  if (!candidates || !candidates.length) return null;
  return (
    candidates.find((c) => c.bus === origin.bus) ||
    candidates.find((c) => c.ne === origin.ne) ||
    candidates[0]
  );
}

// Helper: calculoPerdida
function calculoPerdida(rec, enlaces) {
  // Emulate /performance calculoPerdida logic: pick opposite amplifier prefix then sum |value3| + |peer.value5| + |raman1|
  if (!rec || !enlaces.length) return 0;
  const pivots = makePivot(busData);
  const enlace = enlaces.find((e) => Number(e.enlace1) === Number(rec.serial));
  if (!enlace) return 0;
  // Candidates by serial2 restricted to amplifiers
  let candidates = pivots.filter((p) => Number(p.serial) === Number(enlace.enlace2));
  candidates = candidates.filter((t) => isAmplifier(t.card));
  if (!candidates.length) return 0;
  const originPrefix = getCardPrefix(rec.card);
  const opposite = originPrefix === 'EOA2' ? 'HOA2' : originPrefix === 'HOA2' ? 'EOA2' : null;
  // Prefer opposite prefix; fallback first candidate
  const peer =
    (opposite && candidates.find((c) => getCardPrefix(c.card) === opposite)) || candidates[0];
  if (!peer) return 0;
  const v3 = Math.abs(Number(rec.value3) || 0);
  const v5 = Math.abs(Number(peer.value5) || 0);
  const r1 = Math.abs(Number(enlace.raman1) || 0);
  return Number((v3 + v5 + r1).toFixed(2));
}

// In-memory enlaces
let enlaces = [];

// Load enlaces from local data_firebase (MySQL backup of config)
async function loadEnlacesFromDB() {
  try {
    const [rows] = await pool.query('SELECT data FROM data_firebase');
    enlaces = rows.map((r) => {
      try {
        return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      } catch {
        return null;
      }
    }).filter(Boolean);
    console.log(`✅ Loaded ${enlaces.length} enlaces from data_firebase`);
  } catch (err) {
    console.warn('⚠️ Could not load enlaces from data_firebase (table might not exist yet)');
  }
}

app.get('/api/enlaces', async (req, res) => {
  await loadEnlacesFromDB();
  res.json({ enlaces });
});

app.post('/api/enlaces', (req, res) => {
  enlaces = req.body.enlaces || [];
  res.json({ status: 'ok' });
});

// GET persisted spans from database
app.get('/api/spans', async (req, res) => {
  try {
    const { desde, hasta, limit = 1500 } = req.query;
    await initSpansTable();

    let sql = 'SELECT * FROM spans';
    const params = [];

    if (desde || hasta) {
      sql += ' WHERE 1=1';
      if (desde) {
        sql += ' AND fecha_lote >= ?';
        params.push(desde);
      }
      if (hasta) {
        sql += ' AND fecha_lote <= ?';
        params.push(hasta);
      }
    }

    sql += ' ORDER BY fecha_lote DESC, id DESC';

    // Only apply limit if not filtering by large range or if explicitly requested
    if (limit) {
      sql += ' LIMIT ?';
      params.push(Number(limit));
    }

    const [rows] = await pool.query(sql, params);
    // Map JSON details to include name1 and name2 for frontend
    const spans = rows.map((r) => {
      const det = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
      return {
        id: r.id,
        serial1: r.serial1,
        serial2: r.serial2,
        name1: r.name1,
        name2: r.name2,
        raman1: r.raman1,
        raman2: r.raman2,
        umbral: r.umbral,
        perdida: r.perdida,
        raman_offset1: r.raman_offset1,
        hoa_rx_gain1: r.hoa_rx_gain1,
        edfa_gain1: r.edfa_gain1,
        raman_offset2: r.raman_offset2,
        hoa_rx_gain2: r.hoa_rx_gain2,
        edfa_gain2: r.edfa_gain2,
        is_single: r.is_single,
        line_initial1: r.line_initial1,
        loss_reference: r.loss_reference,
        diff_line1: r.diff_line1,
        diff_loss: r.diff_loss,
        fecha_lote: r.fecha_lote || null,
        details: det,
      };
    });
    res.json({ spans });
  } catch (err) {
    console.error('Error fetching spans:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  }
});

// GET spans in real-time (WITHOUT persisting to DB)
app.get('/api/spans/live', async (req, res) => {
  try {
    const pivots = makePivot(busData);
    const liveSpans = enlaces.map((en) => {
      const origin = pivots.find((p) => String(p.serial) === String(en.enlace1));
      if (!origin || !isAmplifier(origin.card)) return null;

      const targets = pivots.filter((p) => String(p.serial) === String(en.enlace2));
      const ampTargets = targets.filter((t) => isAmplifier(t.card));
      if (!ampTargets.length && !en.isSingle) return null;

      const originPrefix = getCardPrefix(origin.card);
      const opposite = originPrefix === 'EOA2' ? 'HOA2' : originPrefix === 'HOA2' ? 'EOA2' : null;
      const target = en.isSingle ? null : ((opposite && ampTargets.find((c) => getCardPrefix(c.card) === opposite)) || ampTargets[0]);

      // Simple calculation logic matching the persist one
      const getVal = (p, label) => {
        if (!p) return 0;
        for (let i = 1; i <= 10; i++) {
          if (p[`type${i}`] === label) return Number(p[`value${i}`]) || 0;
        }
        return 0;
      };

      const outLineA = getVal(origin, 'OUT Line Power');
      const inLineB = en.isSingle ? 0 : getVal(target, 'IN Line Power');
      const spanLoss = !en.isSingle && target ? outLineA - inLineB : 0;
      const raman1 = Number(en.raman1 || 0);
      const perdida = en.isSingle ? 0 : Math.max(0, spanLoss - raman1);

      return {
        serial1: en.enlace1,
        name1: en.name1,
        name2: en.isSingle ? 'STANDALONE' : en.name2,
        perdida: Number(perdida.toFixed(2)),
        umbral: en.umbral,
        fecha_lote: 'LIVE',
      };
    }).filter(Boolean);

    res.json({ spans: liveSpans });
  } catch (err) {
    console.error('Error in /api/spans/live:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  }
});

// DELETE spans by fecha_lote minute key (format: 'YYYY-MM-DD HH:mm') in America/Caracas timezone
app.delete('/api/spans/by-fecha', async (req, res) => {
  try {
    const { fechaKey } = req.query;
    if (!fechaKey || typeof fechaKey !== 'string') {
      return res
        .status(400)
        .json({ status: 'error', error: 'fechaKey requerido (YYYY-MM-DD HH:mm)' });
    }
    await initSpansTable();
    // fecha_lote stored as string in local time due to dateStrings; match up to minutes
    // Using LIKE to avoid timezone issues and seconds part differences
    const like = `${fechaKey}%`;
    const [result] = await pool.query('DELETE FROM spans WHERE fecha_lote LIKE ?', [like]);
    res.json({ status: 'ok', deleted: result.affectedRows || 0 });
  } catch (err) {
    console.error('Error deleting spans by fecha:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  }
});

// DELETE spans by multiple fecha_lote minute keys in one call
// Body: { fechaKeys: ['YYYY-MM-DD HH:mm', ...] }
app.delete('/api/spans/by-fechas', async (req, res) => {
  try {
    const fechaKeys = Array.isArray(req.body?.fechaKeys) ? req.body.fechaKeys.filter(Boolean) : [];
    if (!fechaKeys.length) {
      return res
        .status(400)
        .json({
          status: 'error',
          error: 'fechaKeys requerido (array de strings YYYY-MM-DD HH:mm)',
        });
    }
    await initSpansTable();
    const likes = fechaKeys.map((k) => `${k}%`);
    const where = fechaKeys.map(() => 'fecha_lote LIKE ?').join(' OR ');
    const sql = `DELETE FROM spans WHERE ${where}`;
    const [result] = await pool.query(sql, likes);
    res.json({ status: 'ok', deleted: result.affectedRows || 0, lotes: fechaKeys.length });
  } catch (err) {
    console.error('Error deleting spans by fechas:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  }
});

// Helper: detect card prefix and amplifier type
function getCardPrefix(card = '') {
  if (!card) return null;
  const c = String(card).toUpperCase();
  // Relaxed: accept EOA2/HOA2 with or without dash
  if (c.startsWith('EOA2')) return 'EOA2';
  if (c.startsWith('HOA2')) return 'HOA2';
  if (c.includes('FT-HB')) return 'FT-HB';
  if (c.startsWith('FAN')) return 'FAN';
  if (c.startsWith('OPS-')) return 'OPS-';
  if (c.includes('OPS')) return 'OPS';
  if (c.includes('TM800G')) return 'TM800G';
  return null;
}
function isAmplifier(card = '') {
  const p = getCardPrefix(card);
  return p === 'EOA2' || p === 'HOA2';
}

app.post('/api/spans/normalize', async (req, res) => {
  const { serial1, field, newValue } = req.body;
  if (!serial1 || !field || newValue === undefined) {
    return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
  }

  const numericVal = Number(newValue);
  console.log(`🚀 Normalizing history for ${serial1}: setting ${field} to ${numericVal}`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update master configuration in data_firebase
    // Find the record by parsing JSON in MySQL (or loop if needed, but searching JSON is faster)
    // For safety, we fetch, update locally, then save back.
    const [configRows] = await pool.query(
      'SELECT firebase_id, data FROM data_firebase'
    );

    let targetFirebaseId = null;
    let updatedData = null;

    for (const row of configRows) {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      if (String(data.enlace1) === String(serial1)) {
        targetFirebaseId = row.firebase_id;
        data[field] = numericVal;
        updatedData = data;
        break;
      }
    }

    if (targetFirebaseId && updatedData) {
      await conn.query(
        'UPDATE data_firebase SET data = ? WHERE firebase_id = ?',
        [JSON.stringify(updatedData), targetFirebaseId]
      );
      console.log(`✅ Updated master config for ${serial1} in data_firebase`);
    }

    // 2. Cascade Update to history (spans table)
    if (field === 'line_initial1') {
      // Recalculate diff_line1 = newValue - inLineA
      // Using JSON_EXTRACT to pull inLineA from details
      await conn.query(
        `UPDATE spans 
         SET line_initial1 = ?, 
             diff_line1 = ROUND(? - CAST(JSON_UNQUOTE(JSON_EXTRACT(details, '$.components.inLineA')) AS DOUBLE), 2)
         WHERE serial1 = ?`,
        [numericVal, numericVal, serial1]
      );
    } else if (field === 'loss_reference') {
      // Recalculate diff_loss = newValue + perdida
      await conn.query(
        `UPDATE spans 
         SET loss_reference = ?, 
             diff_loss = ROUND(? + perdida, 2)
         WHERE serial1 = ?`,
        [numericVal, numericVal, serial1]
      );
    }

    await conn.commit();
    // Refresh local cache
    await loadEnlacesFromDB();

    res.json({ status: 'ok', message: 'Normalización completada' });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error in normalization:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  } finally {
    conn.release();
  }
});

// GET spans calculados
app.post('/api/spans/persist', async (req, res) => {
  console.log('--- /api/spans/persist called ---');
  try {
    // Refresh configurations from DB
    await loadEnlacesFromDB();
    await loadBusDataFromDB();

    // Determine enlaces to process: prefer payload, else fallback to loaded enlaces
    const enlacesToProcess =
      Array.isArray(req.body.enlaces) && req.body.enlaces.length > 0 ? req.body.enlaces : enlaces;

    console.log('Enlaces to process length:', enlacesToProcess.length);
    console.log(`🔄 Refreshed busData before persist. Count: ${busData.length}`);

    console.log('--- Enlaces in memory length:', enlaces.length);
    // Ensure spans table exists before persisting
    await initSpansTable();
    // Use in-memory enlaces and busData to recalculate and persist spans
    // Filter only complete enlace entries
    const validEnlaces = enlacesToProcess.filter((e) => e.enlace1 != null && e.enlace2 != null);
    // Prepare pivots for matching using current busData
    const pivots = makePivot(busData);
    // Debug logs for enlace-pivote matching
    console.log('--- Debug /api/spans/persist ---');
    console.log(`Total busData records: ${busData.length}`);
    console.log('Pivots count:', pivots.length);
    console.log('Valid enlaces:', validEnlaces);
    // Build detailed span records including full origin and target data, track unmatched enlaces
    const spansToPersist = [];
    const unmatched = [];
    validEnlaces.forEach((en) => {
      console.log('Processing enlace:', en);
      const origin = pivots.find((p) => String(p.serial) === String(en.enlace1));
      if (!origin) {
        console.log(`Origin not found for enlace ${JSON.stringify(en)}`);
        unmatched.push({ enlace: en, reason: 'originNotFound' });
        return;
      }
      // Restrict to amplifier origin cards (EOA2/HOA2)
      if (!isAmplifier(origin.card)) {
        console.log(
          `Origin not amplifier for enlace ${JSON.stringify(en)} -> card: ${origin.card}`
        );
        unmatched.push({ enlace: en, reason: 'originNotAmplifier' });
        return;
      }
      console.log('Origin matched:', origin);
      const targets = pivots.filter((p) => String(p.serial) === String(en.enlace2));
      if (!targets.length) {
        console.log(`No targets for enlace ${JSON.stringify(en)}`);
        unmatched.push({ enlace: en, reason: 'noTargets' });
        return;
      }
      // Filter targets to amplifier cards only
      const ampTargets = targets.filter((t) => isAmplifier(t.card));
      if (!ampTargets.length) {
        console.log(`No amplifier targets for enlace ${JSON.stringify(en)}`);
        unmatched.push({ enlace: en, reason: 'noAmplifierTargets' });
        return;
      }
      // Emulate /performance selection: pick opposite amplifier prefix if available, else first
      const originPrefix = getCardPrefix(origin.card);
      const opposite = originPrefix === 'EOA2' ? 'HOA2' : originPrefix === 'HOA2' ? 'EOA2' : null;
      const target =
        (opposite && ampTargets.find((c) => getCardPrefix(c.card) === opposite)) || ampTargets[0];

      console.log('Selected target:', target, 'from', ampTargets.length, 'amplifier candidates');

      // Helper for type-safe value lookup within a pivot
      const getVal = (p, label) => {
        if (!p) return 0;
        for (let i = 1; i <= 10; i++) {
          if (p[`type${i}`] === label) return Number(p[`value${i}`]) || 0;
        }
        return 0;
      };

      // Node A - Metrics Audit
      const inLineA = getVal(origin, 'IN Line Power');
      const inDataA = getVal(origin, 'IN Data Power');
      const outDataA = getVal(origin, 'OUT Data Power');
      const outLineA = getVal(origin, 'OUT Line Power');

      // GAIN FORMULAS (Standardized with Performance Page)
      // Etapa 1 Gain = OUT Data - IN Line
      // Etapa 2 Gain = OUT Line - IN Data
      const g1_a = Number((outDataA - inLineA).toFixed(2));
      const g2_a = Number((outLineA - inDataA).toFixed(2));

      const r_offset1 = g1_a;
      const hoa_rx1 = g1_a;
      const edfa1 = g2_a;

      // Node B - Metrics Audit (if not single)
      let r_offset2 = 0,
        hoa_rx2 = 0,
        edfa2 = 0;
      let inLineB = 0,
        inDataB = 0,
        outDataB = 0,
        outLineB = 0;

      if (!en.isSingle && target) {
        inLineB = getVal(target, 'IN Line Power');
        inDataB = getVal(target, 'IN Data Power');
        outDataB = getVal(target, 'OUT Data Power');
        outLineB = getVal(target, 'OUT Line Power');

        const g1_b = Number((outDataB - inLineB).toFixed(2));
        const g2_b = Number((outLineB - inDataB).toFixed(2));

        r_offset2 = g1_b;
        hoa_rx2 = g1_b;
        edfa2 = g2_b;
      }

      // Calculate loss: Source.OUT Line - Target.IN Line - Raman
      // This matches the /performance logic exactly
      const spanLoss = !en.isSingle && target ? outLineA - inLineB : 0;
      const raman1 = Number(en.raman1 || 0);
      const perdida = en.isSingle ? 0 : Math.max(0, spanLoss - raman1);

      const d_line1 = Number((Number(en.line_initial1 || 0) - inLineA).toFixed(2));
      const d_loss = Number((Number(en.loss_reference || 0) + perdida).toFixed(2));

      console.log(`NMS Calcs [${en.name1}] -> G1:${g1_a} G2:${g2_a} Loss:${perdida.toFixed(2)}`);

      spansToPersist.push({
        serial1: en.enlace1,
        serial2: en.isSingle ? null : en.enlace2,
        name1: en.name1,
        name2: en.isSingle ? 'STANDALONE' : en.name2,
        raman1: Number(en.raman1 || 0),
        raman2: en.isSingle ? 0 : (Number(en.raman2) || 0),
        umbral: en.umbral,
        perdida: Number(perdida.toFixed(2)),
        raman_offset1: r_offset1,
        hoa_rx_gain1: hoa_rx1,
        edfa_gain1: edfa1,
        raman_offset2: r_offset2,
        hoa_rx_gain2: hoa_rx2,
        edfa_gain2: edfa2,
        is_single: en.isSingle ? 1 : 0,
        line_initial1: Number(en.line_initial1 || 0),
        loss_reference: Number(en.loss_reference || 0),
        diff_line1: d_line1,
        diff_loss: d_loss,
        details: {
          origin,
          target: en.isSingle ? null : target,
          candidatesCount: en.isSingle ? 0 : ampTargets.length,
          components: {
            inLineA,
            inDataA,
            outDataA,
            outLineA,
            inLineB,
            inDataB,
            outDataB,
            outLineB,
            raman1: Number(en.raman1 || 0)
          },
        },
      });
    });
    console.log('Unmatched enlaces count:', unmatched.length, unmatched);
    // Debug: log enlaces and spansToPersist
    console.log('Valid enlaces for persisting:', validEnlaces);
    console.log('Spans to persist:', JSON.stringify(spansToPersist, null, 2));
    // Persist spans: append new batch with common fecha_lote using bulk insert
    if (spansToPersist.length > 0) {
      // Format fecha_lote in America/Caracas local time to store as descriptive local batch time
      const formatCaracas = (date) => {
        // Formatea fecha en zona America/Caracas y corrige hora '24' a '00'
        const partsArr = new Intl.DateTimeFormat('es-VE', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).formatToParts(date);
        const parts = partsArr.reduce((acc, p) => {
          acc[p.type] = p.value;
          return acc;
        }, {});
        // Ajustar hora '24' a '00'
        if (parts.hour === '24') parts.hour = '00';
        return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
      };
      const fechaLoteStr = formatCaracas(new Date());
      const rows = spansToPersist.map((span) => [
        span.serial1,
        span.serial2,
        span.name1,
        span.name2,
        span.raman1,
        span.raman2,
        span.umbral,
        span.perdida,
        span.raman_offset1,
        span.hoa_rx_gain1,
        span.edfa_gain1,
        span.raman_offset2,
        span.hoa_rx_gain2,
        span.edfa_gain2,
        span.is_single,
        span.line_initial1,
        span.loss_reference,
        span.diff_line1,
        span.diff_loss,
        fechaLoteStr,
        JSON.stringify(span.details),
      ]);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          'INSERT INTO spans (serial1, serial2, name1, name2, raman1, raman2, umbral, perdida, raman_offset1, hoa_rx_gain1, edfa_gain1, raman_offset2, hoa_rx_gain2, edfa_gain2, is_single, line_initial1, loss_reference, diff_line1, diff_loss, fecha_lote, details) VALUES ?',
          [rows]
        );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }
    // Return count and spans data for frontend debugging
    res.json({ status: 'ok', count: spansToPersist.length, spans: spansToPersist, unmatched });
  } catch (err) {
    console.error('Error persisting spans:', err);
    res.status(500).json({ status: 'error', error: err.toString() });
  }
});

// GET busData endpoint
app.get('/api/busdata', async (req, res) => {
  try {
    await loadBusDataFromDB();
    res.json({ busData });
  } catch (err) {
    console.error('Error fetching busData:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// Diagnostic endpoint to list mismatches and full enlaces being processed
app.post('/api/debug/mismatches', async (req, res) => {
  try {
    // Refresh busData to ensure the diagnostic uses latest data
    await loadBusDataFromDB();
    const enlacesToProcess = Array.isArray(req.body?.enlaces) ? req.body.enlaces : enlaces;
    const pivots = makePivot(busData);
    const report = enlacesToProcess.map((en) => {
      const origin = pivots.find((p) => String(p.serial) === String(en.enlace1));
      if (!origin) return { enlace: en, status: 'originNotFound' };
      const targets = pivots.filter((p) => String(p.serial) === String(en.enlace2));
      if (!targets.length) return { enlace: en, status: 'noTargets' };
      const selected = pickPeer(targets, origin);
      const status = targets.length > 1 ? 'ambiguous' : 'ok';
      return {
        enlace: en,
        status,
        origin,
        selectedTarget: selected,
        candidates: targets.map((t) => ({ bus: t.bus, ne: t.ne, card: t.card })),
      };
    });
    res.json({ pivotsCount: pivots.length, enlacesCount: enlacesToProcess.length, report });
  } catch (err) {
    console.error('Error in /api/debug/mismatches:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// Startup initialization removed (duplicated with bootstrap)

// Load Firebase backup loader
const { loadFirebaseBackup } = require('./lib/firebaseBackup');

let firebaseBackupMap = {};
// Bootstrap app: wait for DB, load backup, init table, then start server
const PORT = process.env.PORT || 5000;
async function bootstrap() {
  try {
    await waitForDB();
    await ensureBusDataIndexes();
    firebaseBackupMap = await loadFirebaseBackup(pool);
    console.log(`✅ Loaded Firebase backup entries: ${Object.keys(firebaseBackupMap).length}`);
    await initSpansTable();
    await loadBusDataFromDB();
    await loadEnlacesFromDB();

    // Debug: Print registered routes
    const routes = app._router.stack
      .filter(r => r.route)
      .map(r => `${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
    console.log('✅ Registered Routes:', routes);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Performance backend listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start performance-backend:', err);
    process.exit(1);
  }
}
bootstrap();
