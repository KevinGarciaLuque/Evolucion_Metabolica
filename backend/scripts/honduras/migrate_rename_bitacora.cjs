/**
 * Renombra la tabla `bitacora` a `consultas` en la base de datos.
 * Ejecutar UNA sola vez antes de reiniciar el backend:
 *   node migrate_rename_bitacora.cjs
 */
const mysql  = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Verificar si la tabla ya fue renombrada
    const [rows] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'consultas'",
      [process.env.DB_NAME]
    );

    if (rows.length > 0) {
      console.log("✅ La tabla 'consultas' ya existe. No se necesita migración.");
    } else {
      await conn.query("RENAME TABLE bitacora TO consultas");
      console.log("✅ Tabla renombrada: bitacora → consultas");
    }
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("❌ Error en migración:", err.message);
  process.exit(1);
});
