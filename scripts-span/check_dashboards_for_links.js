import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const repoRoot = process.cwd();
const ciscoDir = path.join(repoRoot, 'grafana', 'dashboards', 'cisco');
const padtecDir = path.join(repoRoot, 'grafana', 'dashboards', 'padtec');
const publicList = path.join(repoRoot, 'public', 'dashboards_list.json');
const padtecMap = path.join(padtecDir, 'wn_index_map.json');

function md5short(s) {
  return crypto.createHash('md5').update(s).digest('hex').slice(0,8);
}

const candidates = [
  'DWDM-MESA DEL ZORRO/A -> DWDM-MESA DEL ZORRO/B',
  'DWDM-MESA DEL ZORRO/B -> DWDM-MESA DEL ZORRO/A',
  'DWDM-TOCUYO/B -> DWDM-BOCONO/A',
  'DWDM-BOCONO/A -> DWDM-TOCUYO/B'
];

let publicData = null;
try { publicData = JSON.parse(fs.readFileSync(publicList,'utf8')); } catch(e) { publicData = null; }
let padtecData = null;
try { padtecData = JSON.parse(fs.readFileSync(padtecMap,'utf8')); } catch(e) { padtecData = null; }

function existsFile(dir, filename) {
  try { return fs.existsSync(path.join(dir, filename + '.json')); } catch(e) { return false; }
}

function searchInDirForText(dir, text) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir,f),'utf8');
    if (content.includes(text)) results.push(f);
  }
  return results;
}

const out = [];
for (const link of candidates) {
  const uid = 'spans_' + md5short(link);
  const inCiscoFile = existsFile(ciscoDir, uid);
  const inPublicList = Array.isArray(publicData) ? publicData.includes(uid) : false;
  const searchedInCisco = searchInDirForText(ciscoDir, link);
  const searchedInPadtec = searchInDirForText(padtecDir, link);
  out.push({ link, uid, inCiscoFile, inPublicList, searchedInCisco, searchedInPadtec });
}

console.log(JSON.stringify({ now: new Date().toISOString(), results: out, publicListExists: fs.existsSync(publicList), padtecMapExists: fs.existsSync(padtecMap) }, null, 2));
