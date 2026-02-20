import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../grafana/dashboards');
const ciscoDir = path.resolve(__dirname, '../grafana/dashboards/cisco');

if (!fs.existsSync(ciscoDir)) fs.mkdirSync(ciscoDir, { recursive: true });

const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.json'));
for (const f of files) {
  // no mover si ya está en cisco/padtec (este script corre en root path)
  if (f.startsWith('spans_')) {
    const src = path.join(rootDir, f);
    const dest = path.join(ciscoDir, f);
    fs.renameSync(src, dest);
    console.log(`Moved ${f} -> cisco/`);
  }
}
