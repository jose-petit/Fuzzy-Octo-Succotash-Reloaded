#!/usr/bin/env node
/**
 * Script para eliminar dashboards provisionados en Grafana que ya no existan en el disco.
 * Requiere variables de entorno:
 *   GRAFANA_URL (por ejemplo http://localhost:3003)
 *   GRAFANA_API_KEY (API Key con role Admin)
 *
 * Uso: GRAFANA_URL=http://localhost:3003 GRAFANA_API_KEY=abc123 node scripts/cleanup_provisioned_dashboards.js
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

// URL fija de Grafana en entorno dev (mapea a localhost:3003)
const GRAFANA_URL = 'http://localhost:3003';
const API_KEY = process.env.GRAFANA_API_KEY;
if (!API_KEY) {
  console.error('ERROR: define GRAFANA_API_KEY');
  process.exit(1);
}

(async () => {
  try {
    // Leer UIDs locales
    const dashboardsDir = path.resolve(__dirname, '../grafana/dashboards');
    const localFiles = fs.readdirSync(dashboardsDir).filter(f => f.endsWith('.json'));
    const localUids = localFiles.map(f => f.replace(/\.json$/, ''));

    // Obtener dashboards de Grafana
    const resp = await axios.get(`${GRAFANA_URL}/api/search?query=&type=dash-db&limit=5000`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const remote = resp.data; // array { uid, title, uri }

    for (const dash of remote) {
      if (!localUids.includes(dash.uid)) {
        console.log(`Deleting provisioned dashboard ${dash.uid} (${dash.title})`);
        await axios.delete(`${GRAFANA_URL}/api/dashboards/uid/${dash.uid}`, {
          headers: { Authorization: `Bearer ${API_KEY}` }
        });
      }
    }
    console.log('Provisioned cleanup completed.');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
})();
