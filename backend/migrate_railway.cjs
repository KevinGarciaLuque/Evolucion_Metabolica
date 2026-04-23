const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection(
    "mysql://root:MfZrJWHJcbyzUIbshhtDGuXQuvldatYt@metro.proxy.rlwy.net:35534/railway"
  );

  // 1. Renombrar bitacora -> consultas si aún existe
  const [tables] = await conn.query("SHOW TABLES LIKE 'bitacora'");
  if (tables.length > 0) {
    await conn.query("RENAME TABLE bitacora TO consultas");
    console.log("✅ Tabla renombrada: bitacora → consultas");
  } else {
    console.log("ℹ️  bitacora no encontrada (ya fue renombrada o no aplica)");
  }

  // 2. Crear mensajes_whatsapp
  await conn.query(`
    CREATE TABLE IF NOT EXISTS mensajes_whatsapp (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id        INT          NOT NULL,
      paciente_nombre    VARCHAR(255) NOT NULL,
      telefono           VARCHAR(30)  NOT NULL,
      mensaje            TEXT         NOT NULL,
      estado             ENUM('enviado','error') NOT NULL DEFAULT 'enviado',
      error_detalle      TEXT         NULL,
      enviado_por_id     INT          NULL,
      enviado_por_nombre VARCHAR(255) NULL,
      fecha              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id),
      INDEX idx_fecha    (fecha),
      INDEX idx_estado   (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log("✅ Tabla mensajes_whatsapp creada (o ya existía)");

  await conn.end();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
