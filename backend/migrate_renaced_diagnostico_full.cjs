// migrate_renaced_diagnostico_full.cjs
// Backfill: completa TODOS los campos clínicos de `diagnostico` en renaced_mexico
// a partir de la tabla origen renaced1test.diagnostico.
// Hace UPDATE sobre los registros existentes (1 diagnóstico por paciente, ids alineados).
// Ejecutar desde backend:  node migrate_renaced_diagnostico_full.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = {
  host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1test",
};
const CFG_DESTINO = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// ── Helpers de normalización ─────────────────────────────────────────────────
const nz   = (v) => (v === "" || v === undefined ? null : v);          // vacío → null
const norm = (v) => { v = nz(v); return v === "SD" ? null : v; };      // SI/NO/SD → SI/NO/null
const ab   = (v) => {                                                  // anticuerpos
  v = nz(v);
  if (v == null) return null;
  const s = String(v).toUpperCase();
  if (s.startsWith("POS")) return "POS";
  if (s.startsWith("NEG")) return "NEG";
  return null;                                                          // "NO HAY DATO" → null
};
const grado = (g1, g2) => (nz(g1) ? 1 : nz(g2) ? 2 : null);            // 1er/2do grado
const fk = (v, set) => {                                               // FK válido o null
  v = nz(v);
  if (v == null) return null;
  const n = Number(v);
  return Number.isInteger(n) && set.has(n) ? n : null;
};

async function migrar() {
  console.log("\n🔄  Conectando…");
  const origen  = await mysql.createConnection(CFG_ORIGEN);
  const destino = await mysql.createConnection(CFG_DESTINO);
  console.log(`   ✅ Origen  → ${CFG_ORIGEN.database}`);
  console.log(`   ✅ Destino → ${CFG_DESTINO.database} (${CFG_DESTINO.host})\n`);

  // Cargar ids válidos de catálogos para validar FK
  const loadSet = async (tabla) => {
    const [r] = await destino.query(`SELECT id FROM ${tabla}`);
    return new Set(r.map((x) => x.id));
  };
  const setTerapia = await loadSet("cat_terapia");
  const setEsquema = await loadSet("cat_esquemas_insulinas");
  const setCalculo = await loadSet("cat_calculo_dosis_insulinas");
  const setDisp    = await loadSet("cat_dispositivo");
  const setInst    = await loadSet("cat_institucion_ss");

  console.log("📦 Leyendo diagnósticos de origen…");
  const [rows] = await origen.query(`SELECT * FROM diagnostico`);
  console.log(`   ${rows.length} registros a procesar.\n`);

  let ok = 0, err = 0, sinDestino = 0;

  for (const d of rows) {
    const datos = {
      fecha_approx:             d.dx_fe_exacta_aprox === "A" ? 1 : 0,
      fecha_approx_anio:        nz(d.dx_fe_aprox_anio),
      fecha_approx_mes:         nz(d.dx_fe_aprox_mes),
      peso:                     nz(d.dx_peso),
      estatura:                 nz(d.dx_estatura),
      imc:                      nz(d.dx_imc),
      pa_sistolica:             nz(d.dx_sistolica),
      pa_diastolica:            nz(d.dx_diastolica),
      cetoacidosis:             norm(d.dx_cetoacidosis_al_dx),
      cetoacidosis_ph:          nz(d.dx_ph_dx),
      cetoacidosis_bicarbonato: nz(d.dx_bicarbonato),
      glucemia_azar:            nz(d.dx_glucemia_azar),
      hba1c:                    nz(d.dx_hba1c),
      hba1c_fecha:              nz(d.dx_fecha_hba1c),
      peptido_c:                nz(d.dx_peptidoc),
      anti_gad:                 ab(d.dx_anti_gad),
      anti_gad_valor:           nz(d.dx_valor_anti_gad),
      anti_insulina:            ab(d.dx_anti_insulina),
      anti_insulina_valor:      nz(d.dx_valor_anti_insulina),
      anti_islotes:             ab(d.dx_anti_islotes),
      anti_islotes_valor:       nz(d.dx_valor_anti_islotes),
      anti_ia2:                 ab(d.dx_anti_ia2),
      anti_ia2_valor:           nz(d.dx_valor_anti_ia2),
      anti_zct8:                ab(d.dx_anti_zct8),
      anti_zct8_valor:          nz(d.dx_valor_anti_zct8),
      hospitalizacion:          norm(d.dx_hospitalizacion),
      hospitalizacion_dias:     nz(d.dx_dias_hosp),
      terapia_intensiva:        norm(d.dx_terapia_intensiva),
      terapia_intensiva_dias:   nz(d.dx_dias_t_intensiva),
      antec_dm1:                norm(d.dx_antec_fam_t1),
      antec_dm1_grado:          grado(d.dx_grado1_t1, d.dx_grado2_t1),
      antec_dm2:                norm(d.dx_antec_fam_t2),
      antec_dm2_grado:          grado(d.dx_grado1_t2, d.dx_grado2_t2),
      nacido_por:               norm(d.dx_nacido),
      lactancia_materna:        norm(d.dx_lactancia),
      hipotiroidismo_dx:        norm(d.dx_hipotiroidismo),
      terapia_id:               fk(d.dx_terapia,          setTerapia),
      esquema_insulina_id:      fk(d.dx_esquemas_insul,   setEsquema),
      calculo_dosis_id:         fk(d.dx_calc_dosis_insul, setCalculo),
      dosis_prescrita:          nz(d.dx_dosis_presc_diag),
      dispositivo_id:           fk(d.dx_disp_apli_insul,  setDisp),
      institucion_id:           fk(d.dx_instit_ss_atencion, setInst),
      tipo_mody:                nz(d.dx_mody_sospecha),
      confirmacion_genetica:    norm(d.dx_mody_confirmado),
      mutacion:                 nz(d.dx_mody_mutacion),
    };

    const cols = Object.keys(datos);
    const sql  = `UPDATE diagnostico SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE paciente_id = ?`;
    const vals = [...cols.map((c) => datos[c]), d.paciente_cve];

    try {
      const [res] = await destino.query(sql, vals);
      if (res.affectedRows === 0) sinDestino++;
      else ok++;
    } catch (e) {
      err++;
      if (err <= 10) console.warn(`  ⚠ paciente ${d.paciente_cve}: ${e.message}`);
    }
  }

  console.log(`\n   ✅ ${ok} actualizados  ⚠ ${sinDestino} sin fila destino  ❌ ${err} errores\n`);

  await origen.end();
  await destino.end();
  console.log("════════════════════════════════════════");
  console.log("✅  Backfill de diagnósticos completado.");
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => {
  console.error("\n❌ Error fatal:", e.message);
  process.exit(1);
});
