import { connection } from 'config/db';

// Ensures the settings table exists
async function ensureTable() {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS settings (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      skey VARCHAR(191) NOT NULL UNIQUE,
      svalue VARCHAR(191) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      next_at BIGINT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );
  // Ensure next_at column exists (ignore errors if already present)
  try {
    await connection.query(`ALTER TABLE settings ADD COLUMN next_at BIGINT DEFAULT NULL`);
  } catch { }
}

export default async function handler(req, res) {
  try {
    await ensureTable();
    if (req.method === 'GET') {
      const [rows] = await connection.query(
        'SELECT svalue, next_at FROM settings WHERE skey = ? LIMIT 1',
        ['refresh_interval_ms']
      );
      const defaultInterval = 300000; // 5 minutes standard
      // If no setting, initialize with defaults
      if (rows.length === 0) {
        const now = Date.now();
        const nextAt = now + defaultInterval;
        await connection.query('INSERT INTO settings (skey, svalue, next_at) VALUES (?, ?, ?)', [
          'refresh_interval_ms',
          String(defaultInterval),
          String(nextAt),
        ]);
        return res.status(200).json({ value: defaultInterval, nextAt });
      }
      const raw = rows[0];
      const intervalMs = Number(raw.svalue);
      const nextAt = raw.next_at
        ? Number(raw.next_at)
        : Date.now() + (Number.isNaN(intervalMs) ? defaultInterval : intervalMs);
      return res
        .status(200)
        .json({ value: Number.isNaN(intervalMs) ? defaultInterval : intervalMs, nextAt });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const { value } = req.body || {};
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) {
        return res.status(400).json({ error: 'Invalid value' });
      }
      const nextAt = Date.now() + num;
      await connection.query(
        'INSERT INTO settings (skey, svalue, next_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue), next_at = VALUES(next_at)',
        ['refresh_interval_ms', String(num), String(nextAt)]
      );
      return res.status(200).json({ ok: true, value: num, nextAt });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings/interval error:', err?.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
