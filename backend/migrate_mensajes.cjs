/**
 * Migración: crea la tabla mensajes_whatsapp para historial de mensajes enviados.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrar() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  const sql = `
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  try {
    await conn.query(sql);
    console.log('✅ Tabla mensajes_whatsapp creada (o ya existía).');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
  }
}

migrar();
