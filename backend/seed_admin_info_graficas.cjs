/**
 * Activa mostrar_info_graficas=1 para todos los usuarios con rol 'admin'.
 * Ejecutar con variables de entorno según el entorno objetivo.
 */
const mysql = require("mysql2/promise");

const config = {
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "123456789",
  database: process.env.DB_NAME     || "evolucion_metabolica",
};

(async () => {
  const conn = await mysql.createConnection(config);
  try {
    const [r] = await conn.query(
      "UPDATE usuarios SET mostrar_info_graficas = 1 WHERE rol = 'admin'"
    );
    console.log(`✅ Admins actualizados: ${r.affectedRows} fila(s) en ${config.host}/${config.database}`);

    const [rows] = await conn.query(
      "SELECT id, nombre, rol, mostrar_info_graficas FROM usuarios ORDER BY id"
    );
    console.table(rows);
  } finally {
    await conn.end();
  }
})().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
