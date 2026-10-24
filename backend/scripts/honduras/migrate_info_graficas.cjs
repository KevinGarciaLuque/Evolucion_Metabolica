/**
 * Agrega la columna mostrar_info_graficas a la tabla usuarios.
 * Idempotente: verifica si ya existe antes de agregarla.
 */
const mysql = require("mysql2/promise");

const config = {
  host:     process.env.DB_HOST     || "metro.proxy.rlwy.net",
  port:     Number(process.env.DB_PORT || 35534),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "MfZrJWHJcbyzUIbshhtDGuXQuvldatYt",
  database: process.env.DB_NAME     || "railway",
};

(async () => {
  const conn = await mysql.createConnection(config);
  try {
    // Verificar si la columna ya existe
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'mostrar_info_graficas'",
      [config.database]
    );

    if (cols.length > 0) {
      console.log("✅ La columna mostrar_info_graficas ya existe. Nada que hacer.");
    } else {
      await conn.query(
        "ALTER TABLE usuarios ADD COLUMN mostrar_info_graficas TINYINT(1) NOT NULL DEFAULT 0"
      );
      console.log("✅ Columna mostrar_info_graficas agregada correctamente.");
    }

    // Mostrar estado actual
    const [rows] = await conn.query(
      "SELECT id, nombre, email, rol, mostrar_info_graficas FROM usuarios ORDER BY id"
    );
    console.table(rows);
  } finally {
    await conn.end();
  }
})().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
