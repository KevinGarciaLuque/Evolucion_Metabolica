// migrate_renaced_datos2.cjs  v2
// Segunda pasada: catálogos + datos clínicos restantes
// Ejecutar: node migrate_renaced_datos2.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1", dateStrings: true };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// Mapa insulina: [columna_uso, columna_dosis, insulina_id]
const INSULINAS = [
  ["tx_insul_nph",             "tx_insul_dosis_nph",              1 ],
  ["tx_insul_glargina",        "tx_insul_dosis_glargina",         2 ],
  ["tx_insul_detemir",         "tx_insul_dosis_detemir",          3 ],
  ["tx_insul_degludec",        "tx_insul_dosis_degludec",         4 ],
  ["tx_insul_rapida",          "tx_insul_dosis_rapida",           5 ],
  ["tx_insul_lispro",          "tx_insul_dosis_lispro",           6 ],
  ["tx_insul_aspart",          "tx_insul_dosis_aspart",           7 ],
  ["tx_insul_glulisina",       "tx_insul_dosis_glulisina",        8 ],
  ["tx_insul_nph_r",           "tx_insul_dosis_nph_r",            9 ],
  ["tx_insul_lispro_lispro_1", "tx_insul_dosis_lispro_lispro_1",  10],
  ["tx_insul_lispro_lispro_2", "tx_insul_dosis_lispro_lispro_2",  11],
  ["tx_insul_aspart_aspart",   "tx_insul_dosis_aspart_aspart",    12],
  ["tx_insul_lenta",           "tx_insul_dosis_lenta",            13],
  ["tx_insul_glargina_u300",   "tx_insul_dosis_glargina_u300",    18],
  ["tx_insul_fiasp",           "tx_insul_dosis_fiasp",            19],
  ["tx_insul_lyumjev",         "tx_insul_dosis_lyumjev",          20],
  ["tx_insul_degludec_aspart", "tx_insul_dosis_degludec_aspart",  16],
  ["tx_insul_otra",            "tx_insul_dosis_otra",             17],
];

// Inserta en lotes para reducir round-trips a Railway
async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    const values = chunk.flat();
    try {
      await conn.query(`${sql} ${placeholders}`, values);
      inserted += chunk.length;
    } catch (e) {
      // Intenta fila por fila si el batch falla
      for (const row of chunk) {
        try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); inserted++; }
        catch (_) {}
      }
    }
  }
  return inserted;
}

async function migrar() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // ════════════════════════════════════════════════════════════
  // 1. CATÁLOGOS
  // ════════════════════════════════════════════════════════════

  console.log("📦 1/18 cat_tipo_diabetes…");
  { const [rows] = await o.query("SELECT * FROM cat_tipo_diabetes");
    const data = rows.map(r => [r.tipo_diabetes_cve, r.tipo_diabetes_nombre, r.tipo_diabetes_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_tipo_diabetes (id,clave,descripcion) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 2/18 cat_tipo_diabetes_otras…");
  { const [rows] = await o.query("SELECT * FROM cat_tipo_diabetes_otras");
    const data = rows.map(r => [r.tipo_diabetes_otras_cve, r.tipo_diabetes_otras_nombre, r.tipo_diabetes_otras_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_tipo_diabetes_otras (id,clave,descripcion) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 3/18 cat_insulina…");
  { const [rows] = await o.query("SELECT * FROM cat_insulina");
    const data = rows.map(r => [r.insulina_cve, r.insulina_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_insulina (id,nombre) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 4/18 cat_terapia…");
  { const [rows] = await o.query("SELECT * FROM cat_terapia");
    const data = rows.map(r => [r.terapia_cve, r.terapia_nombre, r.terapia_descripcion || r.terapia_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_terapia (id,clave,descripcion) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 5/18 cat_esquemas_insulinas…");
  { const [rows] = await o.query("SELECT * FROM cat_esquemas_insulinas");
    const data = rows.map(r => [r.esquemas_insulinas_cve, r.esquemas_insulinas_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_esquemas_insulinas (id,descripcion) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 6/18 cat_dispositivo…");
  { const [rows] = await o.query("SELECT * FROM cat_dispositivo");
    const data = rows.map(r => [r.dispositivo_cve, r.dispositivo_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_dispositivo (id,descripcion) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 7/18 cat_antidiabetico…");
  { const [rows] = await o.query("SELECT * FROM cat_antidiabetico");
    const data = rows.map(r => [r.antidiabetico_cve, r.antidiabetico_nombre]);
    const n = await insertBatch(d, "INSERT IGNORE INTO cat_antidiabetico (id,nombre) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 8/18 cat_nivel_educativo + cat_nivel_ingreso + cat_institucion_ss…");
  { let n = 0;
    const [cne] = await o.query("SELECT * FROM cat_nivel_educativo");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_nivel_educativo (id,descripcion) VALUES",
      cne.map(r => [r.nivel_educativo_cve, r.nivel_educativo_nombre]));
    const [cni] = await o.query("SELECT * FROM cat_nivel_ingreso");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_nivel_ingreso (id,descripcion) VALUES",
      cni.map(r => [r.nivel_ingreso_cve, r.nivel_ingreso_nombre]));
    const [ciss] = await o.query("SELECT * FROM cat_institucion_ss");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_institucion_ss (id,siglas,nombre) VALUES",
      ciss.map(r => [r.institucion_ss_cve, (r.institucion_ss_siglas || r.institucion_ss_nombre || "").substring(0,20), r.institucion_ss_nombre]));
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 9/18 cat_nefropatia + cat_retinopatia + cat_neuropatia + cat_pie_diabetico + cat_enf_cardiovascular…");
  { let n = 0;
    for (const [tbl_orig, cve, nom, tbl_dest] of [
      ["cat_nefropatia",   "nefropatia_cve",   "nefropatia_nombre",   "cat_nefropatia"],
      ["cat_retinopatia",  "retinopatia_cve",  "retinopatia_nombre",  "cat_retinopatia"],
      ["cat_neuropatia",   "neuropatia_cve",   "neuropatia_nombre",   "cat_neuropatia"],
      ["cat_neuropatia_autonomica","neuropatia_autonomica_cve","neuropatia_autonomica_nombre","cat_neuropatia_autonomica"],
      ["cat_pie_diabetico","pie_diabetico_cve", "pie_diabetico_nombre","cat_pie_diabetico"],
    ]) {
      const [rows] = await o.query(`SELECT * FROM ${tbl_orig}`);
      n += await insertBatch(d, `INSERT IGNORE INTO ${tbl_dest} (id,descripcion) VALUES`, rows.map(r => [r[cve], r[nom]]));
    }
    // cat_enfermedad_cardiovascular_periferica (nombre completo en nuestra DB)
    const [ccard] = await o.query("SELECT * FROM cat_enfermedad_cardiovascular_periferica");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_enfermedad_cardiovascular_periferica (id,descripcion) VALUES",
      ccard.map(r => [r.enfermedad_cardiovascular_periferica_cve, r.enfermedad_cardiovascular_periferica_nombre]));
    const [cvp] = await o.query("SELECT * FROM cat_enfermedad_vascular_periferica");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_enfermedad_vascular_periferica (id,descripcion) VALUES",
      cvp.map(r => [r.enfermedad_vascular_periferica_cve, r.enfermedad_vascular_periferica_nombre]));
    console.log(`   ✅ ${n}\n`); }

  console.log("📦 10/18 cat_microinfusora + sub + cat_glucometro + cat_monit_glucosa…");
  { let n = 0;
    const [cmi] = await o.query("SELECT * FROM cat_microinfusora");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_microinfusora (id,marca) VALUES",
      cmi.map(r => [r.microinfusora_cve, r.microinfusora_nombre]));
    const [csmi] = await o.query("SELECT * FROM cat_sub_microinfusora");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_sub_microinfusora (id,microinfusora_id,modelo) VALUES",
      csmi.map(r => [r.sub_microinfusora_cve, r.microinfusora_cve, r.sub_microinfusora_nombre]));
    const [cgl] = await o.query("SELECT * FROM cat_glucometro");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_glucometro (id,marca) VALUES",
      cgl.map(r => [r.glucometro_cve, r.glucometro_nombre]));
    const [cmg] = await o.query("SELECT * FROM cat_monit_glucosa");
    n += await insertBatch(d, "INSERT IGNORE INTO cat_monit_glucosa (id,descripcion) VALUES",
      cmg.map(r => [r.monit_glucosa_cve, r.monit_glucosa_nombre]));
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 11. ESTABLECIMIENTO DE SALUD (clave VARCHAR PK)
  // ════════════════════════════════════════════════════════════
  console.log("📦 11/18 establecimiento_salud…");
  { const [rows] = await o.query("SELECT * FROM establecimiento_salud");
    const data = rows.map(r => [
      (r.establecimiento_salud_cve || "").substring(0, 15),
      r.establecimiento_salud_nombre || "Sin nombre",
      r.institucion_ss_cve || null,
      r.estado_cve || null,
      null,
    ]);
    const n = await insertBatch(d, "INSERT IGNORE INTO establecimiento_salud (clave,nombre,institucion_id,estado_cve,municipio_cve) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 12. TRATAMIENTO (BATCH — un lote por paciente)
  // ════════════════════════════════════════════════════════════
  console.log("📦 12/18 tratamiento + tratamiento_insulina_detalle…");
  { const [txs] = await o.query("SELECT * FROM tratamiento");
    let okTx = 0, okIns = 0;
    const insRows = [];

    for (const t of txs) {
      try {
        let esquema_id = null;
        if      (t.tx_esquem_insul_basal_bolo    === "SI") esquema_id = 4;
        else if (t.tx_esquem_insul_microinfusora  === "SI") esquema_id = 5;
        else if (t.tx_esquem_insul_basal          === "SI") esquema_id = 3;
        else if (t.tx_esquem_insul_premezcla      === "SI") esquema_id = 2;
        else if (t.tx_esquem_insul_tradicional    === "SI") esquema_id = 1;

        let disp_id = null;
        if      (t.tx_disp_microinfusora === "SI") disp_id = 3;
        else if (t.tx_disp_pluma         === "SI") disp_id = 2;
        else if (t.tx_disp_jeringa       === "SI") disp_id = 1;

        const activo = t.tx_fecha_termino ? 0 : 1;

        const [res] = await d.query(
          "INSERT INTO tratamiento (paciente_id,esquema_insulina_id,dispositivo_id,fecha_inicio,activo,fecha_captura) VALUES (?,?,?,?,?,?)",
          [t.paciente_cve, esquema_id, disp_id, t.tx_fecha_inicio||null, activo, t.tx_fecha_captura||null]
        );
        const trat_id = res.insertId;
        okTx++;

        for (const [col_uso, col_dosis, ins_id] of INSULINAS) {
          if (t[col_uso] === "SI") {
            insRows.push([trat_id, ins_id, t[col_dosis] || null]);
          }
        }
      } catch (_) {}
    }

    // Insertar todas las insulinas en un solo batch
    if (insRows.length) {
      okIns = await insertBatch(d, "INSERT IGNORE INTO tratamiento_insulina_detalle (tratamiento_id,insulina_id,dosis_unidades) VALUES", insRows);
    }
    console.log(`   ✅ ${okTx} tratamientos + ${okIns} insulinas\n`); }

  // ════════════════════════════════════════════════════════════
  // 13. EVALUACIÓN (desde ccronica)
  // ════════════════════════════════════════════════════════════
  console.log("📦 13/18 evaluacion (ccronica)…");
  { const tipo = (v, max) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max ? n : null; };
    const soloFecha = (v) => { if (!v) return null; const s = String(v); return s.length >= 10 ? s.slice(0,10) : null; };
    const [rows] = await o.query("SELECT * FROM ccronica");
    const data = rows.map(r => [
      r.paciente_cve,
      soloFecha(r.ccronica_fecha_captura),
      r.ccronica_retinopatia    === "SI" ? (r.ccronica_retinopatia_tipo    || 1) : null,
      r.ccronica_nefropatia     === "SI" ? (r.ccronica_nefropatia_tipo     || 1) : null,
      r.ccronica_neuropatia     === "SI" ? (r.ccronica_neuropatia_tipo     || 1) : null,
      tipo(r.ccronica_neuropatia_autonomica_tipo, 3),
      r.ccronica_pie_diabetico  === "SI" ? (r.ccronica_pie_diabetico_tipo  || 1) : null,
      r.ccronica_e_cardiovascular === "SI" ? (r.ccronica_e_cardiovascular_tipo || 1) : null,
      r.ccronica_e_vascular_perif === "SI" ? (tipo(r.ccronica_e_vascular_perif_tipo, 4) || 1) : null,
    ]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO evaluacion (paciente_id,fecha_evaluacion,retinopatia_id,nefropatia_id,neuropatia_id,neuropatia_autonomica_id,pie_diabetico_id,enf_cardiovascular_id,enf_vascular_id) VALUES",
      data);
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 14. EDUCACIÓN
  // ════════════════════════════════════════════════════════════
  console.log("📦 14/18 educacion…");
  { const TEMAS = [
      ["educ_con_carboh",     "Conteo de carbohidratos"],
      ["educ_indice_glucemico","Índice glucémico"],
      ["educ_tratar_cemias",  "Tratamiento de hipoglucemias"],
      ["educ_ajus_dos_insul", "Ajuste de dosis de insulina"],
    ];
    const [rows] = await o.query("SELECT * FROM educacion");
    const data = [];
    for (const e of rows) {
      for (const [col, tema] of TEMAS) {
        if (e[col] === "SI") data.push([e.paciente_cve, e.educ_fecha_registro||null, tema]);
      }
    }
    const n = await insertBatch(d, "INSERT IGNORE INTO educacion (paciente_id,fecha,tema) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 15. ESTILOVIDA
  // ════════════════════════════════════════════════════════════
  console.log("📦 15/18 estilovida…");
  { const [rows] = await o.query("SELECT * FROM estilovida");
    const data = rows.map(r => [
      r.paciente_cve,
      r.ev_ejercicio         || null,
      r.ev_min_ejer_semana   || null,
      r.ev_plan_alimentacion || null,
      r.ev_conteo_chos === "SI" ? "Conteo de carbohidratos" : null,
    ]);
    const n = await insertBatch(d, "INSERT INTO estilovida (paciente_id,actividad_fisica,minutos_semana,dieta_especial,tipo_dieta) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 16. TOXICOMANIAS (1 por paciente, la más reciente)
  // ════════════════════════════════════════════════════════════
  console.log("📦 16/18 toxicomanias…");
  { const [rows] = await o.query("SELECT * FROM toxicomanias ORDER BY tox_fecha_captura DESC");
    const seen = new Set();
    const data = [];
    for (const t of rows) {
      if (seen.has(t.paciente_cve)) continue;
      seen.add(t.paciente_cve);
      data.push([
        t.paciente_cve,
        t.tox_tabaco  || null,
        t.tox_alcohol || null,
        (t.tox_marihuana === "SI" || t.tox_cocaina === "SI") ? "SI" : "NO",
      ]);
    }
    const n = await insertBatch(d, "INSERT IGNORE INTO toxicomanias (paciente_id,tabaco,alcohol,drogas) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 17. PATOLOGÍAS (expande columnas booleanas → filas)
  // ════════════════════════════════════════════════════════════
  console.log("📦 17/18 patologia…");
  { const PAT_COLS = [
      ["patologia_hipotiroidismo","HIPOTIROIDISMO",       "patologia_anio_hipotiroidismo"],
      ["patologia_e_celiaca",     "ENFERMEDAD CELIACA",  "patologia_anio_celiaca"],
      ["patologia_e_addison",     "ENF. DE ADDISON",     "patologia_anio_addison"],
      ["patologia_vitiligo",      "VITILIGO",            "patologia_anio_vitiligo"],
      ["patologia_e_graves",      "ENF. DE GRAVES",      "patologia_anio_graves"],
      ["patologia_hipertension",  "HIPERTENSIÓN ARTERIAL","patologia_anio_hipertension"],
      ["patologia_dislipidemia",  "DISLIPIDEMIA",        "patologia_anio_dislipidemia"],
      ["patologia_hiperuricemia", "HIPERURICEMIA",       "patologia_anio_hiperuricemia"],
      ["patologia_gota",          "GOTA",                "patologia_anio_gota"],
    ];
    const [rows] = await o.query("SELECT * FROM patologia");
    const data = [];
    for (const p of rows) {
      for (const [col, nombre, col_anio] of PAT_COLS) {
        if (p[col] === "SI") {
          const anio = p[col_anio] && p[col_anio] > 0 ? `${p[col_anio]}-01-01` : null;
          data.push([p.paciente_cve, nombre, anio]);
        }
      }
      if (p.patologia_otras) data.push([p.paciente_cve, "OTRAS", null]);
    }
    const n = await insertBatch(d, "INSERT INTO patologia (paciente_id,nombre,fecha_dx) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  // ════════════════════════════════════════════════════════════
  // 18. EVENTOS
  // ════════════════════════════════════════════════════════════
  console.log("📦 18/18 evento…");
  { const [rows] = await o.query("SELECT * FROM evento");
    const data = [];
    for (const ev of rows) {
      if (ev.evento_hipo_severa === "SI")
        data.push([ev.paciente_cve, "HIPOGLUCEMIA_SEVERA", ev.evento_fecha_hipo_severa||null, ev.evento_causa_hipo_severa||null, 0]);
      if (ev.evento_cetoacidosis === "SI")
        data.push([ev.paciente_cve, "CETOACIDOSIS", ev.evento_fecha_cetoacidosis||null, ev.evento_causa_cetoacidosis||null, 1]);
      if (ev.evento_hospitalizacion === "SI")
        data.push([ev.paciente_cve, "HOSPITALIZACION", ev.evento_fecha_hospitalizacion||null,
          ev.evento_causa_hospitalizacion ? `${ev.evento_causa_hospitalizacion} (${ev.evento_dias_hospitalizacion||0} días)` : null, 1]);
    }
    const n = await insertBatch(d, "INSERT INTO evento (paciente_id,tipo,fecha,descripcion,requirio_hospitalizacion) VALUES", data);
    console.log(`   ✅ ${n}\n`); }

  await o.end();
  await d.end();

  console.log("════════════════════════════════════════");
  console.log("✅  Segunda pasada completada al 100%.");
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => { console.error("❌ Error fatal:", e.message); process.exit(1); });
