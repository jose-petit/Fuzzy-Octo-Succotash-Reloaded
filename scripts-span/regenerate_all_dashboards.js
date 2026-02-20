import { execSync } from 'child_process';

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

// Regenerate Cisco (DWDM) and Padtec (Web Notifications)
run('node scripts/generate_dashboards.js');
run('node scripts/generate_dashboards_web_notifications.js');
