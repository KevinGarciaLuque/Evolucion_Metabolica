// migrate_login_logs.cjs
// Crea la tabla login_logs en la base maestra alad_master — bitácora
// centralizada de inicios de sesión (por país) para el Panel de Instancias.
// Ejecutar: node backend/migrate_login_logs.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const masterDB = process.env.MASTER_DB_NAME || "alad_master";
  console.log(`\n📋 Creando tabla login_logs en: ${masterDB}`);

  await conn.query(`USE \`${masterDB}\``);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tenant_id      INT UNSIGNED  DEFAULT NULL,
      tenant_codigo  VARCHAR(10)   DEFAULT NULL,
      usuario_id     INT UNSIGNED  DEFAULT NULL,
      usuario_nombre VARCHAR(150)  DEFAULT NULL,
      usuario_email  VARCHAR(150)  DEFAULT NULL,
      usuario_rol    VARCHAR(50)   DEFAULT NULL,
      exito          TINYINT(1)    NOT NULL DEFAULT 1,
      ip             VARCHAR(45)   DEFAULT NULL,
      user_agent     TEXT          DEFAULT NULL,
      navegador      VARCHAR(120)  DEFAULT NULL,
      fecha          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_fecha (fecha),
      INDEX idx_email (usuario_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ Tabla login_logs");

  await conn.end();
  console.log("\n✅ Migración de login_logs lista.\n");
}

migrate().catch((err) => {
  console.error("❌ Error en migración login_logs:", err.message);
  process.exit(1);
});
