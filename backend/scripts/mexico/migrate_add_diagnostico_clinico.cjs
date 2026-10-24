// migrate_add_diagnostico_clinico.cjs
// Agrega columnas clínicas a la tabla diagnostico (datos al momento del dx)
// Ejecutar: node backend/migrate_add_diagnostico_clinico.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function migrate() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port:     process.env.DB_PORT,
    database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
    multipleStatements: true,
  });

  console.log("\n🏥 Agregando columnas clínicas a tabla diagnostico…\n");

  const columnas = [
    // ── Fecha exacta vs aproximada ───────────────────────────────────
    ["fecha_approx",              "TINYINT(1) NOT NULL DEFAULT 0",       "fecha_diagnostico"],
    ["fecha_approx_anio",         "SMALLINT UNSIGNED DEFAULT NULL",       "fecha_approx"],
    ["fecha_approx_mes",          "TINYINT UNSIGNED DEFAULT NULL",        "fecha_approx_anio"],

    // ── Somatometría al diagnóstico ──────────────────────────────────
    ["peso",                      "DECIMAL(5,2) DEFAULT NULL",            "fecha_approx_mes"],
    ["estatura",                  "DECIMAL(4,2) DEFAULT NULL",            "peso"],
    ["imc",                       "DECIMAL(5,2) DEFAULT NULL",            "estatura"],
    ["pa_sistolica",              "SMALLINT UNSIGNED DEFAULT NULL",       "imc"],
    ["pa_diastolica",             "SMALLINT UNSIGNED DEFAULT NULL",       "pa_sistolica"],

    // ── Cetoacidosis ─────────────────────────────────────────────────
    ["cetoacidosis",              "CHAR(2) DEFAULT NULL",                 "pa_diastolica"],
    ["cetoacidosis_ph",           "DECIMAL(4,2) DEFAULT NULL",            "cetoacidosis"],
    ["cetoacidosis_bicarbonato",  "DECIMAL(5,2) DEFAULT NULL",            "cetoacidosis_ph"],

    // ── Laboratorio al diagnóstico ───────────────────────────────────
    ["glucemia_azar",             "DECIMAL(7,2) DEFAULT NULL",            "cetoacidosis_bicarbonato"],
    ["hba1c",                     "DECIMAL(5,2) DEFAULT NULL",            "glucemia_azar"],
    ["hba1c_fecha",               "DATE DEFAULT NULL",                    "hba1c"],
    ["peptido_c",                 "DECIMAL(7,3) DEFAULT NULL",            "hba1c_fecha"],

    // ── Anticuerpos (POS/NEG + valor numérico) ───────────────────────
    ["anti_gad",                  "CHAR(3) DEFAULT NULL",                 "peptido_c"],
    ["anti_gad_valor",            "DECIMAL(9,2) DEFAULT NULL",            "anti_gad"],
    ["anti_insulina",             "CHAR(3) DEFAULT NULL",                 "anti_gad_valor"],
    ["anti_insulina_valor",       "DECIMAL(9,2) DEFAULT NULL",            "anti_insulina"],
    ["anti_islotes",              "CHAR(3) DEFAULT NULL",                 "anti_insulina_valor"],
    ["anti_islotes_valor",        "DECIMAL(9,2) DEFAULT NULL",            "anti_islotes"],
    ["anti_ia2",                  "CHAR(3) DEFAULT NULL",                 "anti_islotes_valor"],
    ["anti_ia2_valor",            "DECIMAL(9,2) DEFAULT NULL",            "anti_ia2"],
    ["anti_zct8",                 "CHAR(3) DEFAULT NULL",                 "anti_ia2_valor"],
    ["anti_zct8_valor",           "DECIMAL(9,2) DEFAULT NULL",            "anti_zct8"],

    // ── Hospitalización al diagnóstico ───────────────────────────────
    ["hospitalizacion",           "CHAR(2) DEFAULT NULL",                 "anti_zct8_valor"],
    ["hospitalizacion_dias",      "SMALLINT UNSIGNED DEFAULT NULL",       "hospitalizacion"],
    ["terapia_intensiva",         "CHAR(2) DEFAULT NULL",                 "hospitalizacion_dias"],
    ["terapia_intensiva_dias",    "SMALLINT UNSIGNED DEFAULT NULL",       "terapia_intensiva"],

    // ── Antecedentes familiares ──────────────────────────────────────
    ["antec_dm1",                 "CHAR(2) DEFAULT NULL",                 "terapia_intensiva_dias"],
    ["antec_dm1_grado",           "TINYINT UNSIGNED DEFAULT NULL",        "antec_dm1"],
    ["antec_dm2",                 "CHAR(2) DEFAULT NULL",                 "antec_dm1_grado"],
    ["antec_dm2_grado",           "TINYINT UNSIGNED DEFAULT NULL",        "antec_dm2"],

    // ── Antecedentes personales ──────────────────────────────────────
    ["nacido_por",                "VARCHAR(20) DEFAULT NULL",             "antec_dm2_grado"],
    ["lactancia_materna",         "CHAR(2) DEFAULT NULL",                 "nacido_por"],
    ["hipotiroidismo_dx",         "CHAR(2) DEFAULT NULL",                 "lactancia_materna"],

    // ── Tratamiento prescrito al diagnóstico ─────────────────────────
    ["terapia_id",                "SMALLINT UNSIGNED DEFAULT NULL",       "hipotiroidismo_dx"],
    ["esquema_insulina_id",       "SMALLINT UNSIGNED DEFAULT NULL",       "terapia_id"],
    ["calculo_dosis_id",          "SMALLINT UNSIGNED DEFAULT NULL",       "esquema_insulina_id"],
    ["dosis_prescrita",           "DECIMAL(6,2) DEFAULT NULL",            "calculo_dosis_id"],
    ["dispositivo_id",            "SMALLINT UNSIGNED DEFAULT NULL",       "dosis_prescrita"],
    ["institucion_id",            "SMALLINT UNSIGNED DEFAULT NULL",       "dispositivo_id"],

    // ── MODY específico ──────────────────────────────────────────────
    ["tipo_mody",                 "VARCHAR(50) DEFAULT NULL",             "institucion_id"],
    ["confirmacion_genetica",     "CHAR(2) DEFAULT NULL",                 "tipo_mody"],
    ["mutacion",                  "VARCHAR(100) DEFAULT NULL",            "confirmacion_genetica"],

    // ── LADA específico ──────────────────────────────────────────────
    ["lada_fecha_insulina",       "DATE DEFAULT NULL",                    "mutacion"],
    ["lada_fecha_approx",         "TINYINT(1) NOT NULL DEFAULT 0",       "lada_fecha_insulina"],
  ];

  // Obtener columnas existentes
  const [existing] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'diagnostico'`,
    [process.env.RENACED_MX_DB_NAME || "renaced_mexico"]
  );
  const existingSet = new Set(existing.map((r) => r.COLUMN_NAME));

  let added = 0, skipped = 0;
  for (const [col, def, after] of columnas) {
    if (existingSet.has(col)) {
      console.log(`  ⏭  ${col} (ya existe)`);
      skipped++;
      continue;
    }
    try {
      await conn.query(`ALTER TABLE diagnostico ADD COLUMN \`${col}\` ${def} AFTER \`${after}\``);
      console.log(`  ✅ ${col}`);
      added++;
    } catch (e) {
      console.error(`  ❌ ${col}: ${e.message}`);
    }
  }

  await conn.end();
  console.log(`\n✅ Listo — ${added} columnas agregadas, ${skipped} ya existían.\n`);
}

migrate().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
