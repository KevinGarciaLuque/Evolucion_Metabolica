/**
 * migrate_fix_produccion.cjs
 * ─────────────────────────────────────────────────────────────────
 * Script de migración consolidada para producción.
 * Agrega de forma segura TODAS las columnas que pueden faltar en la
 * tabla `pacientes` si las migraciones individuales no se ejecutaron.
 *
 * Uso:
 *   node migrate_fix_produccion.cjs
 *
 * (con las variables de entorno DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT configuradas)
 */

const mysql = require("mysql2/promise");
require("dotenv").config();

const COLUMNAS = [
  // migrate.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN institucion ENUM('HMEP','IHSS') NOT NULL DEFAULT 'HMEP' AFTER departamento" },
  { sql: "ALTER TABLE pacientes ADD COLUMN hba1c_previo DECIMAL(5,2) NULL AFTER tipo_diabetes" },
  { sql: "ALTER TABLE pacientes ADD COLUMN telefono VARCHAR(120) NULL AFTER hba1c_previo" },

  // migrate2.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN procedencia_tipo VARCHAR(50) NULL AFTER municipio" },
  { sql: "ALTER TABLE pacientes ADD COLUMN tipo_insulina VARCHAR(200) NULL" },
  { sql: "ALTER TABLE pacientes ADD COLUMN dosis_por_kg VARCHAR(50) NULL AFTER tipo_insulina" },
  { sql: "ALTER TABLE pacientes ADD COLUMN promedio_glucometrias VARCHAR(50) NULL AFTER dosis_por_kg" },

  // migrate3.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN edad_debut TINYINT UNSIGNED NULL COMMENT 'Edad al diagnóstico de diabetes (años)' AFTER fecha_nacimiento" },
  { sql: "ALTER TABLE pacientes ADD COLUMN direccion VARCHAR(255) NULL AFTER procedencia_tipo" },

  // migrate4.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN municipio VARCHAR(120) NULL AFTER departamento" },
  { sql: "ALTER TABLE pacientes ADD COLUMN antecedente_familiar TEXT NULL AFTER direccion" },
  { sql: "ALTER TABLE pacientes ADD COLUMN subtipo_monogenica VARCHAR(80) NULL AFTER tipo_diabetes" },
  { sql: "ALTER TABLE pacientes ADD COLUMN nombre_tutor VARCHAR(200) NULL AFTER telefono" },
  { sql: "ALTER TABLE pacientes ADD COLUMN telefono_tutor VARCHAR(120) NULL AFTER nombre_tutor" },

  // migrate5.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN tipo_insulina_2 VARCHAR(200) NULL AFTER tipo_insulina" },

  // migrate6.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN anticuerpos VARCHAR(300) NULL AFTER tipo_insulina_2" },

  // migrate_dosis_insulina.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN dosis_insulina_prolongada VARCHAR(100) NULL AFTER tipo_insulina" },
  { sql: "ALTER TABLE pacientes ADD COLUMN dosis_insulina_corta VARCHAR(100) NULL AFTER tipo_insulina_2" },

  // migrate_monitor.cjs
  { sql: "ALTER TABLE pacientes ADD COLUMN con_monitor TINYINT(1) NOT NULL DEFAULT 0" },
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "railway",
  });

  console.log("🔧 Iniciando migración de corrección para producción...\n");

  let agregadas = 0;
  let omitidas  = 0;
  let errores   = 0;

  for (const { sql } of COLUMNAS) {
    const colMatch = sql.match(/ADD COLUMN (\w+)/);
    const col = colMatch ? colMatch[1] : sql.substring(0, 60);
    try {
      await conn.query(sql);
      console.log(`  ✅ ${col} — agregada`);
      agregadas++;
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  ⏭  ${col} — ya existe`);
        omitidas++;
      } else {
        console.error(`  ❌ ${col} — ERROR: ${e.message}`);
        errores++;
      }
    }
  }

  await conn.end();

  console.log("\n────────────────────────────────────");
  console.log(`  Agregadas : ${agregadas}`);
  console.log(`  Ya existían: ${omitidas}`);
  console.log(`  Errores   : ${errores}`);
  if (errores === 0) {
    console.log("\n🎉 Migración completada sin errores.");
  } else {
    console.log("\n⚠️  Migración completada con errores. Revisa los mensajes anteriores.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
