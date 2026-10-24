/**
 * Migración: crear tabla bitacora
 * Ejecutar con: node migrate_bitacora.cjs
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS bitacora (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id       INT NOT NULL,
      fecha             DATE NOT NULL,
      tipo_consulta     ENUM('Presencial','Telemedicina','Control','Urgencia','Otro') NOT NULL DEFAULT 'Presencial',
      peso              DECIMAL(5,2)  DEFAULT NULL,
      talla             DECIMAL(5,2)  DEFAULT NULL,
      glucosa_ayunas    DECIMAL(6,2)  DEFAULT NULL,
      hba1c             DECIMAL(4,2)  DEFAULT NULL,
      tension_arterial  VARCHAR(20)   DEFAULT NULL,
      medicamentos      TEXT          DEFAULT NULL,
      observaciones     TEXT          DEFAULT NULL,
      plan_tratamiento  TEXT          DEFAULT NULL,
      proxima_cita      DATE          DEFAULT NULL,
      usuario_id        INT           DEFAULT NULL,
      created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_bit_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  try {
    await pool.query(sql);
    console.log("✅ Tabla bitacora creada correctamente.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
