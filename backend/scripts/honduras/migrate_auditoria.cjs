/* Migración: tabla auditoria_sesiones */
const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS auditoria_sesiones (
      id             INT          AUTO_INCREMENT PRIMARY KEY,
      usuario_id     INT          NOT NULL,
      usuario_nombre VARCHAR(150) NOT NULL,
      usuario_email  VARCHAR(150) NOT NULL,
      usuario_rol    VARCHAR(50)  NOT NULL,
      accion         ENUM('login','logout') NOT NULL DEFAULT 'login',
      ip             VARCHAR(60)  DEFAULT NULL,
      user_agent     TEXT         DEFAULT NULL,
      fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario_id (usuario_id),
      INDEX idx_fecha      (fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("✅ Tabla auditoria_sesiones creada / ya existía.");
  await conn.end();
})();
