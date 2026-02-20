/**
 * Script para generar dashboards individuales de Grafana por link_identifier
 * Ejecutar: node scripts/generate_dashboards.js
 * Asegúrate de tener instalado mysql2: npm install mysql2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

// Definir __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Configuración de conexión a la base de datos (parametrizable)
  const connection = await mysql.createConnection({
    host: process.env.CISCO_DB_HOST || 'db',
    port: Number(process.env.CISCO_DB_PORT || 3306),
    user: process.env.CISCO_DB_USER || 'dwdmcisco1',
    password: process.env.CISCO_DB_PASSWORD || 'dwdmspan1',
    database: process.env.CISCO_DB_NAME || 'datosinter',
  });

  // Directorio donde se generarán los dashboards (carpeta Cisco)
  const dashboardsDir = path.resolve(__dirname, '../grafana/dashboards/cisco');
  if (!fs.existsSync(dashboardsDir)) {
    fs.mkdirSync(dashboardsDir, { recursive: true });
  }
  // Eliminar dashboards antiguos para evitar duplicados
  const existing = fs.readdirSync(dashboardsDir);
  for (const file of existing) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(dashboardsDir, file));
    }
  }

  // Obtener enlaces distintos
  const [rows] = await connection.query("SELECT DISTINCT link_identifier FROM spans");

  // Normalización consistente para UID y SQL
  // UID y nombre de archivo: spans_<hash8> (hash MD5 de link_identifier)
  function makeUID(link) {
    return `spans_${crypto.createHash('md5').update(link).digest('hex').slice(0, 8)}`;
  }

  // Guardar todos los UIDs generados y metadatos
  const generatedUids = [];
  const dashboardsMeta = [];
  for (const row of rows) {
    const link = row.link_identifier;
    const uid = makeUID(link);
    generatedUids.push(uid);
    const title = `Span - ${link} [${uid}]`;

    const dashboard = {
      id: null,
      uid,
      title,
      time: {
        from: 'now-2y',
        to: 'now'
      },
      timezone: 'browser',
      schemaVersion: 36,
      version: 0,
      refresh: '5s',
      panels: [
        // Panel de estado global (resumen verde/amarillo/rojo)
        {
          type: 'stat',
          title: 'Estado Global de Enlaces',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'G',
              format: 'table',
              rawSql:
                `SELECT
                  SUM(CASE WHEN last_span < 20 THEN 1 ELSE 0 END) AS verdes,
                  SUM(CASE WHEN last_span >= 20 AND last_span < 30 THEN 1 ELSE 0 END) AS amarillos,
                  SUM(CASE WHEN last_span >= 30 THEN 1 ELSE 0 END) AS rojos
                FROM spans
                WHERE link_identifier = '${link.replace(/'/g, "''")}'`,
            },
          ],
          fieldConfig: {
            defaults: {
              color: { mode: 'thresholds' },
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'green', value: null },
                  { color: 'yellow', value: 1 },
                  { color: 'red', value: 2 }
                ]
              },
              mappings: [],
            },
            overrides: []
          },
          options: { reduceOptions: { calcs: ['sum'] } },
          gridPos: { x: 0, y: 24, w: 24, h: 4 },
        },
        // Panel de logs/eventos relevantes
        {
          type: 'table',
          title: 'Logs/Eventos Relevantes',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'H',
              format: 'table',
              rawSql:
                `SELECT id, link_identifier, last_span, last_updated, 'Evento' as tipo_evento
                 FROM spans
                 WHERE link_identifier = '${link.replace(/'/g, "''")}'
                   AND (last_span >= 30 OR last_span < 20)
                 ORDER BY last_updated DESC, id DESC
                 LIMIT 20`,
            },
          ],
          gridPos: { x: 0, y: 28, w: 24, h: 6 },
        },
        // Panel de estadísticas rápidas (Stat)
        {
          type: 'stat',
          title: 'Último valor',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'C',
              format: 'table',
              rawSql:
                "SELECT last_span FROM spans WHERE link_identifier = '" + link.replace(/'/g, "''") + "' ORDER BY last_updated DESC, id DESC LIMIT 1",
            },
          ],
          fieldConfig: {
            defaults: {
              color: { mode: 'thresholds' },
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'green', value: null },
                  { color: 'yellow', value: 20 },
                  { color: 'red', value: 30 }
                ]
              },
              mappings: [],
            },
            overrides: []
          },
          options: { reduceOptions: { calcs: ['lastNotNull'] } },
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
        },
        // Panel de mínimo
        {
          type: 'stat',
          title: 'Mínimo',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'D',
              format: 'table',
              rawSql:
                "SELECT MIN(last_span) as min_span FROM spans WHERE link_identifier = '" + link.replace(/'/g, "''") + "'",
            },
          ],
          fieldConfig: { defaults: {}, overrides: [] },
          options: { reduceOptions: { calcs: ['min'] } },
          gridPos: { x: 6, y: 0, w: 6, h: 4 },
        },
        // Panel de máximo
        {
          type: 'stat',
          title: 'Máximo',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'E',
              format: 'table',
              rawSql:
                "SELECT MAX(last_span) as max_span FROM spans WHERE link_identifier = '" + link.replace(/'/g, "''") + "'",
            },
          ],
          fieldConfig: { defaults: {}, overrides: [] },
          options: { reduceOptions: { calcs: ['max'] } },
          gridPos: { x: 12, y: 0, w: 6, h: 4 },
        },
        // Panel de promedio
        {
          type: 'stat',
          title: 'Promedio',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'F',
              format: 'table',
              rawSql:
                "SELECT AVG(last_span) as avg_span FROM spans WHERE link_identifier = '" + link.replace(/'/g, "''") + "'",
            },
          ],
          fieldConfig: { defaults: {}, overrides: [] },
          options: { reduceOptions: { calcs: ['mean'] } },
          gridPos: { x: 18, y: 0, w: 6, h: 4 },
        },
        // Panel de tendencias históricas (línea)
        {
          type: 'timeseries',
          title: 'Tendencia de Span',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'A',
              format: 'time_series',
              rawSql:
                "SELECT UNIX_TIMESTAMP(last_updated) * 1000 AS time, last_span AS value\n" +
                "FROM spans\n" +
                "WHERE $__timeFilter(last_updated)\n" +
                `  AND link_identifier = '${link.replace(/'/g, "''")}'`,
            },
          ],
          fieldConfig: { defaults: {}, overrides: [] },
          options: {},
          gridPos: { x: 0, y: 4, w: 24, h: 8 },
        },
        // Panel de eventos recientes (tabla)
        {
          type: 'table',
          title: 'Recent Spans',
          datasource: 'MySQL',
          targets: [
            {
              refId: 'B',
              format: 'table',
              rawSql:
                "SELECT id, link_identifier, last_span, last_updated\n" +
                "FROM spans\n" +
                `WHERE link_identifier = '${link.replace(/'/g, "''")}'\n` +
                "ORDER BY last_updated DESC, id DESC\n" +
                "LIMIT 100",
            },
          ],
          gridPos: { x: 0, y: 12, w: 24, h: 8 },
        },
        // Panel de documentación/ayuda
        {
          type: 'text',
          title: 'Ayuda',
          options: {
            content: 'Paneles:\n- Último valor: muestra el valor más reciente de atenuación.\n- Mínimo/Máximo/Promedio: resumen histórico.\n- Tendencia: evolución temporal.\n- Recent Spans: últimos registros.\n- Estado Global: resumen de enlaces en verde/amarillo/rojo.\n- Logs/Eventos: muestra eventos relevantes (fuera de rango).\n\nColores:\n- Verde: en rango\n- Amarillo: advertencia\n- Rojo: fuera de rango.\n\nFiltros: puedes filtrar por enlace desde el frontend.'
          },
          gridPos: { x: 0, y: 20, w: 24, h: 4 },
        },
      ],
      // Variables para filtrar (por si se quiere ampliar en el futuro)
      templating: {
        list: [
          {
            name: 'link',
            type: 'query',
            label: 'Enlace',
            datasource: 'MySQL',
            query: 'SELECT DISTINCT link_identifier FROM spans',
            definition: 'SELECT DISTINCT link_identifier FROM spans',
            multi: false,
            includeAll: false,
            refresh: 1,
            sort: 1,
            current: { text: link, value: link },
            options: [],
          }
        ]
      },
      // Alertas (ejemplo: fuera de rango)
      annotations: {
        list: [
          {
            name: 'Fuera de rango',
            datasource: 'MySQL',
            enable: true,
            iconColor: 'rgba(255, 0, 0, 1)',
            type: 'alert',
            expr: `SELECT last_span FROM spans WHERE link_identifier = '${link.replace(/'/g, "''")}' AND last_span > 30`,
            showLine: true,
          }
        ]
      },
    };

  const filePath = path.join(dashboardsDir, `${uid}.json`);
    fs.writeFileSync(filePath, JSON.stringify(dashboard, null, 2));
    console.log(`Dashboard generado: ${filePath}`);

  dashboardsMeta.push({ uid, link });
  }

  // Escribir la lista de UIDs en public/dashboards_list.json
  const dashboardsListPath = path.resolve(__dirname, '../public/dashboards_list.json');
  fs.writeFileSync(dashboardsListPath, JSON.stringify(generatedUids, null, 2));
  console.log(`Archivo de lista de dashboards generado: ${dashboardsListPath}`);

  await connection.end();
  // Crear dashboard índice para Cisco
  const index = {
    id: null,
    uid: 'cisco_index',
    title: 'Cisco - Índice de Enlaces',
    time: { from: 'now-2y', to: 'now' },
    panels: [
      {
        type: 'table',
        title: 'Enlaces (click para abrir)',
        datasource: 'MySQL',
        targets: [{
          refId: 'L', format: 'table', rawSql:
          `SELECT DISTINCT link_identifier FROM spans ORDER BY link_identifier`
        }],
        options: { showHeader: true },
        fieldConfig: {
          defaults: {},
          overrides: [
            {
              matcher: { id: 'byName', options: 'link_identifier' },
              properties: [
                {
                  id: 'links',
                  value: [
                    {
                      title: 'Abrir dashboard',
                      // Nota: se usa un mapa de enlaces directo en el panel texto; aquí dejamos link neutral
                      url: '/dashboards',
                      targetBlank: true
                    }
                  ]
                }
              ]
            }
          ]
        },
        gridPos: { x: 0, y: 0, w: 24, h: 10 }
      }
    ]
  };

  const linksMd = dashboardsMeta
    .sort((a,b)=>String(a.link).localeCompare(String(b.link)))
    .map(d => `- [${d.link}](/d/${d.uid})`)
    .join('\n');
  index.panels.push({ type: 'text', title: 'Índice (links directos)', options: { content: linksMd }, gridPos: { x: 0, y: 10, w: 24, h: 14 } });

  const indexPath = path.join(dashboardsDir, 'cisco_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`Dashboard índice generado: ${indexPath}`);

  console.log('Generación de dashboards completada');
}

main().catch(err => {
  console.error('Error generando dashboards:', err);
  process.exit(1);
});
