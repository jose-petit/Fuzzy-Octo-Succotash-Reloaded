import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const repoRoot = process.cwd();
const dashboardsDir = path.join(repoRoot, 'grafana', 'dashboards', 'cisco');
const publicListPath = path.join(repoRoot, 'public', 'dashboards_list.json');

if (!fs.existsSync(dashboardsDir)) fs.mkdirSync(dashboardsDir, { recursive: true });
if (!fs.existsSync(path.dirname(publicListPath))) fs.mkdirSync(path.dirname(publicListPath), { recursive: true });

function md5short(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0,8);
}

function makeDashboard(link) {
  const uid = `spans_${md5short(link)}`;
  const title = `Span - ${link} [${uid}]`;
  const safeLink = link.replace(/'/g, "''");
  return {
    uid,
    title,
    time: { from: 'now-2y', to: 'now' },
    timezone: 'browser',
    schemaVersion: 36,
    version: 0,
    refresh: '5s',
    panels: [
      {
        type: 'stat',
        title: 'Último valor',
        datasource: 'MySQL',
        targets: [{ refId: 'C', format: 'table', rawSql: `SELECT last_span FROM spans WHERE link_identifier = '${safeLink}' ORDER BY last_updated DESC, id DESC LIMIT 1` }],
        gridPos: { x: 0, y: 0, w: 6, h: 4 }
      },
      {
        type: 'timeseries',
        title: 'Tendencia de Span',
        datasource: 'MySQL',
        targets: [{ refId: 'A', format: 'time_series', rawSql: `SELECT UNIX_TIMESTAMP(last_updated) * 1000 AS time, last_span AS value FROM spans WHERE $__timeFilter(last_updated) AND link_identifier = '${safeLink}'` }],
        gridPos: { x: 0, y: 4, w: 24, h: 8 }
      },
      {
        type: 'table',
        title: 'Recent Spans',
        datasource: 'MySQL',
        targets: [{ refId: 'B', format: 'table', rawSql: `SELECT id, link_identifier, last_span, last_updated FROM spans WHERE link_identifier = '${safeLink}' ORDER BY last_updated DESC, id DESC LIMIT 100` }],
        gridPos: { x: 0, y: 12, w: 24, h: 8 }
      }
    ],
    templating: { list: [] },
    annotations: { list: [] }
  };
}

const linksToCreate = [
  'DWDM-MESA DEL ZORRO/A -> DWDM-MESA DEL ZORRO/B',
  'DWDM-MESA DEL ZORRO/B -> DWDM-MESA DEL ZORRO/A',
  'DWDM-TOCUYO/B -> DWDM-BOCONO/A',
  'DWDM-BOCONO/A -> DWDM-TOCUYO/B'
];

let publicList = [];
if (fs.existsSync(publicListPath)) {
  try { publicList = JSON.parse(fs.readFileSync(publicListPath,'utf8')); if (!Array.isArray(publicList)) publicList = []; } catch(e) { publicList = []; }
}

const created = [];
for (const link of linksToCreate) {
  const uid = `spans_${md5short(link)}`;
  const filePath = path.join(dashboardsDir, `${uid}.json`);
  if (fs.existsSync(filePath)) {
    console.log(`Skipping existing dashboard file: ${filePath}`);
    if (!publicList.includes(uid)) publicList.push(uid);
    continue;
  }
  const dash = makeDashboard(link);
  fs.writeFileSync(filePath, JSON.stringify(dash, null, 2), 'utf8');
  console.log(`Created dashboard file: ${filePath}`);
  created.push({ uid, link, file: filePath });
  if (!publicList.includes(uid)) publicList.push(uid);
}

fs.writeFileSync(publicListPath, JSON.stringify(publicList, null, 2), 'utf8');
console.log(`Updated public dashboards list: ${publicListPath}`);
console.log('Done. Created dashboards:', created.length);
