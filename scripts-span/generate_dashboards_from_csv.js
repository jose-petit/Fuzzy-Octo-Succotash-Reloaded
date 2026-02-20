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

function findLatestCsvInDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.csv'));
  if (files.length === 0) return null;
  files.sort((a,b) => fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  return path.join(dir, files[0]);
}

function parseLinksFromCsv(content) {
  const lines = content.split(/\r?\n/);
  // find the header 'Optical Link' line
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Optical Link\b/i.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return [];
  const links = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) break; // stop at blank line
    // Expect format: <link>, <value>
    const m = line.match(/^\s*(.+?)\s*,\s*([0-9.+-]+)\s*$/);
    if (m) {
      const link = m[1].trim();
      links.push(link);
    }
  }
  return links;
}

function baseNode(endpoint) {
  // remove trailing /SEG if present, trim and normalize spaces
  return endpoint.replace(/\s*\/.*$/,'').trim().toLowerCase();
}

function shouldSkipLink(link) {
  const parts = link.split(/\s*->\s*/i);
  if (parts.length !== 2) return false;
  const left = baseNode(parts[0]);
  const right = baseNode(parts[1]);
  return left === right;
}

async function main() {
  const argPath = process.argv[2];
  let csvPath = argPath;
  if (!csvPath) csvPath = findLatestCsvInDir(path.join(repoRoot, 'csv-drop'));
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('No CSV file provided and no CSV found in csv-drop/. Provide path as first arg.');
    process.exit(1);
  }
  const content = fs.readFileSync(csvPath,'utf8');
  const links = parseLinksFromCsv(content);
  if (!links.length) { console.log('No links parsed from CSV:', csvPath); return; }

  let publicList = [];
  if (fs.existsSync(publicListPath)) {
    try { publicList = JSON.parse(fs.readFileSync(publicListPath,'utf8')); if (!Array.isArray(publicList)) publicList = []; } catch(e) { publicList = []; }
  }

  const created = [];
  for (const link of links) {
    if (shouldSkipLink(link)) {
      console.log('Skipping link (same base node):', link);
      continue;
    }
    const uid = `spans_${md5short(link)}`;
    const filePath = path.join(dashboardsDir, `${uid}.json`);
    if (fs.existsSync(filePath)) { if (!publicList.includes(uid)) publicList.push(uid); continue; }
    const dash = makeDashboard(link);
    fs.writeFileSync(filePath, JSON.stringify(dash, null, 2), 'utf8');
    console.log('Created dashboard for:', link, '->', uid);
    created.push({ uid, link, file: filePath });
    if (!publicList.includes(uid)) publicList.push(uid);
  }

  fs.writeFileSync(publicListPath, JSON.stringify(publicList, null, 2), 'utf8');
  console.log(`Updated public dashboards list: ${publicListPath}`);
  console.log('Done. Created dashboards:', created.length);
}

main().catch(err => { console.error(err); process.exit(1); });
