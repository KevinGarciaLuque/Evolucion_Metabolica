/**
 * seed_pedro_completo.cjs
 * Completa todos los datos de prueba de Pedro Pérez Prueba en producción:
 *  - 5 análisis adicionales (R1–R5) con progresión clínica realista
 *  - Actualiza el análisis existente (R6) con hba1c_post_mcg y numero_registro
 *  - 2 registros de anticuerpos
 */
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host:     "metro.proxy.rlwy.net",
    port:     35534,
    user:     "root",
    password: "MfZrJWHJcbyzUIbshhtDGuXQuvldatYt",
    database: "railway",
  });

  // ── Obtener id del paciente ────────────────────────────────────────────────
  const [[pac]] = await conn.query(
    "SELECT id FROM pacientes WHERE dni = ?", ["0801201620467"]
  );
  if (!pac) { console.error("❌ Pedro no encontrado"); process.exit(1); }
  const pid = pac.id;
  console.log(`Paciente Pedro id=${pid}`);

  // ── 1. Actualizar el análisis existente → convertirlo en R6 ──────────────
  const [[analExist]] = await conn.query(
    "SELECT id FROM analisis WHERE paciente_id = ? ORDER BY fecha ASC LIMIT 1", [pid]
  );
  if (analExist) {
    await conn.execute(
      `UPDATE analisis SET
         numero_registro   = 6,
         fecha             = '2026-04-18',
         hba1c_post_mcg    = 7.8,
         se_modifico_dosis = 1,
         dosis_modificada  = 'Glargina 14 UI, Aspart 10 UI',
         calidad_vida      = 'Mala',
         comentarios       = 'Paciente presenta regresión leve en el último período. Se ajusta dosis y se refuerza educación.'
       WHERE id = ?`,
      [analExist.id]
    );
    console.log(`✅ Análisis existente (id=${analExist.id}) actualizado → R6`);
  }

  // ── 2. Insertar R1–R5 si no existen ya ────────────────────────────────────
  const [existentes] = await conn.query(
    "SELECT numero_registro FROM analisis WHERE paciente_id = ?", [pid]
  );
  const registrosExist = existentes.map(r => r.numero_registro);

  /*
   * Arco clínico realista para presentación:
   * R1 Oct-25 → ALTO_RIESGO  (TIR 42%, inicio)
   * R2 Nov-25 → ALTO_RIESGO  (TIR 50%, leve mejoría)
   * R3 Dic-25 → MODERADO     (TIR 58%, MCG ayudando)
   * R4 Ene-26 → MODERADO     (TIR 65%, buen avance)
   * R5 Feb-26 → OPTIMO       (TIR 73%, control ideal)
   * R6 Abr-26 → ALTO_RIESGO  (TIR 61%, regresión — ya existía)
   */
  const nuevosAnalisis = [
    {
      nr: 1, fecha: "2025-10-15",
      tir: 42.0, tar: 52.5, tar_muy_alto: 22.0, tar_alto: 30.5,
      tbr: 5.5,  tbr_bajo: 3.5, tbr_muy_bajo: 2.0,
      gmi: 8.4,  cv: 52.3, ta: 94.0, gp: 191.0, gri: 68.0,
      ev_hip: 26, dur_hip: 74, hba1c: 8.6,
      clasif: "ALTO_RIESGO",
      dosis: "Glargina 14 UI, Lispro 10 UI",
      mod: 0, mod_d: null,
      cvida: "Mala",
      obs: "Primer análisis MCG. Control muy deficiente. Se inicia plan de educación intensiva.",
    },
    {
      nr: 2, fecha: "2025-11-12",
      tir: 50.4, tar: 44.1, tar_muy_alto: 18.0, tar_alto: 26.1,
      tbr: 5.5,  tbr_bajo: 3.2, tbr_muy_bajo: 2.3,
      gmi: 8.0,  cv: 49.1, ta: 95.0, gp: 181.0, gri: 58.0,
      ev_hip: 21, dur_hip: 60, hba1c: 8.2,
      clasif: "ALTO_RIESGO",
      dosis: "Glargina 15 UI, Lispro 11 UI",
      mod: 1, mod_d: "Glargina aumentada a 15 UI",
      cvida: "Mala",
      obs: "Leve mejoría en TIR. Se ajustó dosis de insulina basal. Continuar plan nutricional.",
    },
    {
      nr: 3, fecha: "2025-12-10",
      tir: 58.2, tar: 36.8, tar_muy_alto: 12.5, tar_alto: 24.3,
      tbr: 5.0,  tbr_bajo: 3.0, tbr_muy_bajo: 2.0,
      gmi: 7.6,  cv: 44.8, ta: 96.0, gp: 170.0, gri: 44.0,
      ev_hip: 15, dur_hip: 47, hba1c: 7.9,
      clasif: "MODERADO",
      dosis: "Glargina 15 UI, Lispro 12 UI",
      mod: 0, mod_d: null,
      cvida: "Igual",
      obs: "El paciente alcanzó clasificación MODERADA. Adherencia mejorada al plan alimenticio.",
    },
    {
      nr: 4, fecha: "2026-01-08",
      tir: 65.1, tar: 30.2, tar_muy_alto: 9.8,  tar_alto: 20.4,
      tbr: 4.7,  tbr_bajo: 3.0, tbr_muy_bajo: 1.7,
      gmi: 7.3,  cv: 40.2, ta: 97.0, gp: 161.0, gri: 34.0,
      ev_hip: 10, dur_hip: 33, hba1c: 7.5,
      clasif: "MODERADO",
      dosis: "Glargina 14 UI, Aspart 11 UI",
      mod: 1, mod_d: "Cambio de Lispro a Aspart",
      cvida: "Igual",
      obs: "Progresión positiva sostenida. Se cambió insulina corta a Aspart por mejor perfil de acción.",
    },
    {
      nr: 5, fecha: "2026-02-14",
      tir: 73.6, tar: 22.4, tar_muy_alto: 6.2,  tar_alto: 16.2,
      tbr: 4.0,  tbr_bajo: 2.6, tbr_muy_bajo: 1.4,
      gmi: 7.0,  cv: 36.8, ta: 98.0, gp: 154.0, gri: 21.0,
      ev_hip: 6, dur_hip: 21, hba1c: 7.1,
      clasif: "OPTIMO",
      dosis: "Glargina 13 UI, Aspart 10 UI",
      mod: 1, mod_d: "Reducción basal a 13 UI por buen control",
      cvida: "Buena",
      obs: "¡Paciente alcanza control ÓPTIMO! TIR ≥ 70%. Se reduce dosis basal levemente. Reforzar hábitos.",
    },
  ];

  for (const a of nuevosAnalisis) {
    if (registrosExist.includes(a.nr)) {
      console.log(`R${a.nr} ya existe, omitido`);
      continue;
    }
    await conn.execute(
      `INSERT INTO analisis
         (paciente_id, numero_registro, fecha,
          tir, tar, tar_muy_alto, tar_alto,
          tbr, tbr_bajo, tbr_muy_bajo,
          gmi, cv, tiempo_activo, glucosa_promedio, gri,
          eventos_hipoglucemia, duracion_hipoglucemia,
          hba1c_post_mcg, clasificacion,
          dosis_insulina_post, se_modifico_dosis, dosis_modificada,
          calidad_vida, comentarios,
          limitacion_internet, limitacion_alergias, limitacion_economica)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0)`,
      [
        pid, a.nr, a.fecha,
        a.tir, a.tar, a.tar_muy_alto, a.tar_alto,
        a.tbr, a.tbr_bajo, a.tbr_muy_bajo,
        a.gmi, a.cv, a.ta, a.gp, a.gri,
        a.ev_hip, a.dur_hip,
        a.hba1c, a.clasif,
        a.dosis, a.mod, a.mod_d,
        a.cvida, a.obs,
      ]
    );
    console.log(`✅ Análisis R${a.nr} (${a.fecha}) insertado — ${a.clasif}`);
  }

  // ── 3. Anticuerpos ────────────────────────────────────────────────────────
  const [rowsAnt] = await conn.query(
    "SELECT id FROM historial_anticuerpos WHERE paciente_id = ?", [pid]
  );
  if (rowsAnt.length === 0) {
    const antList = [
      {
        fecha: "2025-10-15",
        iaa: "Positivo", gad: "Positivo", ia2: "Positivo",
        znt: "Negativo", ica: "Positivo",
        obs: "Perfil autoinmune compatible con DM1. IAA, Anti-GAD65 e ICA positivos.",
        elab: "Dra. Helen Zhen",
      },
      {
        fecha: "2026-02-14",
        iaa: "Negativo", gad: "Positivo", ia2: "Positivo",
        znt: "Negativo", ica: "Negativo",
        obs: "IAA se negativizó. Anti-GAD65 y Anti-IA2 persisten positivos. Evolución esperada.",
        elab: "Dra. Helen Zhen",
      },
    ];
    for (const a of antList) {
      await conn.execute(
        `INSERT INTO historial_anticuerpos
           (paciente_id, fecha, iaa, anti_gad65, anti_ia2,
            znt8, ica, observaciones, elaborado_por)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [pid, a.fecha, a.iaa, a.gad, a.ia2, a.znt, a.ica, a.obs, a.elab]
      );
    }
    console.log("✅ 2 registros de anticuerpos insertados");
  } else {
    console.log(`Anticuerpos ya existe (${rowsAnt.length} registros), omitido`);
  }

  await conn.end();
  console.log("\n✅ Pedro Pérez Prueba — datos de presentación completos");
  console.log("   6 análisis | 6 insulina | 6 alimentación | 2 anticuerpos");
})().catch(e => { console.error("Error:", e.message); process.exit(1); });
