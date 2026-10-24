/**
 * Migración – Agrega soporte de "Traslado / Baja" de paciente
 * Columnas en `pacientes`:
 *   trasladado             TINYINT(1)  - 1 si el paciente fue trasladado/dado de baja
 *   fecha_traslado         DATE        - fecha en que se registró el traslado
 *   motivo_traslado        VARCHAR(150)- motivo (preset o texto libre "Otro: ...")
 *   destino_traslado       VARCHAR(200)- institución/país/lugar destino (opcional)
 *   observaciones_traslado TEXT        - notas adicionales (opcional)
 *   trasladado_por         VARCHAR(150)- nombre de quien registró el traslado
 *   trasladado_en          DATETIME    - timestamp del registro
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

const COLUMNAS = [
  { sql: "ALTER TABLE pacientes ADD COLUMN trasladado TINYINT(1) NOT NULL DEFAULT 0 AFTER con_monitor" },
  { sql: "ALTER TABLE pacientes ADD COLUMN fecha_traslado DATE NULL AFTER trasladado" },
  { sql: "ALTER TABLE pacientes ADD COLUMN motivo_traslado VARCHAR(150) NULL AFTER fecha_traslado" },
  { sql: "ALTER TABLE pacientes ADD COLUMN destino_traslado VARCHAR(200) NULL AFTER motivo_traslado" },
  { sql: "ALTER TABLE pacientes ADD COLUMN observaciones_traslado TEXT NULL AFTER destino_traslado" },
  { sql: "ALTER TABLE pacientes ADD COLUMN trasladado_por VARCHAR(150) NULL AFTER observaciones_traslado" },
  { sql: "ALTER TABLE pacientes ADD COLUMN trasladado_en DATETIME NULL AFTER trasladado_por" },
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "railway",
  });

  console.log("🔧 Iniciando migración: traslado de paciente...\n");

  for (const { sql } of COLUMNAS) {
    const col = sql.match(/ADD COLUMN (\w+)/)[1];
    try {
      await conn.query(sql);
      console.log(`  ✅ ${col} — agregada`);
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  ⏭  ${col} — ya existe`);
      } else {
        console.error(`  ❌ ${col} — ERROR: ${e.message}`);
      }
    }
  }

  await conn.end();
  console.log("\n🎉 Migración de traslado completada");
}

run().catch(console.error);
