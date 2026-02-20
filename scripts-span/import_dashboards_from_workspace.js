import fs from 'fs';
import path from 'path';

const workspaceRoot = path.resolve('..'); // parent of dwdm-span-processor-dev is web-notifications
const srcGrafana = path.join(workspaceRoot, 'grafana', 'dashboards', 'cisco');
const dstGrafana = path.join(process.cwd(), 'grafana', 'dashboards', 'cisco');
const srcPublic = path.join(workspaceRoot, 'public', 'dashboards_list.json');
const dstPublic = path.join(process.cwd(), 'public', 'dashboards_list.json');

if (!fs.existsSync(srcGrafana)) {
  console.error('Source grafana dir not found:', srcGrafana);
  process.exit(1);
}
if (!fs.existsSync(dstGrafana)) fs.mkdirSync(dstGrafana, { recursive: true });
if (!fs.existsSync(path.dirname(dstPublic))) fs.mkdirSync(path.dirname(dstPublic), { recursive: true });

const files = fs.readdirSync(srcGrafana).filter(f => f.endsWith('.json'));
let copied = 0;
for (const f of files) {
  const src = path.join(srcGrafana, f);
  const dst = path.join(dstGrafana, f);
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log('Copied', f);
    copied++;
  } else {
    console.log('Exists, skipping', f);
  }
}

let srcList = [];
if (fs.existsSync(srcPublic)) {
  try { srcList = JSON.parse(fs.readFileSync(srcPublic,'utf8')); } catch(e) { srcList = []; }
}
let dstList = [];
if (fs.existsSync(dstPublic)) {
  try { dstList = JSON.parse(fs.readFileSync(dstPublic,'utf8')); } catch(e) { dstList = []; }
}

const merged = Array.from(new Set([...dstList, ...srcList]));
fs.writeFileSync(dstPublic, JSON.stringify(merged, null, 2), 'utf8');
console.log('Updated destination public list:', dstPublic);
console.log('Copied files count:', copied);
