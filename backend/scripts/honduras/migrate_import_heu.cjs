/**
 * Crea tablas para importación HEU (staging + batches).
 * Uso:
 *   node migrate_import_heu.cjs "mysql://user:pass@host:port/db"
 * o con DATABASE_URL en entorno.
 */

const mysql = require("mysql2/promise");

async function main() {
  const url = process.argv[2] || process.env.DATABASE_URL;
  if (!url) {
    console.error("Uso: node migrate_import_heu.cjs <DATABASE_URL>");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  console.log("Conectado.");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS import_heu_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      archivo_nombre VARCHAR(255) NOT NULL,
      estado VARCHAR(30) NOT NULL DEFAULT 'preview',
      creado_por INT NULL,
      confirmado_por INT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmado_en TIMESTAMP NULL,
      resumen_json JSON NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS import_heu_staging (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      fila_numero INT NOT NULL,
      dni VARCHAR(40) NULL,
      nombre VARCHAR(180) NULL,
      edad INT NULL,
      sexo CHAR(1) NULL,
      fecha_consulta DATE NULL,
      telefono VARCHAR(30) NULL,
      tipo_consulta VARCHAR(120) NULL,
      hba1c DECIMAL(6,2) NULL,
      tir DECIMAL(6,2) NULL,
      tar DECIMAL(6,2) NULL,
      tbr DECIMAL(6,2) NULL,
      peso DECIMAL(8,2) NULL,
      talla_cm DECIMAL(8,2) NULL,
      imc DECIMAL(8,2) NULL,
      pa_sistolica DECIMAL(8,2) NULL,
      pa_diastolica DECIMAL(8,2) NULL,
      institucion VARCHAR(40) NOT NULL DEFAULT 'HEU',
      grupo_etario VARCHAR(20) NOT NULL DEFAULT 'ADULTO',
      raw_json JSON NULL,
      errores_json JSON NULL,
      accion VARCHAR(40) NOT NULL,
      paciente_id_detectado INT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_import_heu_batch (batch_id),
      INDEX idx_import_heu_dni (dni),
      CONSTRAINT fk_import_heu_batch FOREIGN KEY (batch_id) REFERENCES import_heu_batches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("Migración import HEU lista.");
  await conn.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
