// migrate_renaced_evaluacion_complementaria.cjs
// Migra "Evaluaciones Complementarias" (origen: evaluacion -> campos eval_*):
// evaluación OFTALMOLÓGICA + exploración de PIES (incluye examen neurológico).
// Tabla destino NUEVA e independiente `evaluacion_complementaria` (no confundir con
// la tabla `evaluacion` del destino, que en realidad guarda Complicaciones Crónicas).
// id = evaluacion_cve (trazabilidad + inserción en lote).
// Ejecutar: node migrate_renaced_evaluacion_complementaria.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1", dateStrings: true };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// [columna_origen, columna_destino, tipo]  tipo: "date" | "flag" (SI/NO) | "neuro" (texto)
const MAP = [
  ["eval_fecha_ojos",              "fecha_ojos",            "date"],
  ["eval_sin_retinopatiad",        "ret_sin_d",             "flag"],
  ["eval_sin_retinopatiai",        "ret_sin_i",             "flag"],
  ["eval_retinopatia_no_prolifd",  "ret_no_prolif_d",       "flag"],
  ["eval_retinopatia_no_prolifi",  "ret_no_prolif_i",       "flag"],
  ["eval_retinopatia_prolifd",     "ret_prolif_d",          "flag"],
  ["eval_retinopatia_prolifi",     "ret_prolif_i",          "flag"],
  ["eval_fotocoagulaciond",        "fotocoagulacion_d",     "flag"],
  ["eval_fotocoagulacioni",        "fotocoagulacion_i",     "flag"],
  ["eval_vitrectomiad",            "vitrectomia_d",         "flag"],
  ["eval_vitrectomiai",            "vitrectomia_i",         "flag"],
  ["eval_cataratasd",              "cataratas_d",           "flag"],
  ["eval_cataratasi",              "cataratas_i",           "flag"],
  ["eval_glaucomad",               "glaucoma_d",            "flag"],
  ["eval_glaucomai",               "glaucoma_i",            "flag"],
  ["eval_maculad",                 "macula_d",              "flag"],
  ["eval_maculai",                 "macula_i",              "flag"],
  ["eval_fecha_pies",              "fecha_pies",            "date"],
  ["eval_deformadod",              "deformado_d",           "flag"],
  ["eval_deformadoi",              "deformado_i",           "flag"],
  ["eval_piel_secad",              "piel_seca_d",           "flag"],
  ["eval_piel_secai",              "piel_seca_i",           "flag"],
  ["eval_callosidadesd",           "callosidades_d",        "flag"],
  ["eval_callosidadesi",           "callosidades_i",        "flag"],
  ["eval_infecciond",              "infeccion_d",           "flag"],
  ["eval_infeccioni",              "infeccion_i",           "flag"],
  ["eval_fisurasd",                "fisuras_d",             "flag"],
  ["eval_fisurasi",                "fisuras_i",             "flag"],
  ["eval_ulceracion_agudad",       "ulceracion_aguda_d",    "flag"],
  ["eval_ulceracion_agudai",       "ulceracion_aguda_i",    "flag"],
  ["eval_ulceracion_curadad",      "ulceracion_curada_d",   "flag"],
  ["eval_ulceracion_curadai",      "ulceracion_curada_i",   "flag"],
  ["eval_angioplastiad",           "angioplastia_d",        "flag"],
  ["eval_angioplastiai",           "angioplastia_i",        "flag"],
  ["eval_onicomicosisd",           "onicomicosis_d",        "flag"],
  ["eval_onicomicosisi",           "onicomicosis_i",        "flag"],
  ["eval_vibraciond",              "vibracion_d",           "neuro"],
  ["eval_vibracioni",              "vibracion_i",           "neuro"],
  ["eval_monofilamentod",          "monofilamento_d",       "neuro"],
  ["eval_monofilamentoi",          "monofilamento_i",       "neuro"],
  ["eval_aquilianod",              "aquiliano_d",           "neuro"],
  ["eval_aquilianoi",              "aquiliano_i",           "neuro"],
  ["eval_pediod",                  "pedio_d",               "neuro"],
  ["eval_pedioi",                  "pedio_i",               "neuro"],
];

const soloFecha = (v) => { if (!v) return null; const s = String(v); return s.length >= 10 ? s.slice(0, 10) : null; };
const txt = (v) => { if (v === null || v === undefined) return null; const s = String(v).trim(); return s === "" ? null : s; };
const conv = (tipo, v) => tipo === "date" ? soloFecha(v) : txt(v);
const tipoSql = (tipo) => tipo === "date" ? "DATE" : tipo === "neuro" ? "VARCHAR(8)" : "VARCHAR(4)";

async function tablaExiste(conn, db, t) {
  const [r] = await conn.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, t]);
  return r[0].n > 0;
}

async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ph = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    try { await conn.query(`${sql} ${ph}`, chunk.flat()); total += chunk.length; }
    catch (e) { for (const row of chunk) { try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); total++; } catch (__) {} } }
  }
  return total;
}

async function run() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  await o.query("SET time_zone='+00:00'");
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // 1) Crear tabla si no existe (generada desde MAP)
  if (!(await tablaExiste(d, CFG_DESTINO.database, "evaluacion_complementaria"))) {
    console.log("📦 Creando tabla evaluacion_complementaria…");
    const colsDef = MAP.map(([, dst, tipo]) => `${dst} ${tipoSql(tipo)} DEFAULT NULL`).join(",\n        ");
    await d.query(`
      CREATE TABLE evaluacion_complementaria (
        id BIGINT UNSIGNED NOT NULL,
        paciente_id BIGINT UNSIGNED NOT NULL,
        fecha_captura DATETIME DEFAULT NULL,
        ${colsDef},
        PRIMARY KEY (id),
        KEY idx_evalcomp_paciente (paciente_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else {
    console.log("   ℹ evaluacion_complementaria ya existe");
  }

  // 2) Guarda anti-duplicado
  const [[{ n: yaHay }]] = await d.query("SELECT COUNT(*) n FROM evaluacion_complementaria");
  if (yaHay > 0) {
    console.log(`\n⛔ evaluacion_complementaria ya tiene ${yaHay} filas. Aborto para no duplicar.`);
    await o.end(); await d.end();
    return;
  }

  // 3) Pacientes válidos
  const [pacRows] = await d.query("SELECT id FROM paciente");
  const validos = new Set(pacRows.map(r => Number(r.id)));

  // 4) Origen
  const [rows] = await o.query("SELECT * FROM evaluacion ORDER BY evaluacion_cve ASC");
  console.log(`\n   origen: ${rows.length} registros`);

  const destCols = ["id", "paciente_id", "fecha_captura", ...MAP.map(([, dst]) => dst)];
  const data = [];
  let huerfanos = 0;
  for (const r of rows) {
    const pid = Number(r.paciente_cve);
    if (!validos.has(pid)) { huerfanos++; continue; }
    const fila = [
      Number(r.evaluacion_cve), pid,
      r.evaluacion_fecha_captura ? String(r.evaluacion_fecha_captura) : null,
      ...MAP.map(([src, , tipo]) => conv(tipo, r[src])),
    ];
    data.push(fila);
  }

  console.log(`   filas a insertar: ${data.length}  |  sin paciente válido: ${huerfanos}`);
  const sql = `INSERT INTO evaluacion_complementaria (${destCols.join(",")}) VALUES`;
  const ok = await insertBatch(d, sql, data);

  const [[{ n: total }]] = await d.query("SELECT COUNT(*) n FROM evaluacion_complementaria");
  const [[{ n: pac }]] = await d.query("SELECT COUNT(DISTINCT paciente_id) n FROM evaluacion_complementaria");
  const [[{ n: conOjos }]] = await d.query("SELECT COUNT(*) n FROM evaluacion_complementaria WHERE fecha_ojos IS NOT NULL");
  const [[{ n: conPies }]] = await d.query("SELECT COUNT(*) n FROM evaluacion_complementaria WHERE fecha_pies IS NOT NULL");
  console.log(`\n✅ insertadas: ${ok}  |  total: ${total}  |  pacientes: ${pac}  |  con eval. ojos: ${conOjos}  |  con eval. pies: ${conPies}`);

  await o.end(); await d.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
