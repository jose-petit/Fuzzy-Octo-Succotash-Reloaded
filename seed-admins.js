// Standalone script to seed admin users into MySQL
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  // Configure connection pool (adjust env vars if needed)
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'web_notifications',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    connectionLimit: 10,
  });

  const admins = [
    { nombre: 'jpetit', email: 'jpetit@ejemplo.com', password: '666' },
    { nombre: 'dwdm', email: 'dwdm@ejemplo.com', password: 't0pt1c0' },
    // Nuevo admin solicitado
    { nombre: 'admin', email: 'admin@inter.com.ve', password: 'T0pt1c0' },
  ];

  for (const admin of admins) {
    const [rows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [admin.email]);
    const hashed = await bcrypt.hash(admin.password, 10);
    if (rows.length === 0) {
      // Crear nuevo admin si no existe
      await pool.query('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', [
        admin.nombre,
        admin.email,
        hashed,
        'admin',
      ]);
      console.log(`✅ Admin created: ${admin.email}`);
    } else {
      // Usuario existe: actualizar contraseña
      await pool.query('UPDATE usuarios SET password = ? WHERE email = ?', [hashed, admin.email]);
      console.log(`🔄 Admin password updated: ${admin.email}`);
    }
  }
  await pool.end();
  process.exit(0);
})();
