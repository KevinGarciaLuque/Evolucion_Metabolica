/**
 * Migración: agrega columnas latitud/longitud a la tabla pacientes (local + Railway).
 * Ejecutar: node migrate_latlng.cjs
 */
const mysql  = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

async function addColumnIfMissing(conn, table, column, definition) {
  const [cols] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column]
  );
  if (cols.length === 0) {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Columna '${column}' agregada`);
  } else {
    console.log(`ℹ️  Columna '${column}' ya existe`);
  }
}

async function main() {
  const url = process.argv[2]; // URL de Railway como argumento opcional
  const conn = url
    ? await mysql.createConnection(url)
    : await mysql.createConnection({
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT || 3306,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

  await addColumnIfMissing(conn, "pacientes", "latitud",  "DECIMAL(10,8) NULL");
  await addColumnIfMissing(conn, "pacientes", "longitud", "DECIMAL(11,8) NULL");

  await conn.end();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
