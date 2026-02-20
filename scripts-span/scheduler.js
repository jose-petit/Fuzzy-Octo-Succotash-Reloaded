/**
 * Simple scheduler that periodically regenerates Cisco & Padtec dashboards.
 * Respects environment variables for intervals and DB configs.
 */
import { spawn } from 'child_process';

const INTERVAL_MS = Number(process.env.DASHBOARDS_REGEN_INTERVAL_MS || 15 * 60 * 1000); // default 15m

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function regenerateOnce() {
  // Run Cisco first
  await run('node', ['scripts/generate_dashboards.js']);
  // Then Padtec
  await run('node', ['scripts/generate_dashboards_web_notifications.js']);
}

async function main() {
  console.log(`[scheduler] Starting. Interval: ${INTERVAL_MS}ms`);
  while (true) {
    const start = Date.now();
    try {
      console.log('[scheduler] Regeneration started');
      await regenerateOnce();
      console.log('[scheduler] Regeneration completed');
    } catch (err) {
      console.error('[scheduler] Regeneration failed:', err);
    }
    const elapsed = Date.now() - start;
    const sleep = Math.max(1000, INTERVAL_MS - elapsed);
    await new Promise((r) => setTimeout(r, sleep));
  }
}

main().catch((e) => {
  console.error('[scheduler] Fatal error:', e);
  process.exit(1);
});
