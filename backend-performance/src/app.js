const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { pool } = require('./config/db');
const { getBusData, getPivots, getEnlaces, setEnlaces, loadBusDataFromDB, loadEnlacesFromDB, getWorkerStatus } = require('./state');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(compression());

// Rutas modulares
app.use('/api/spans', require('./routes/spans').router);
app.use('/api/ingest', require('./routes/ingest'));

app.get('/api/nms-status', (req, res) => {
  res.json(getWorkerStatus());
});

app.get('/api/telegram-status', (req, res) => {
  res.json({
    configured: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
    bot_token_present: !!process.env.TELEGRAM_BOT_TOKEN,
    chat_id_present: !!process.env.TELEGRAM_CHAT_ID
  });
});

// Standard endpoints maintained for compatibility
app.get('/api/busdata', async (req, res) => {
  try {
    res.json({ busData: getBusData() });
  } catch (err) {
    console.error('Error fetching busData:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// GET Pivoted Performance Records (Real-time from Cache)
app.get('/api/performance/live', async (req, res) => {
  try {
    res.json({ status: 'ok', records: getPivots() });
  } catch (err) {
    console.error('Error in /api/performance/live:', err);
    res.status(500).json({ error: err.toString() });
  }
});

app.get('/api/enlaces', async (req, res) => {
  res.json({ enlaces: getEnlaces() });
});

app.post('/api/enlaces', (req, res) => {
  setEnlaces(req.body.enlaces || []);
  res.json({ status: 'ok' });
});

// Diagnostic endpoint
app.post('/api/debug/mismatches', async (req, res) => {
  try {
    const { makePivot, pickPeer } = require('./logic/lossCalculation');
    await loadBusDataFromDB();
    const enlacesToProcess = Array.isArray(req.body?.enlaces) ? req.body.enlaces : getEnlaces();
    const busData = getBusData();
    const pivots = makePivot(busData);
    const report = enlacesToProcess.map((en) => {
      const origin = pivots.find((p) => String(p.serial) === String(en.enlace1));
      if (!origin) return { enlace: en, status: 'originNotFound' };
      const targets = pivots.filter((p) => String(p.serial) === String(en.enlace2));
      const selected = pickPeer(targets, origin);
      const status = targets.length > 1 ? 'ambiguous' : 'ok';
      return { enlace: en, status, origin, selectedTarget: selected, candidates: targets.map((t) => ({ bus: t.bus, ne: t.ne, card: t.card })) };
    });
    res.json({ pivotsCount: pivots.length, enlacesCount: enlacesToProcess.length, report });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = app;
