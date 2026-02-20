// Estado compartido en memoria
const { pool } = require('./config/db');

let busData = [];
let pivots = [];
let enlaces = [];
let lastValues = new Map(); // Simple cache to track previous samples
let dailyBaselines = new Map(); // Cache for min loss in last 12-24h
let acknowledgedDrifts = new Map(); // Track accepted loss levels: serial -> { loss: X, expires: timestamp }
let inhibitedLinks = new Set(); // Permanent inhibitions (DB-backed)
let queryAuthorizedChats = new Set(); // Chat IDs allowed to execute bot commands (can_query in DB)

const setBusData = (data) => {
  busData = data;
  try {
    const { makePivot } = require('./logic/lossCalculation');
    pivots = makePivot(data);
  } catch (err) {
    console.error('❌ Error pre-calculating pivots:', err);
  }
};

const getBusData = () => busData;
const getPivots = () => pivots;

const setEnlaces = (data) => {
  enlaces = data;
};

const getEnlaces = () => enlaces;

// Nueva función para recargar desde BD
const loadBusDataFromDB = async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM bus_data');
    setBusData(rows);
    console.log(`✅ Cache in-memory bus_data actualizado: ${rows.length} registros (${pivots.length} pivots)`);
  } catch (err) {
    console.error('❌ Error actualizando cache busData:', err);
  }
};

const loadEnlacesFromDB = async () => {
  try {
    const [rows] = await pool.query('SELECT data FROM data_firebase');
    const [aliasRows] = await pool.query('SELECT serial, alias FROM link_aliases');
    const aliasMap = new Map(aliasRows.map(a => [String(a.serial), a.alias]));

    const loaded = rows.map((r) => {
      try {
        const item = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        if (item) {
          const s1 = String(item.enlace1 || item.enlace);
          const s2 = String(item.enlace2 || '');

          // Persist node-level aliases
          item.alias1 = aliasMap.get(s1) || item.name1;
          item.alias2 = s2 ? (aliasMap.get(s2) || item.name2) : null;

          // Construct the combined link alias for display
          if (item.isSingle) {
            item.alias = item.alias1;
          } else {
            item.alias = `${item.alias1} - ${item.alias2 || 'Unidad B'}`;
          }
        }
        return item;
      } catch {
        return null;
      }
    }).filter(Boolean);
    setEnlaces(loaded);
    console.log(`✅ Cache in-memory enlaces actualizado: ${loaded.length} enlaces (con ${aliasRows.length} alias de nodos)`);
  } catch (err) {
    console.warn('⚠️ Could not load enlaces from data_firebase:', err.message);
  }
};

const loadSettingsFromDB = async () => {
  try {
    const [rows] = await pool.query('SELECT name, data FROM system_settings');
    const config = rows.reduce((acc, row) => ({ ...acc, [row.name]: row.data }), {});
    setSettings(config);
    console.log('✅ Cache in-memory system_settings actualizado.');
  } catch (err) {
    console.warn('⚠️ Could not load settings from system_settings table:', err.message);
  }
};

const loadDailyBaselines = async () => {
  try {
    const config = getSettings();
    const windowHours = Number(config.alert_drift_window_hours) || 12;

    const [rows] = await pool.query(`
      SELECT serial1, MIN(perdida) as min_loss 
      FROM spans 
      WHERE fecha_lote > DATE_SUB(NOW(), INTERVAL ? HOUR) 
      AND perdida > 0.5
      GROUP BY serial1
    `, [windowHours]);
    dailyBaselines.clear();
    rows.forEach(r => dailyBaselines.set(String(r.serial1), r.min_loss));
    console.log(`✅ Cache dailyBaselines actualizado: ${rows.length} registros (Ventana ${windowHours}h)`);
  } catch (err) {
    console.warn('⚠️ Could not load daily baselines:', err.message);
  }
};

const loadInhibitionsFromDB = async () => {
  try {
    const [rows] = await pool.query('SELECT serial1 FROM link_inhibitions');
    inhibitedLinks.clear();
    rows.forEach(r => inhibitedLinks.add(String(r.serial1)));
    console.log(`✅ Cache in-memory link_inhibitions actualizado: ${rows.length} registros`);
  } catch (err) {
    console.warn('⚠️ Could not load link inhibitions from DB:', err.message);
  }
};

const loadAcksFromDB = async () => {
  try {
    const [rows] = await pool.query('SELECT serial, loss, expires FROM link_acks WHERE expires > NOW()');
    acknowledgedDrifts.clear();
    rows.forEach(r => {
      acknowledgedDrifts.set(String(r.serial), {
        loss: r.loss,
        expires: new Date(r.expires).getTime()
      });
    });
    console.log(`✅ Cache in-memory acknowledgedDrifts actualizado: ${rows.length} registros`);
  } catch (err) {
    console.warn('⚠️ Could not load link acks from DB:', err.message);
  }
};
const loadAuthorizedChatsFromDB = async () => {
  try {
    const [rows] = await pool.query('SELECT chat_id FROM telegram_destinations'); // can_query might be missing, taking all for now or check cols
    queryAuthorizedChats.clear();
    rows.forEach(r => queryAuthorizedChats.add(String(r.chat_id)));
    console.log(`✅ Cache in-memory query_authorized_chats actualizado: ${rows.length} registros`);
  } catch (err) {
    console.warn('⚠️ Could not load query authorized chats from DB:', err.message);
  }
};

let workerStatus = {
  last_run: null,
  status: 'initializing',
  error: null
};

const setWorkerStatus = (status) => {
  workerStatus = { ...workerStatus, ...status };
};

const getWorkerStatus = () => workerStatus;

let settings = {};
const setSettings = (data) => { settings = data; };
const getSettings = () => settings;

module.exports = {
  getBusData,
  getPivots,
  setBusData,
  getEnlaces,
  setEnlaces,
  loadBusDataFromDB,
  loadEnlacesFromDB,
  loadSettingsFromDB,
  setWorkerStatus,
  getWorkerStatus,
  setSettings,
  getSettings,
  getLastValues: () => lastValues,
  loadDailyBaselines,
  getDailyBaselines: () => dailyBaselines,
  getAcknowledgedDrifts: () => acknowledgedDrifts,
  loadAcksFromDB,
  setAckDrift: async (serial, level) => {
    const expires = new Date(Date.now() + 86400000);
    acknowledgedDrifts.set(String(serial), {
      loss: level,
      expires: expires.getTime()
    });
    try {
      await pool.query('INSERT INTO link_acks (serial, loss, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE loss = VALUES(loss), expires = VALUES(expires)', [String(serial), level, expires]);
    } catch (e) {
      console.error('❌ Error persisting ACK to DB:', e.message);
    }
  },
  loadInhibitionsFromDB,
  isInhibited: (serial) => inhibitedLinks.has(String(serial)),
  loadAuthorizedChatsFromDB,
  isAuthorized: (chatId) => queryAuthorizedChats.has(String(chatId))
};
