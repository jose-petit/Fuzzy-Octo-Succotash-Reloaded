#!/usr/bin/env node
/**
 * Script para restaurar los dashboards simples (spans_<uid>.json) a partir de los detallados.
 * Copia cada archivo spans_<hash8>_<suffix>.json a spans_<hash8>.json si no existe.
 * Uso: node scripts/restore_dashboards.js
 */
import fs from 'fs';
import path from 'path';

// Definir __dirname en ES Modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardsDir = path.resolve(__dirname, '../grafana/dashboards');
const files = fs.readdirSync(dashboardsDir).filter(f => f.endsWith('.json'));

// Procesar cada detallado
const regex = /^(spans_[0-9a-f]{8})_/;
for (const file of files) {
  const match = file.match(regex);
  if (match) {
    const uid = match[1];
    const simpleName = `${uid}.json`;
    const src = path.join(dashboardsDir, file);
    const dest = path.join(dashboardsDir, simpleName);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`Restored simple dashboard: ${simpleName}`);
    }
    // Eliminar dashboard detallado original
    fs.unlinkSync(src);
    console.log(`Deleted detailed dashboard: ${file}`);
  }
}
console.log('Restore completed.');
