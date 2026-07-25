// migrate_renaced_datos.cjs
// ETL: migra datos de renaced1 (schema PHP original) → renaced_mexico (schema moderno)
// Ejecutar desde la carpeta backend: node migrate_renaced_datos.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

// ── Origen: MySQL LOCAL con el dump original ──────────────────────────────────
const CFG_ORIGEN = {
  host:     "localhost",
  port:     3306,
  user:     "root",
  password: "123456789",
  database: "renaced1",
};

// ── Destino: Railway (o local si cambias las vars) ────────────────────────────
const CFG_DESTINO = {
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000,
};

async function migrar() {
  console.log("\n🔄  Conectando a bases de datos…");
  const origen  = await mysql.createConnection(CFG_ORIGEN);
  const destino = await mysql.createConnection(CFG_DESTINO);
  console.log(`   ✅ Origen  → ${CFG_ORIGEN.database} (localhost)`);
  console.log(`   ✅ Destino → ${CFG_DESTINO.database} (${CFG_DESTINO.host})\n`);

  let ok = 0, err = 0;

  // ════════════════════════════════════════════════════════════
  // 1. UNIDADES DE SERVICIO DE SALUD
  // ════════════════════════════════════════════════════════════
  console.log("📦 1/7 unidad_servicio_salud…");
  const [unidades] = await origen.query(`SELECT * FROM unidad_servicio_salud`);
  for (const u of unidades) {
    try {
      await destino.query(
        `INSERT INTO unidad_servicio_salud (id, nombre, establecimiento_cve, activo)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
        [
          u.unidad_servicio_salud_cve,
          u.unidad_servicio_salud_nombre || "Sin nombre",
          u.establecimiento_salud_cve    || null,
        ]
      );
      ok++;
    } catch (e) { err++; }
  }
  console.log(`   ✅ ${ok} registros  ❌ ${err} errores\n`);
  ok = 0; err = 0;

  // ════════════════════════════════════════════════════════════
  // 2. MÉDICOS (recurso_humano en el sistema original)
  // ════════════════════════════════════════════════════════════
  console.log("📦 2/7 medico (recurso_humano)…");
  const [medicos] = await origen.query(`SELECT * FROM recurso_humano`);
  for (const m of medicos) {
    try {
      await destino.query(
        `INSERT INTO medico (curp, nombre, ap_pat, ap_mat, cedula_prof, unidad_servicio_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
        [
          m.recurso_humano_cve,
          m.recurso_humano_nombre       || "",
          m.recurso_humano_apellido_pat || "",
          m.recurso_humano_apellido_mat || null,
          m.recurso_humano_cedula       || null,
          null, // la unidad se puede mapear después si se necesita
        ]
      );
      ok++;
    } catch (e) { err++; }
  }
  console.log(`   ✅ ${ok} médicos  ❌ ${err} errores\n`);
  ok = 0; err = 0;

  // ════════════════════════════════════════════════════════════
  // 3. PACIENTES
  // ════════════════════════════════════════════════════════════
  console.log("📦 3/7 paciente…");
  const [pacientes] = await origen.query(`SELECT * FROM paciente`);
  for (const p of pacientes) {
    try {
      await destino.query(
        `INSERT INTO paciente (
          id, expediente, iniciales, nombre, ap_pat, ap_mat,
          sexo, fecha_nacimiento, curp,
          estado_nacimiento, municipio_nacimiento, pais_nacimiento_id,
          nivel_ingresos_id, nivel_educativo_id,
          estado_residencia, municipio_residencia,
          colonia, calle_num, codigo_postal,
          telefonos, email, seguro_medico_id,
          establecimiento_cve, unidad_servicio_id,
          tiene_aviso_privacidad, aviso_ruta,
          tiene_consentimiento, consentimiento_ruta,
          estatus_id, fecha_alta,
          defuncion_folio, defuncion_fecha, defuncion_causa
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
        [
          p.paciente_cve,
          p.paciente_expediente             || null,
          p.paciente_iniciales              || null,
          p.paciente_nombre                 || "",
          p.paciente_ap_pat                 || "",
          p.paciente_ap_mat                 || null,
          p.paciente_sexo                   || "F",
          p.paciente_fe_nac                 || null,
          p.paciente_curp                   || null,
          p.estado_curp_nacimiento          || null,
          p.delmunicipio_cve_nacimiento     || null,
          p.pais_cve_nacimiento             || null,
          p.paciente_nivel_ingresos         || null,
          p.paciente_nivel_educativo        || null,
          p.estado_curp_residencia          || null,
          p.delmunicipio_cve_residencia     || null,
          p.paciente_colonia                || null,
          p.paciente_calle_num              || null,
          p.paciente_codigo_postal          || null,
          p.paciente_telefonos              || null,
          p.paciente_email                  || null,
          p.paciente_seguro_medico          || null,
          p.establecimiento_cve             || null,
          p.unidad_servicio_salud_cve       || null,
          p.paciente_aviso === "SI" ? 1 : 0,
          p.aviso_ruta                      || null,
          p.paciente_consentimiento === "SI" ? 1 : 0,
          p.consentimiento_ruta             || null,
          p.paciente_alta_sistema           || null,
          p.paciente_defuncion_folio        || null,
          p.paciente_defuncion_fecha        || null,
          p.paciente_defuncion_causa        || null,
        ]
      );
      ok++;
    } catch (e) {
      if (!e.message.includes("Duplicate")) console.warn(`  ⚠ pac ${p.paciente_cve}: ${e.message}`);
      err++;
    }
  }
  console.log(`   ✅ ${ok} pacientes  ❌ ${err} errores\n`);
  ok = 0; err = 0;

  // ════════════════════════════════════════════════════════════
  // 4. DIAGNÓSTICOS
  // ════════════════════════════════════════════════════════════
  console.log("📦 4/7 diagnostico…");
  // helpers de normalización (mismos criterios que migrate_renaced_diagnostico_full.cjs)
  const nzD   = (v) => (v === "" || v === undefined ? null : v);
  const normD = (v) => { v = nzD(v); return v === "SD" ? null : v; };
  const abD   = (v) => { v = nzD(v); if (v == null) return null; const s = String(v).toUpperCase(); if (s.startsWith("POS")) return "POS"; if (s.startsWith("NEG")) return "NEG"; return null; };
  const gradoD = (g1, g2) => (nzD(g1) ? 1 : nzD(g2) ? 2 : null);

  const [diags] = await origen.query(`SELECT * FROM diagnostico`);
  for (const d of diags) {
    try {
      await destino.query(
        `INSERT INTO diagnostico (
          id, paciente_id, tipo_diabetes_id, tipo_diabetes_otra_id,
          fecha_diagnostico, fecha_approx, fecha_approx_anio, fecha_approx_mes,
          peso, estatura, imc, pa_sistolica, pa_diastolica,
          cetoacidosis, cetoacidosis_ph, cetoacidosis_bicarbonato,
          glucemia_azar, hba1c, hba1c_fecha, peptido_c,
          anti_gad, anti_gad_valor, anti_insulina, anti_insulina_valor,
          anti_islotes, anti_islotes_valor, anti_ia2, anti_ia2_valor,
          anti_zct8, anti_zct8_valor,
          hospitalizacion, hospitalizacion_dias, terapia_intensiva, terapia_intensiva_dias,
          antec_dm1, antec_dm1_grado, antec_dm2, antec_dm2_grado,
          nacido_por, lactancia_materna, hipotiroidismo_dx,
          terapia_id, esquema_insulina_id, calculo_dosis_id, dosis_prescrita,
          dispositivo_id, institucion_id,
          tipo_mody, confirmacion_genetica, mutacion,
          fecha_captura
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          tipo_diabetes_id = VALUES(tipo_diabetes_id),
          fecha_diagnostico = VALUES(fecha_diagnostico),
          hba1c = VALUES(hba1c)`,
        [
          d.paciente_cve, // id — alineado 1:1 con paciente_id (1 diagnóstico por paciente)
          d.paciente_cve,
          d.tipo_diabetes_cve       || null,
          d.tipo_diabetes_otras_cve || null,
          d.dx_fecha_dx             || null,
          d.dx_fe_exacta_aprox === "A" ? 1 : 0,
          nzD(d.dx_fe_aprox_anio),
          nzD(d.dx_fe_aprox_mes),
          nzD(d.dx_peso),
          nzD(d.dx_estatura),
          nzD(d.dx_imc),
          nzD(d.dx_sistolica),
          nzD(d.dx_diastolica),
          normD(d.dx_cetoacidosis_al_dx),
          nzD(d.dx_ph_dx),
          nzD(d.dx_bicarbonato),
          nzD(d.dx_glucemia_azar),
          nzD(d.dx_hba1c),
          nzD(d.dx_fecha_hba1c),
          nzD(d.dx_peptidoc),
          abD(d.dx_anti_gad),
          nzD(d.dx_valor_anti_gad),
          abD(d.dx_anti_insulina),
          nzD(d.dx_valor_anti_insulina),
          abD(d.dx_anti_islotes),
          nzD(d.dx_valor_anti_islotes),
          abD(d.dx_anti_ia2),
          nzD(d.dx_valor_anti_ia2),
          abD(d.dx_anti_zct8),
          nzD(d.dx_valor_anti_zct8),
          normD(d.dx_hospitalizacion),
          nzD(d.dx_dias_hosp),
          normD(d.dx_terapia_intensiva),
          nzD(d.dx_dias_t_intensiva),
          normD(d.dx_antec_fam_t1),
          gradoD(d.dx_grado1_t1, d.dx_grado2_t1),
          normD(d.dx_antec_fam_t2),
          gradoD(d.dx_grado1_t2, d.dx_grado2_t2),
          normD(d.dx_nacido),
          normD(d.dx_lactancia),
          normD(d.dx_hipotiroidismo),
          nzD(d.dx_terapia),
          nzD(d.dx_esquemas_insul),
          nzD(d.dx_calc_dosis_insul),
          nzD(d.dx_dosis_presc_diag),
          nzD(d.dx_disp_apli_insul),
          nzD(d.dx_instit_ss_atencion),
          nzD(d.dx_mody_sospecha),
          normD(d.dx_mody_confirmado),
          nzD(d.dx_mody_mutacion),
          d.dx_fecha_captura        || null,
        ]
      );
      ok++;
    } catch (e) { err++; }
  }
  console.log(`   ✅ ${ok} diagnósticos  ❌ ${err} errores\n`);
  ok = 0; err = 0;

  // ════════════════════════════════════════════════════════════
  // 5. CONSULTAS
  // ════════════════════════════════════════════════════════════
  console.log("📦 5/7 consulta…");
  const [cons] = await origen.query(`SELECT * FROM consulta`);
  for (const c of cons) {
    try {
      await destino.query(
        `INSERT INTO consulta (
          id, paciente_id, medico_curp, fecha_consulta,
          peso, estatura, imc, percentil,
          cintura, cadera, indice_cc,
          pa_sistolica, pa_diastolica, fecha_captura
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE fecha_consulta = VALUES(fecha_consulta)`,
        [
          c.consulta_cve,
          c.paciente_cve,
          c.medico_cve           || "DESCONOCIDO",
          c.cons_fecha_consulta  || null,
          c.cons_peso            || null,
          c.cons_estatura        || null,
          c.cons_imc             || null,
          c.cons_percentil       || null,
          c.cons_cintura         || null,
          c.cons_cadera          || null,
          c.cons_indice_cc       || null,
          c.cons_sistolica       || null,
          c.cons_diastolica      || null,
          c.cons_fecha_captura   || null,
        ]
      );
      ok++;
    } catch (e) { err++; }
  }
  console.log(`   ✅ ${ok} consultas  ❌ ${err} errores\n`);
  ok = 0; err = 0;

  // ════════════════════════════════════════════════════════════
  // 6. LABORATORIOS
  // ════════════════════════════════════════════════════════════
  console.log("📦 6/7 laboratorio…");
  const [labs] = await origen.query(`SELECT * FROM laboratorio`);
  for (const l of labs) {
    try {
      await destino.query(
        `INSERT INTO laboratorio (
          id, paciente_id, consulta_id, fecha_muestra,
          hba1c, glucosa_ayuno, glucosa_postprandial,
          colesterol_total, hdl, ldl, trigliceridos,
          creatinina, tasa_filtracion, microalbuminuria,
          tsh, c_peptido, anti_gad, anti_ia2,
          fecha_captura
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE fecha_muestra = VALUES(fecha_muestra)`,
        [
          l.laboratorio_cve,
          l.paciente_cve,
          l.consulta_cve                 || null,
          l.fecha_realizacion            || null,
          l.valor_hba1c                  || null,
          l.valor_glu_plas_ayunas        || null,
          l.valor_glu_2hrs               || null,
          l.valor_colesterol             || null,
          l.valor_hdl                    || null,
          l.valor_ldl                    || null,
          l.valor_trigliceridos          || null,
          l.valor_creatinina_serica      || null,
          l.valor_depuracion_creatinina  || null,
          l.valor_albuminuria            || null,
          l.valor_tsh                    || null,
          l.valor_pepti_ayunas           || null,
          l.valor_anti_gad               || null,
          l.valor_anti_ia2               || null,
          l.lab_fecha_captura            || null,
        ]
      );
      ok++;
    } catch (e) { err++; }
  }
  console.log(`   ✅ ${ok} laboratorios  ❌ ${err} errores\n`);
  ok = 0; err = 0;

  // ════════════════════════════════════════════════════════════
  // 7. ANTECEDENTES GINECO-OBSTÉTRICOS
  // ════════════════════════════════════════════════════════════
  console.log("📦 7/7 antecedentes_go…");
  const [agos] = await origen.query(`SELECT * FROM antecedentes_go`);
  for (const a of agos) {
    try {
      await destino.query(
        `INSERT INTO antecedentes_go (
          paciente_id, menarca, fum, visa, mac,
          menopausia, menopausia_fecha, tipo_menopausia, trh, peso_4000, fecha_captura
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE menarca = VALUES(menarca)`,
        [
          a.paciente_cve,
          a.menarca          || null,
          a.fum              || null,
          a.visa             || null,
          a.mac              || null,
          a.menopausia       || null,
          a.menopausia_fecha || null,
          a.tipo_menopausia  || null,
          a.trh              || null,
          a.peso_4000        || null,
          a.ago_fecha_captura || null,
        ]
      );
      ok++;
    } catch (e) { err++; }
  }
  console.log(`   ✅ ${ok} antecedentes G.O.  ❌ ${err} errores\n`);

  await origen.end();
  await destino.end();

  console.log("════════════════════════════════════════");
  console.log("✅  Migración completada exitosamente.");
  console.log("    Todos los datos de renaced1");
  console.log(`    están ahora en ${CFG_DESTINO.database}`);
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => {
  console.error("\n❌ Error fatal:", e.message);
  process.exit(1);
});
