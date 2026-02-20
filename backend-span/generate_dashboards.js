const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const dashboardsDir = path.join(repoRoot, 'grafana', 'dashboards', 'cisco');
const publicListPath = path.join(repoRoot, 'public', 'dashboards_list.json');

if (!fs.existsSync(dashboardsDir)) fs.mkdirSync(dashboardsDir, { recursive: true });
if (!fs.existsSync(path.dirname(publicListPath))) fs.mkdirSync(path.dirname(publicListPath), { recursive: true });

function md5short(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0,8);
}

function makeDashboard(link) {
  const uid = `spans_${md5short(link)}`;
  const safeLink = link.replace(/'/g, "''");
  return {
    uid,
    title: `Span - ${link} [${uid}]`,
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

function baseNode(endpoint) {
  return endpoint.replace(/\s*\/.*$/,'').trim().toLowerCase();
}

function shouldSkipLink(link) {
  const parts = link.split(/\s*->\s*/i);
  if (parts.length !== 2) return false;
  const left = baseNode(parts[0]);
  const right = baseNode(parts[1]);
  return left === right;
}

function parseLinksFromCsv(content) {
  const lines = content.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Optical Link\b/i.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return [];
  const links = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) break;
    const m = line.match(/^\s*(.+?)\s*,\s*([0-9.+-]+)\s*$/);
    if (m) links.push(m[1].trim());
  }
  return links;
}

async function generateFromContent(content, options = { skipSameBase: true }) {
  const links = parseLinksFromCsv(content);
  if (!links.length) return { created: 0 };

  let publicList = [];
  try {
    if (fs.existsSync(publicListPath)) {
      const raw = fs.readFileSync(publicListPath, 'utf8');
      publicList = JSON.parse(raw);
      if (!Array.isArray(publicList)) publicList = [];
    }
  } catch (e) { publicList = []; }

  const created = [];
  for (const link of links) {
    if (options.skipSameBase && shouldSkipLink(link)) continue;
    const uid = `spans_${md5short(link)}`;
    const filePath = path.join(dashboardsDir, `${uid}.json`);
    if (fs.existsSync(filePath)) { if (!publicList.includes(uid)) publicList.push(uid); continue; }
    const dash = makeDashboard(link);
    fs.writeFileSync(filePath, JSON.stringify(dash, null, 2), 'utf8');
    created.push({ uid, link, file: filePath });
    if (!publicList.includes(uid)) publicList.push(uid);
  }

  // dedupe
  publicList = Array.from(new Set(publicList));
  fs.writeFileSync(publicListPath, JSON.stringify(publicList, null, 2), 'utf8');
  return { created: created.length, items: created };
}

module.exports = { generateFromContent };
