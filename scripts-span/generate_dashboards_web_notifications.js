import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';

const PADTEC_FOLDER = path.resolve(process.cwd(), 'grafana/dashboards/padtec');
const DS_NAME = 'Web Notifications DB';

function uidFor(serial1, serial2) {
  const key = `${serial1}|${serial2}`;
  return `wn_${crypto.createHash('md5').update(key).digest('hex').slice(0, 8)}`;
}

function panelTimeseries(sql, refId, title, gridPos) {
  return {
    type: 'timeseries',
    title,
    datasource: DS_NAME,
    targets: [{ refId, format: 'time_series', rawSql: sql }],
    fieldConfig: { defaults: {}, overrides: [] },
    options: {},
    gridPos,
  };
}

function panelStat(sql, refId, title, gridPos, thresholds) {
  return {
    type: 'stat',
    title,
    datasource: DS_NAME,
    targets: [{ refId, format: 'table', rawSql: sql }],
    fieldConfig: {
      defaults: thresholds ? { color: { mode: 'thresholds' }, thresholds } : {},
      overrides: [],
    },
    options: { reduceOptions: { calcs: ['lastNotNull'] } },
    gridPos,
  };
}

async function main() {
  if (!fs.existsSync(PADTEC_FOLDER)) fs.mkdirSync(PADTEC_FOLDER, { recursive: true });

  const conn = await mysql.createConnection({
    host: process.env.WN_DB_HOST || '10.4.4.124',
    port: Number(process.env.WN_DB_PORT || 3308),
    user: process.env.WN_DB_USER || 'grafana_wn',
    password: process.env.WN_DB_PASSWORD || 'CambiaEstaClaveSegura!',
    database: process.env.WN_DB_NAME || 'web_notifications',
  });

  const [links] = await conn.query(
    `SELECT serial1, serial2, MAX(name1) AS name1, MAX(name2) AS name2
     FROM spans
     GROUP BY serial1, serial2`
  );

  const dashboards = [];

  for (const row of links) {
    const { serial1, serial2 } = row;
    const name1 = row.name1 || String(serial1);
    const name2 = row.name2 || String(serial2);
    const uid = uidFor(serial1, serial2);
    const title = `${name1} -> ${name2}`;

    const s1 = String(serial1).replace(/'/g, "''");
    const s2 = String(serial2).replace(/'/g, "''");

    const dash = {
      id: null,
      uid,
      title: `Padtec - ${title}`,
      time: { from: 'now-90d', to: 'now' },
      timezone: 'browser',
      schemaVersion: 36,
      version: 0,
      refresh: '30s',
      panels: [
        panelStat(
          `SELECT perdida FROM spans WHERE serial1='${s1}' AND serial2='${s2}' ORDER BY fecha_lote DESC, id DESC LIMIT 1`,
          'A', 'Último valor (perdida)', { x: 0, y: 0, w: 6, h: 4 },
          {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: 20 },
              { color: 'red', value: 30 },
            ],
          }
        ),
        panelStat(
          `SELECT (perdida - umbral) AS delta FROM spans WHERE serial1='${s1}' AND serial2='${s2}' ORDER BY fecha_lote DESC, id DESC LIMIT 1`,
          'B', 'Delta vs Umbral', { x: 6, y: 0, w: 6, h: 4 },
          {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'red', value: 0 },
            ],
          }
        ),
        panelStat(
          `SELECT MIN(perdida) AS min_span FROM spans WHERE $__timeFilter(fecha_lote) AND serial1='${s1}' AND serial2='${s2}'`,
          'C', 'Mínimo', { x: 12, y: 0, w: 4, h: 4 }
        ),
        panelStat(
          `SELECT MAX(perdida) AS max_span FROM spans WHERE $__timeFilter(fecha_lote) AND serial1='${s1}' AND serial2='${s2}'`,
          'D', 'Máximo', { x: 16, y: 0, w: 4, h: 4 }
        ),
        panelStat(
          `SELECT AVG(perdida) AS avg_span FROM spans WHERE $__timeFilter(fecha_lote) AND serial1='${s1}' AND serial2='${s2}'`,
          'E', 'Promedio', { x: 20, y: 0, w: 4, h: 4 }
        ),
        panelTimeseries(
          `SELECT $__timeGroup(fecha_lote, $__interval) AS time, AVG(perdida) AS perdida_avg
           FROM spans
           WHERE $__timeFilter(fecha_lote) AND serial1='${s1}' AND serial2='${s2}'
           GROUP BY 1 ORDER BY 1`,
          'F', 'Tendencia de Pérdida (AVG)', { x: 0, y: 4, w: 24, h: 8 }
        ),
        panelTimeseries(
          `SELECT $__timeGroup(fecha_lote, $__interval) AS time,
                  AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(details,'$.components.v3')) AS DECIMAL(10,2))) AS v3,
                  AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(details,'$.components.v5')) AS DECIMAL(10,2))) AS v5,
                  AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(details,'$.components.r1')) AS DECIMAL(10,2))) AS r1
           FROM spans
           WHERE $__timeFilter(fecha_lote) AND serial1='${s1}' AND serial2='${s2}'
           GROUP BY 1 ORDER BY 1`,
          'G', 'Componentes (v3, v5, r1)', { x: 0, y: 12, w: 24, h: 8 }
        ),
        {
          type: 'table',
          title: 'Últimos registros',
          datasource: DS_NAME,
          targets: [{
            refId: 'H', format: 'table', rawSql:
            `SELECT fecha_lote, name1, serial1, name2, serial2, umbral, perdida,
                    JSON_UNQUOTE(JSON_EXTRACT(details,'$.origin.card')) AS origin_card,
                    JSON_UNQUOTE(JSON_EXTRACT(details,'$.target.card')) AS target_card
             FROM spans
             WHERE serial1='${s1}' AND serial2='${s2}'
             ORDER BY fecha_lote DESC, id DESC
             LIMIT 200`
          }],
          gridPos: { x: 0, y: 20, w: 24, h: 8 }
        }
      ],
      templating: { list: [] },
      annotations: { list: [] },
    };

    const file = path.join(PADTEC_FOLDER, `${uid}.json`);
    fs.writeFileSync(file, JSON.stringify(dash, null, 2));
    dashboards.push({ uid, title: dash.title, serial1, serial2, name1, name2 });
    console.log('Dashboard generado:', file);
  }

  // Dashboard índice con links
  const index = {
    id: null,
    uid: 'wn_index',
    title: 'Padtec - Índice de Enlaces',
    time: { from: 'now-90d', to: 'now' },
    panels: [
      {
        type: 'table',
        title: 'Enlaces (click para abrir)',
        datasource: DS_NAME,
        targets: [{
          refId: 'L', format: 'table', rawSql:
          `SELECT
             MAX(name1) AS name1,
             MAX(name2) AS name2,
             serial1,
             serial2,
             CONCAT(serial1, '|', serial2) AS link_key
           FROM spans
           GROUP BY serial1, serial2
           ORDER BY MAX(fecha_lote) DESC`
        }],
        options: { showHeader: true },
        fieldConfig: {
          defaults: {},
          overrides: [
            {
              matcher: { id: 'byName', options: 'link_key' },
              properties: [
                {
                  id: 'links',
                  value: [
                    {
                      title: 'Abrir dashboard',
                      url: '/d/${__value.text}',
                      targetBlank: true
                    }
                  ]
                },
                { id: 'custom.width', value: 300 }
              ]
            }
          ]
        },
        gridPos: { x: 0, y: 0, w: 24, h: 12 }
      }
    ],
  };

  // Para que el index funcione, necesitamos mapear link_key -> uid. Creamos un archivo auxiliar JSON.
  const map = Object.fromEntries(dashboards.map(d => [ `${d.serial1}|${d.serial2}`, d.uid ]));
  fs.writeFileSync(path.join(PADTEC_FOLDER, 'wn_index_map.json'), JSON.stringify(map, null, 2));

  // Nota: Grafana no resuelve variables en URL del link del field como queríamos; para navegación perfecta se puede usar un panel Text con lista y URLs directas.
  // Como alternativa, creamos un panel Text con links directos:
  const linksMd = dashboards
    .sort((a,b)=>String(a.name1).localeCompare(String(b.name1)))
    .map(d => `- [${d.name1} -> ${d.name2}](/d/${d.uid})`)
    .join('\n');
  index.panels.push({
    type: 'text', title: 'Índice (links directos)', options: { content: linksMd }, gridPos: { x: 0, y: 12, w: 24, h: 12 }
  });

  fs.writeFileSync(path.join(PADTEC_FOLDER, `wn_index.json`), JSON.stringify(index, null, 2));

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
