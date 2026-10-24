// migrate7.cjs — Crea tablas historial_insulina y planes_alimentacion
const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // ── Historial de insulina ────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS historial_insulina (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id         INT NOT NULL,
      fecha               DATE NOT NULL,
      insulina_prolongada VARCHAR(120),
      insulina_corta      VARCHAR(120),
      dosis_prolongada    VARCHAR(80),
      dosis_corta         VARCHAR(80),
      via_administracion  ENUM('Subcutánea','Bomba de insulina','Inhalatoria') DEFAULT 'Subcutánea',
      motivo_cambio       VARCHAR(255),
      observaciones       TEXT,
      creado_en           DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);
  console.log("✔ Tabla historial_insulina OK");

  // ── Planes de alimentación ───────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS planes_alimentacion (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id         INT NOT NULL,
      fecha               DATE NOT NULL,
      tipo_dieta          VARCHAR(120),
      calorias_dia        INT,
      carbohidratos_g     DECIMAL(6,1),
      proteinas_g         DECIMAL(6,1),
      grasas_g            DECIMAL(6,1),
      fibra_g             DECIMAL(6,1),
      distribucion        VARCHAR(255),
      restricciones       VARCHAR(255),
      observaciones       TEXT,
      elaborado_por       VARCHAR(120),
      creado_en           DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);
  console.log("✔ Tabla planes_alimentacion OK");

  await db.end();
  console.log("✅ Migración 7 completada.");
}

run().catch(err => { console.error(err); process.exit(1); });
