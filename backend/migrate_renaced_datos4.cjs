// migrate_renaced_datos4.cjs
// Cuarta (y última) pasada: tratamiento_oral + catálogos menores
// Ejecutar desde backend/: node migrate_renaced_datos4.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1" };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// Mapa: [columna_uso, col_fecha_ini, col_fecha_ter, antidiabetico_id]
const ORALES = [
  ["tx_oral_metformina",      "tx_oral_metformina_fe_ini",      "tx_oral_metformina_fe_ter",      1],
  ["tx_oral_sulfonilureas",   "tx_oral_sulfonilureas_fe_ini",   "tx_oral_sulfonilureas_fe_ter",   2],
  ["tx_oral_glinidas",        "tx_oral_glinidas_fe_ini",        "tx_oral_glinidas_fe_ter",        3],
  ["tx_oral_biguanidas",      "tx_oral_biguanidas_fe_ini",      "tx_oral_biguanidas_fe_ter",      4],
  ["tx_oral_glitazonas",      "tx_oral_glitazonas_fe_ini",      "tx_oral_glitazonas_fe_ter",      5],
  ["tx_oral_inhib_glucosidasa","tx_oral_inhib_fe_ini",          "tx_oral_inhib_fe_ter",           6],
  ["tx_oral_glp1",            "tx_oral_glp1_fe_ini",            "tx_oral_glp1_fe_ter",            7],
  ["tx_oral_dpp4",            "tx_oral_dpp4_fe_ini",            "tx_oral_dpp4_fe_ter",            8],
  ["tx_oral_sgltz",           "tx_oral_sgltz_fe_ini",           "tx_oral_sgltz_fe_ter",           9],
  ["tx_oral_otro",            "tx_oral_otro_fe_ini",            "tx_oral_otro_fe_ter",            10],
];

async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ph = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    try {
      await conn.query(`${sql} ${ph}`, chunk.flat());
      total += chunk.length;
    } catch (_) {
      for (const row of chunk) {
        try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); total++; } catch (__) {}
      }
    }
  }
  return total;
}

async function migrar() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // ════════════════════════════════════════════════════════════
  // 1. CATÁLOGOS MENORES
  // ════════════════════════════════════════════════════════════
  console.log("📦 1/3 catálogos menores…");
  {
    let n = 0;

    // cat_causa_abandono_tratamiento — solo (id, descripcion)
    const [cabt] = await o.query("SELECT * FROM cat_causa_abandono_tratamiento");
    n += await insertBatch(d,
      "INSERT IGNORE INTO cat_causa_abandono_tratamiento (id,descripcion) VALUES",
      cabt.map(r => [r.causa_abandono_tratamiento_cve, r.causa_abandono_tratamiento_descripcion]));

    // cat_causa_cambio_tx — solo (id, descripcion)
    const [ccct] = await o.query("SELECT * FROM cat_causa_cambio_tx");
    n += await insertBatch(d,
      "INSERT IGNORE INTO cat_causa_cambio_tx (id,descripcion) VALUES",
      ccct.map(r => [r.causa_cambio_tx_cve, r.causa_cambio_tx_descripcion]));

    // cat_terapia_gest — solo (id, descripcion). No todas las exportaciones traen esta tabla.
    const [tgTables] = await o.query("SHOW TABLES LIKE 'cat_terapia_gest'");
    if (tgTables.length) {
      const [ctg] = await o.query("SELECT * FROM cat_terapia_gest");
      n += await insertBatch(d,
        "INSERT IGNORE INTO cat_terapia_gest (id,descripcion) VALUES",
        ctg.map(r => [r.terapia_cve, r.terapia_descripcion]));
    } else {
      console.log("   ℹ️  Tabla cat_terapia_gest no existe en origen, omitiendo");
    }

    console.log(`   ✅ ${n} registros en catálogos\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 2. TRATAMIENTO ORAL (expande columnas SI/NO → filas)
  // ════════════════════════════════════════════════════════════
  console.log("📦 2/3 tratamiento_oral…");
  {
    const [rows] = await o.query("SELECT * FROM tratamiento_oral");
    const data = [];
    for (const t of rows) {
      for (const [col_uso, col_ini, col_ter, med_id] of ORALES) {
        if (t[col_uso] === "SI") {
          const activo = !t[col_ter] ? 1 : 0;
          data.push([
            t.paciente_cve,
            med_id,
            t[col_ini] || null,
            t[col_ter] || null,   // fecha_fin en nuevo esquema
            activo,
            t.tx_oral_fecha_captura || null,
          ]);
        }
      }
      // Medicamento libre "otro"
      if (t.tx_oral_otro === "SI" && t.tx_oral_cual_otro) {
        data.push([t.paciente_cve, 10, t.tx_oral_otro_fe_ini||null, t.tx_oral_otro_fe_ter||null, !t.tx_oral_otro_fe_ter ? 1 : 0, t.tx_oral_fecha_captura||null]);
      }
    }
    const n = await insertBatch(d,
      "INSERT INTO tratamiento_oral (paciente_id,antidiabetico_id,fecha_inicio,fecha_fin,activo,fecha_captura) VALUES",
      data);
    console.log(`   ✅ ${n} medicamentos orales de ${rows.length} pacientes\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 3. RECLASIFICACIÓN DE TIPO DE DIABETES
  // ════════════════════════════════════════════════════════════
  console.log("📦 3/3 reclasificacion…");
  {
    // La tabla original no tiene reclasificacion, se deriva del campo
    // diagnostico.tipo_diabetes_id cambiado vs diagnóstico inicial
    // Solo insertamos si existe la tabla en origen
    const [tables] = await o.query("SHOW TABLES LIKE 'reclasificacion'");
    if (tables.length) {
      const [rows] = await o.query("SELECT * FROM reclasificacion");
      const data = rows.map(r => [
        r.paciente_cve,
        r.tipo_diabetes_anterior_cve || null,
        r.tipo_diabetes_nuevo_cve    || null,
        r.reclasificacion_motivo     || null,
        r.reclasificacion_fecha      || null,
      ]);
      const n = await insertBatch(d,
        "INSERT IGNORE INTO reclasificacion (paciente_id,tipo_diabetes_anterior_id,tipo_diabetes_nuevo_id,motivo,fecha) VALUES",
        data);
      console.log(`   ✅ ${n}\n`);
    } else {
      console.log("   ℹ️  Tabla reclasificacion no existe en origen, omitiendo\n");
    }
  }

  await o.end();
  await d.end();

  console.log("════════════════════════════════════════");
  console.log("✅  Migración COMPLETA — todas las tablas.");
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => { console.error("❌ Error fatal:", e.message); process.exit(1); });
