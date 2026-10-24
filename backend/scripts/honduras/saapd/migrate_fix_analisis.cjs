/**
 * migrate_fix_analisis.cjs
 * ─────────────────────────────────────────────────────────────────
 * Agrega de forma SEGURA todas las columnas faltantes en la tabla
 * `analisis` para producción Railway.
 * Si la columna ya existe, la omite sin error.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

const COLUMNAS = [
  // migrate.cjs
  "ALTER TABLE analisis ADD COLUMN numero_registro TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER paciente_id",
  "ALTER TABLE analisis ADD COLUMN tar_muy_alto DECIMAL(5,2) NULL AFTER tar",
  "ALTER TABLE analisis ADD COLUMN tbr_muy_bajo DECIMAL(5,2) NULL AFTER tbr",
  "ALTER TABLE analisis ADD COLUMN duracion_hipo_texto VARCHAR(30) NULL AFTER duracion_hipoglucemia",
  "ALTER TABLE analisis ADD COLUMN dosis_insulina_post VARCHAR(200) NULL AFTER archivo_pdf",

  // migrate2.cjs
  "ALTER TABLE analisis ADD COLUMN fecha_colocacion DATE NULL AFTER fecha",
  "ALTER TABLE analisis ADD COLUMN tar_alto DECIMAL(5,2) NULL AFTER tar_muy_alto",
  "ALTER TABLE analisis ADD COLUMN tbr_bajo DECIMAL(5,2) NULL AFTER tbr",
  "ALTER TABLE analisis ADD COLUMN se_modifico_dosis TINYINT(1) NULL AFTER dosis_insulina_post",
  "ALTER TABLE analisis ADD COLUMN dosis_modificada VARCHAR(200) NULL AFTER se_modifico_dosis",
  "ALTER TABLE analisis ADD COLUMN hba1c_post_mcg DECIMAL(4,2) NULL AFTER dosis_modificada",
  "ALTER TABLE analisis ADD COLUMN limitacion_internet TINYINT(1) NOT NULL DEFAULT 0 AFTER hba1c_post_mcg",
  "ALTER TABLE analisis ADD COLUMN limitacion_alergias TINYINT(1) NOT NULL DEFAULT 0 AFTER limitacion_internet",
  "ALTER TABLE analisis ADD COLUMN limitacion_economica TINYINT(1) NOT NULL DEFAULT 0 AFTER limitacion_alergias",
  "ALTER TABLE analisis ADD COLUMN calidad_vida ENUM('Buena','Mala','Igual') NULL AFTER limitacion_economica",
  "ALTER TABLE analisis ADD COLUMN comentarios TEXT NULL AFTER calidad_vida",
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "railway",
  });

  console.log("🔧 Corrigiendo columnas de la tabla analisis...\n");

  for (const sql of COLUMNAS) {
    const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
    try {
      await conn.query(sql);
      console.log(`  ✅ ${col} — agregada`);
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  ⏭️  ${col} — ya existe`);
      } else {
        console.error(`  ❌ ${col} — ${e.message}`);
      }
    }
  }

  await conn.end();
  console.log("\n✅ Migración finalizada.");
}

run().catch(e => { console.error("Error fatal:", e.message); process.exit(1); });
