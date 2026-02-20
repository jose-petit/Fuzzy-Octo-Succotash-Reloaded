// Script para eliminar dashboards que no están en dashboards_list.json
import fs from 'fs';
import path from 'path';


import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardsDir = path.resolve(__dirname, '../grafana/dashboards');
const dashboardsListPath = path.resolve(__dirname, '../public/dashboards_list.json');

const dashboardsList = JSON.parse(fs.readFileSync(dashboardsListPath, 'utf8'));
const files = fs.readdirSync(dashboardsDir).filter(f => f.endsWith('.json'));

let deleted = 0;
for (const file of files) {
  const base = file.replace(/\.json$/, '');
  if (!dashboardsList.includes(base)) {
    fs.unlinkSync(path.join(dashboardsDir, file));
    console.log('Deleted unused dashboard:', file);
    deleted++;
  }
}
console.log(`Limpieza completada. Dashboards eliminados: ${deleted}`);
