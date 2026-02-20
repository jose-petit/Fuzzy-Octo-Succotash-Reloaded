require('dotenv').config();
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const csvParser = require('csv-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const chokidar = require('chokidar');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
// Fallback REST fetch for Generative Language API
// AI service for analysis
const { analyzeWithPrompt } = require('./aiService');

// MySQL pool + init
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
const createTableSql = `
CREATE TABLE IF NOT EXISTS spans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  link_identifier VARCHAR(255) NOT NULL,
  source_node VARCHAR(255),
  dest_node VARCHAR(255),
  last_span DOUBLE,
  min_span DOUBLE,
  max_span DOUBLE,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  upload_batch_id VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
async function initDb() {
  await pool.query(createTableSql);
  console.log('Table spans ensured');
}

async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('Telegram notification skipped: Token or ChatID missing.');
    return;
  }
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Error sending Telegram alert:', error.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Setup file upload
const upload = multer({ dest: 'uploads/' });


// Actualizar thresholds min/max de un enlace (solo admin)
app.post('/update-threshold', async (req, res) => {
  try {
    const { link_identifier, min, max } = req.body;
    if (!link_identifier || isNaN(min) || isNaN(max)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    // Actualiza min_span y max_span para todos los registros de ese enlace
    await pool.query('UPDATE spans SET min_span = ?, max_span = ? WHERE link_identifier = ?', [min, max, link_identifier]);
    res.json({ message: 'Threshold actualizado para todos los registros del enlace' });
  } catch (error) {
    console.error('Error POST /update-threshold:', error);
    res.status(500).json({ error: 'Error al actualizar threshold' });
  }
});

// GET /spans with pagination
app.get('/spans', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const batch = req.query.batch;
    let total, rows;
    if (batch) {
      // Filter by batch
      const [countRows] = await pool.query('SELECT COUNT(*) as total FROM spans WHERE upload_batch_id = ?', [batch]);
      total = countRows[0].total;
      [rows] = await pool.query(
        'SELECT * FROM spans WHERE upload_batch_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
        [batch, limit, offset]
      );
    } else {
      const [countRows] = await pool.query('SELECT COUNT(*) as total FROM spans');
      total = countRows[0].total;
      [rows] = await pool.query(
        'SELECT * FROM spans ORDER BY id DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
    }
    // Reemplazar null por 0 en min_span y max_span para evitar errores en el frontend
    const safeRows = rows.map(row => ({
      ...row,
      min_span: row.min_span === null ? 0 : row.min_span,
      max_span: row.max_span === null ? 0 : row.max_span
    }));
    res.json({ data: safeRows, total, page, limit });
  } catch (error) {
    console.error('Error GET /spans:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /analyze using Gemini AI
app.post('/analyze', async (req, res) => {
  try {
    const { link_identifier } = req.body;
    // Obtener historial de los últimos 10 registros para este enlace
    const [historyRows] = await pool.query(
      'SELECT last_span, last_updated FROM spans WHERE link_identifier = ? ORDER BY last_updated DESC LIMIT 10',
      [link_identifier]
    );
    // Construir prompt con historial
    let prompt = `**Análisis de Enlace DWDM**\n- Identificador: ${link_identifier}\n`;
    if (Array.isArray(historyRows) && historyRows.length > 0) {
      prompt += '- Historial de atenuación (últimos registros):\n';
      historyRows.forEach(({ last_span, last_updated }) => {
        prompt += `  • ${last_updated}: ${last_span.toFixed(2)} dB\n`;
      });
    }
    console.log('AI Prompt:', prompt);
    console.log('Invoking aiService.analyzeWithPrompt...');
    const { analyzeWithPrompt } = require('./aiService');
    console.log('aiService.analyzeWithPrompt loaded:', typeof analyzeWithPrompt);
    const result = await analyzeWithPrompt(prompt);
    console.log('AI Result:', result);
    res.json({ result });
  } catch (error) {
    console.error('Error POST /analyze:', error);
    res.status(500).json({ error: error.message || 'Error con Gemini' });
  }
});

// POST /summary
app.post('/summary', async (req, res) => {
  try {
    const { links } = req.body;
    if (!links || !Array.isArray(links)) {
      return res.status(400).json({ error: 'Lista de enlaces inválida' });
    }

    // Agrupar estados
    let total = links.length;
    let criticos = 0, advertencias = 0, ok = 0;
    let detallesCriticos = [];

    links.forEach(l => {
      const isCrit = l.last_span >= l.max_span;
      const isWarn = !isCrit && l.last_span > (l.min_span + (l.max_span - l.min_span) * 0.75);
      if (isCrit) {
        criticos++;
        detallesCriticos.push(`${l.link_identifier}: ${l.last_span}dB (Max: ${l.max_span}dB)`);
      } else if (isWarn) {
        advertencias++;
      } else {
        ok++;
      }
    });

    const prompt = `Actúa como un experto en redes ópticas DWDM. Analiza el siguiente resumen de un lote de mediciones de atenuación (SPAN LOSS) de Cisco:
- Total Enlaces: ${total}
- Estado Crítico: ${criticos} (Superan el umbral máximo)
- Estado Advertencia: ${advertencias} (Cerca del umbral)
- Estado OK: ${ok}

Enlaces en estado CRÍTICO:
${detallesCriticos.join('\n')}

Genera un informe ejecutivo corto que incluya:
1. Resumen general de salud de la red.
2. Identificación de los peores tramos.
3. Recomendación de acciones preventivas o correctivas.
Responde en formato Markdown directo y profesional.`;

    const { analyzeWithPrompt } = require('./aiService');
    const result = await analyzeWithPrompt(prompt);
    res.json({ result });
  } catch (error) {
    console.error('Error POST /summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /clear: delete all spans
app.post('/clear', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM spans');
    res.json({ message: 'Historial borrado', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error POST /clear:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /batches: devuelve lista de IDs de lotes únicos (upload_batch_id)
app.get('/batches', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT upload_batch_id as batch FROM spans ORDER BY batch DESC'
    );
    const batches = rows.map(r => r.batch);
    res.json({ batches });
  } catch (error) {
    console.error('Error GET /batches:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /delete-lote
app.post('/delete-lote', async (req, res) => {
  try {
    const { upload_batch_id } = req.body;
    if (!upload_batch_id) return res.status(400).json({ error: 'ID de lote no proporcionado' });
    const [result] = await pool.query('DELETE FROM spans WHERE upload_batch_id = ?', [upload_batch_id]);
    res.json({ message: `Lote ${upload_batch_id} eliminado`, affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error POST /delete-lote:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /simulate: disparar alertas de prueba
app.post('/simulate', async (req, res) => {
  try {
    const { type } = req.body;
    let message = '';
    const now = new Date().toLocaleString('es-VE');

    switch (type) {
      case 'critical':
        message = `🔥 <b>SIMULACRO: ALERTA CRÍTICA</b>\n\n⚠️ Se ha detectado una atenuación crítica en el enlace principal.\n📶 Atn: <code>32.50 dB</code> (Umbral: 30.00)\n📍 Nodo: BARQUISIMETO-1\n📅 ${now}`;
        break;
      case 'warning':
        message = `⚠️ <b>SIMULACRO: ADVERTENCIA</b>\n\n⚡ Incremento de atenuación detectado en enlace secundario.\n📈 Variación: +1.8dB\n📍 Nodo: CARACAS-CENTRO\n📅 ${now}`;
        break;
      case 'recovery':
        message = `🟢 <b>SIMULACRO: RECUPERACIÓN</b>\n\n✅ Los niveles de atenuación han vuelto a la normalidad.\n📶 Atn actual: <code>24.10 dB</code>\n📍 Nodo: VALENCIA-NORTE\n📅 ${now}`;
        break;
      case 'maintenance':
        message = `🛠️ <b>SIMULACRO: MANTENIMIENTO</b>\n\n👷 Se inicia ventana de mantenimiento programada.\n🚧 Impacto esperado: Intermitencia de alarmas.\n📅 ${now}`;
        break;
      default:
        message = `🔔 <b>SIMULACRO: NOTIFICACIÓN GENERAL</b>\n\nPrueba del puente de notificaciones Span Cisco.\n📅 ${now}`;
    }

    await sendTelegramAlert(message);
    res.json({ status: 'ok', message: 'Simulacro enviado a Telegram' });
  } catch (error) {
    console.error('Error POST /simulate:', error);
    res.status(500).json({ error: 'Error al enviar simulacro' });
  }
});

// POST /upload: import CSV into spans table
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  let inserted = 0;
  let currentDate = null;
  let upload_batch_id = null;
  let alerts = [];
  try {
    // Leer thresholds existentes para preservar min_span y max_span
    const [thrRows] = await pool.query(
      'SELECT link_identifier, min_span, max_span FROM spans WHERE min_span IS NOT NULL AND max_span IS NOT NULL'
    );
    const thrMap = new Map(thrRows.map(r => [r.link_identifier, [r.min_span, r.max_span]]));

    // Obtener los valores de la última carga para detectar Rapid Increase
    const [lastRecords] = await pool.query(
      'SELECT link_identifier, last_span FROM spans WHERE id IN (SELECT MAX(id) FROM spans GROUP BY link_identifier)'
    );
    const lastMap = new Map(lastRecords.map(r => [r.link_identifier, r.last_span]));

    const data = await fs.promises.readFile(filePath, 'utf8');
    const lines = data.split(/\r?\n/);
    // Procesar el archivo por bloques, cada uno con su header Circuit y su fecha
    let section = null;
    let currentDate = null;
    let upload_batch_id = null;
    const batchSize = 500;
    let batchRows = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Detectar nueva cabecera de lote
      if (/^Circuit:/i.test(line)) {
        // Extraer fecha robustamente (acepta formatos DD/MM/YYYY, YYYY-MM-DD, 'Fri Jul 11 09:31:52 VET 2025', etc)
        let rawDate = line.split(',')[0].replace(/Circuit:/i, '').trim();
        rawDate = rawDate.replace(/\s*\(.+\)$/, '').trim();
        let parsedHeader = null;
        // 1. Intentar parsear formato tipo 'Fri Jul 11 09:31:52 VET 2025'
        const regexFuzzy = /^(?:[A-Za-z]{3}\s)?([A-Za-z]{3})\s(\d{1,2})\s(\d{2}):(\d{2}):(\d{2})\s(?:[A-Za-z]{3,}|GMT[\+\-]\d{4})\s(\d{4})$/;
        const matchFuzzy = rawDate.match(regexFuzzy);
        if (matchFuzzy) {
          const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
          const mm = String(months[matchFuzzy[1]]).padStart(2, '0');
          const dd = String(matchFuzzy[2]).padStart(2, '0');
          const hh = String(matchFuzzy[3]).padStart(2, '0');
          const min = String(matchFuzzy[4]).padStart(2, '0');
          const ss = String(matchFuzzy[5]).padStart(2, '0');
          const yyyy = matchFuzzy[6];
          parsedHeader = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`);
        }
        // 2. Intentar parsear como ISO
        if (!parsedHeader || isNaN(parsedHeader)) {
          parsedHeader = new Date(rawDate);
        }
        // 3. Probar DD/MM/YYYY
        if (isNaN(parsedHeader)) {
          const parts = rawDate.split(/[\/\-]/);
          if (parts.length >= 3) {
            let d = parts[0], m = parts[1], y = parts[2];
            if (y.length === 2) y = '20' + y;
            parsedHeader = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
          }
        }
        // 4. Probar MM/DD/YYYY
        if (isNaN(parsedHeader)) {
          const parts = rawDate.split(/[\/\-]/);
          if (parts.length >= 3) {
            let m = parts[0], d = parts[1], y = parts[2];
            if (y.length === 2) y = '20' + y;
            parsedHeader = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
          }
        }
        if (!parsedHeader || isNaN(parsedHeader)) {
          // Si sigue fallando, usar fecha actual y loguear advertencia
          parsedHeader = new Date();
          console.warn('No se pudo parsear la fecha del header Circuit, se usará la fecha actual. Línea:', line);
        }
        // Guardar en formato ISO con zona horaria -04:00 (Venezuela)
        const yyyy = parsedHeader.getFullYear();
        const mm = String(parsedHeader.getMonth() + 1).padStart(2, '0');
        const dd = String(parsedHeader.getDate()).padStart(2, '0');
        const hh = String(parsedHeader.getHours()).padStart(2, '0');
        const min = String(parsedHeader.getMinutes()).padStart(2, '0');
        const ss = String(parsedHeader.getSeconds()).padStart(2, '0');
        // Construir string ISO con offset -04:00
        const isoVenezuela = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-04:00`;
        currentDate = isoVenezuela;
        upload_batch_id = isoVenezuela;
        section = null;
        continue;
      }
      if (/^Optical Link\s*,\s*Span Loss/i.test(line)) { section = 'span_loss'; continue; }
      if (!section) continue;
      if (/^Optical Link|^Span Loss|^Circuit:/i.test(line)) continue;
      if (section === 'span_loss') {
        const parts = line.split(/,\s*/);
        if (parts.length < 2) continue;
        const enlace = parts[0].trim();
        const spanLoss = parseFloat(parts[1]);
        if (!enlace || isNaN(spanLoss)) continue;
        const [source_node, dest_node] = enlace.includes('->') ? enlace.split('->').map(s => s.trim()) : ['', ''];
        // Usar thresholds previos si existen
        const [oldMin, oldMax] = thrMap.get(enlace) || [null, null];
        batchRows.push([
          enlace,
          source_node,
          dest_node,
          spanLoss,
          oldMin,
          oldMax,
          upload_batch_id,
          upload_batch_id // last_updated igual a la fecha del header/lote
        ]);

        // Smart Alert Detection
        const prevSpan = lastMap.get(enlace);
        if (oldMax && spanLoss > oldMax) {
          alerts.push(`🔥 <b>CRÍTICO (Cisco):</b> ${enlace}\n📶 Atn: <code>${spanLoss.toFixed(2)} dB</code> (Max: ${oldMax})\n📅 ${upload_batch_id}`);
        } else if (prevSpan !== undefined && (spanLoss - prevSpan) > 1.5) {
          alerts.push(`⚡ <b>Incremento Súbito (Cisco):</b> ${enlace}\n📈 <code>${prevSpan.toFixed(2)}</code> ➡️ <code>${spanLoss.toFixed(2)}</code> (+${(spanLoss - prevSpan).toFixed(2)} dB)`);
        }

        if (batchRows.length >= batchSize) {
          const sql = 'INSERT INTO spans (link_identifier, source_node, dest_node, last_span, min_span, max_span, upload_batch_id, last_updated) VALUES ? ON DUPLICATE KEY UPDATE last_span = VALUES(last_span), upload_batch_id = VALUES(upload_batch_id), last_updated = VALUES(last_updated)';
          await pool.query(sql, [batchRows]);
          inserted += batchRows.length;
          batchRows = [];
        }
      }
    }
    if (batchRows.length > 0) {
      const sql = 'INSERT INTO spans (link_identifier, source_node, dest_node, last_span, min_span, max_span, upload_batch_id, last_updated) VALUES ? ON DUPLICATE KEY UPDATE last_span = VALUES(last_span), upload_batch_id = VALUES(upload_batch_id), last_updated = VALUES(last_updated)';
      await pool.query(sql, [batchRows]);
      inserted += batchRows.length;
    }

    // Enviar alertas si se detectaron anomalías
    if (alerts.length > 0) {
      const summary = `<b>⚠️ Alertas Cisco Span (${alerts.length})</b>\n\n` +
        alerts.slice(0, 8).join('\n──────────────────\n') +
        (alerts.length > 8 ? `\n\n<i>...y ${alerts.length - 8} alertas más en este lote.</i>` : '');
      await sendTelegramAlert(summary);
    }

    res.json({ message: 'Archivo procesado', rows: inserted, upload_batch_id });
    fs.unlink(filePath, () => { });
  } catch (err) {
    console.error('Error POST /upload:', err);
    res.status(500).json({ error: err.message });
    fs.unlink(filePath, () => { });
  }
});

// GET /batches: distinct upload_batch_id values
app.get('/batches', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT upload_batch_id FROM spans WHERE upload_batch_id IS NOT NULL ORDER BY upload_batch_id DESC'
    );
    const batches = rows.map(r => r.upload_batch_id);
    res.json({ batches });
  } catch (error) {
    console.error('Error GET /batches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert unique-spans route after spans pagination
app.get('/unique-spans', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM spans WHERE id IN (SELECT MAX(id) FROM spans GROUP BY link_identifier)'
    );
    // Replace null thresholds with 0 for consistent frontend handling
    const safeRows = rows.map(row => ({
      ...row,
      min_span: row.min_span == null ? 0 : row.min_span,
      max_span: row.max_span == null ? 0 : row.max_span
    }));
    res.json({ data: safeRows });
  } catch (error) {
    console.error('Error GET /unique-spans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para subir CSV manualmente via navegador
app.get('/upload-file', (req, res) => {
  res.send(`<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Manual CSV Upload</title>
    </head>
    <body>
      <h1>Manual CSV Upload</h1>
      <form method="post" action="/upload" enctype="multipart/form-data">
        <input type="file" name="file" accept=".csv" required />
        <button type="submit">Upload CSV</button>
      </form>
    </body>
  </html>
  `);
});

// Start server after DB init with retry logic
const PORT = process.env.PORT || 3001;
const sleep = ms => new Promise(res => setTimeout(res, ms));
async function initAndStart() {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await initDb();
      console.log('Database initialized');
      app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
        // Configurar watcher para subida automática de CSV
        // Watch folder dentro de contenedor
        const watchDir = path.resolve(__dirname, 'csv-drop');
        fs.mkdirSync(watchDir, { recursive: true });
        // Helper para borrar CSV con reintentos
        const deleteWithRetry = (filePath, attempts = 5, delay = 2000) => {
          fs.unlink(filePath, err => {
            if (!err) {
              console.log(`Deleted CSV file: ${filePath}`);
            } else if (attempts > 0) {
              console.warn(`Failed to delete ${filePath}, retrying in ${delay}ms. Attempts left: ${attempts}`);
              setTimeout(() => deleteWithRetry(filePath, attempts - 1, delay), delay);
            } else {
              console.error(`Could not delete CSV file after retries: ${filePath}`, err);
            }
          });
        };
        const watcher = chokidar.watch(watchDir, {
          persistent: true,
          ignoreInitial: true,
          usePolling: true,
          interval: 10000, // Poll every 10 seconds
          awaitWriteFinish: {
            stabilityThreshold: 30000,  // wait 30s of no changes
            pollInterval: 1000
          }
        });
        watcher.on('add', filePath => {
          if (path.extname(filePath).toLowerCase() === '.csv') {
            console.log(`Detected CSV file for automatic upload: ${filePath}`);
            // Leer el archivo y enviarlo
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));

            axios.post(`http://localhost:${PORT}/upload`, formData, {
              headers: {
                ...formData.getHeaders()
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            })
              .then(response => {
                console.log('Automatic upload successful:', response.data);
              })
              .catch(error => {
                console.error('Automatic upload failed:', error.message);
              })
              .finally(() => {
                // Borrar archivo SIEMPRE, haya funcionado o no, para no procesarlo de nuevo
                deleteWithRetry(filePath);
              });
          }
        });

        // Periodic cleanup of csv-drop folder every hour
        setInterval(() => {
          fs.readdir(watchDir, (err, files) => {
            if (err) {
              console.error('Error reading csv-drop for hourly cleanup:', err);
              return;
            }
            files.filter(file => path.extname(file).toLowerCase() === '.csv')
              .forEach(file => deleteWithRetry(path.join(watchDir, file)));
          });
        }, 60 * 60 * 1000);
      });
      return;
    } catch (err) {
      console.error(`DB init attempt ${attempt} failed:`, err.message);
      if (attempt < maxAttempts) {
        await sleep(2000);
      } else {
        console.error('Max DB init attempts reached. Exiting.');
        process.exit(1);
      }
    }
  }
}
// Kick off init and server start
initAndStart();

