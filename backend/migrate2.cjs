/**
 * Migración 2 – Campos completos para hoja IHSS
 * Agrega a `pacientes`:  procedencia_tipo, tipo_insulina, dosis_por_kg, promedio_glucometrias
 * Agrega a `analisis`:   fecha_colocacion, tar_alto, tbr_bajo,
 *                        se_modifico_dosis, dosis_modificada, hba1c_post_mcg,
 *                        limitacion_internet, limitacion_alergias, limitacion_economica,
 *                        calidad_vida, comentarios
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const ALTERACIONES = [
  // ── pacientes ────────────────────────────────────────────────────────────
  "ALTER TABLE pacientes ADD COLUMN procedencia_tipo ENUM('Urbana','Rural') NULL AFTER departamento",
  "ALTER TABLE pacientes ADD COLUMN tipo_insulina VARCHAR(200) NULL AFTER hba1c_previo",
  "ALTER TABLE pacientes ADD COLUMN dosis_por_kg VARCHAR(50) NULL AFTER tipo_insulina",
  "ALTER TABLE pacientes ADD COLUMN promedio_glucometrias VARCHAR(50) NULL AFTER dosis_por_kg",

  // ── analisis ─────────────────────────────────────────────────────────────
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

async function migrar() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  console.log('🔧 Iniciando migración 2...\n');

  for (const sql of ALTERACIONES) {
    try {
      await conn.query(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
      console.log(`  ✅ ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
        console.log(`  ⏭  Ya existe: ${col}`);
      } else {
        console.error(`  ❌ ${e.message}\n     SQL: ${sql.substring(0, 90)}`);
      }
    }
  }

  await conn.end();
  console.log('\n🎉 Migración 2 completada');
}

migrar().catch(e => { console.error(e); process.exit(1); });
