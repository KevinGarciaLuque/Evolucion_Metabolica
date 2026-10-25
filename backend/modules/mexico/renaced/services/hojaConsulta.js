// Guarda una consulta completa ("hoja de consulta"): la visita y, solo si traen datos,
// laboratorio, tratamiento, evaluación de complicaciones y educación.
//
// La fecha se captura una sola vez. Cada tabla conserva su propia columna de fecha
// (fecha_muestra, fecha_evaluacion, fecha…), que aquí se llena con la fecha de la consulta,
// así los reportes y la importación del sistema anterior siguen funcionando igual.
// Las fechas que son de otro momento (inicio de tratamiento, toma de muestra) se respetan si llegan.

const LAB_COLS = [
  "hba1c", "glucosa_ayuno", "glucosa_postprandial", "colesterol_total", "hdl", "ldl",
  "trigliceridos", "creatinina", "tasa_filtracion", "microalbuminuria", "tsh",
  "c_peptido", "anti_gad", "anti_ia2", "insulinemia", "observaciones",
];
const EVAL_COLS = [
  "retinopatia_id", "nefropatia_id", "neuropatia_id", "neuropatia_autonomica_id",
  "pie_diabetico_id", "enf_cardiovascular_id", "enf_vascular_id", "observaciones",
];

const ESTILO_COLS = ["actividad_fisica", "tipo_actividad", "minutos_semana", "dieta_especial", "tipo_dieta"];
const TOX_COLS = ["tabaco", "alcohol", "drogas", "observaciones"];
// Misma convención que la importación del sistema anterior
const GRAVEDAD_POR_TIPO = {
  HIPOGLUCEMIA_LEVE: "LEVE", HIPOGLUCEMIA_NIVEL1: "NIVEL 1",
  HIPOGLUCEMIA_NIVEL2: "NIVEL 2", HIPOGLUCEMIA_INADVERTIDA: "INADVERTIDA",
};

const vacio = (v) => v === undefined || v === null || String(v).trim() === "";
const valor = (v) => (vacio(v) ? null : v);
const hayDatos = (obj, cols) => !!obj && cols.some((c) => !vacio(obj[c]));
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function errorValidacion(mensaje) {
  const e = new Error(mensaje);
  e.status = 400;
  return e;
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn  Conexión con transacción abierta
 * @param {{pacienteId:string|number, usuarioId?:number|null, medicoCurp?:string, datos:object}} p
 */
export async function guardarHojaConsulta(conn, { pacienteId, usuarioId = null, medicoCurp = "", datos }) {
  const { fecha_consulta, visita = {}, laboratorio, tratamiento, evaluacion, educacion, estilo_vida, toxicomanias, eventos } = datos || {};
  if (!fecha_consulta || !FECHA_RE.test(fecha_consulta)) {
    throw errorValidacion("La fecha de la consulta es obligatoria");
  }

  const guardado = ["visita"];

  // ── Visita (signos y somatometría) ────────────────────────────────────────
  const peso = parseFloat(visita.peso), estatura = parseFloat(visita.estatura);
  const cin = parseFloat(visita.cintura), cad = parseFloat(visita.cadera);
  const imc = valor(visita.imc) ?? (peso > 0 && estatura > 0 ? (peso / (estatura * estatura)).toFixed(2) : null);
  const indice_cc = valor(visita.indice_cc) ?? (cin > 0 && cad > 0 ? (cin / cad).toFixed(2) : null);
  // ICA = cintura / estatura (ambas en cm); la estatura se guarda en metros
  const ica = valor(visita.ica) ?? (cin > 0 && estatura > 0 ? (cin / (estatura * 100)).toFixed(3) : null);

  const [rc] = await conn.query(
    `INSERT INTO consulta (
       paciente_id, medico_curp, fecha_consulta, peso, estatura, imc,
       percentil, cintura, cadera, indice_cc, pa_sistolica, pa_diastolica, usuario_id,
       ica, musculo_kg, grasa_kg, grasa_pct, grasa_visceral, perimetro_cefalico
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      pacienteId, medicoCurp || "", fecha_consulta,
      valor(visita.peso), valor(visita.estatura), imc,
      valor(visita.percentil), valor(visita.cintura), valor(visita.cadera), indice_cc,
      valor(visita.pa_sistolica), valor(visita.pa_diastolica), usuarioId,
      ica, valor(visita.musculo_kg), valor(visita.grasa_kg), valor(visita.grasa_pct),
      valor(visita.grasa_visceral), valor(visita.perimetro_cefalico),
    ]
  );
  const consultaId = rc.insertId;

  // ── Laboratorio ───────────────────────────────────────────────────────────
  if (hayDatos(laboratorio, LAB_COLS)) {
    const cols = ["paciente_id", "consulta_id", "fecha_muestra", ...LAB_COLS, "usuario_id"];
    const vals = [
      pacienteId, consultaId, laboratorio.fecha_muestra || fecha_consulta,
      ...LAB_COLS.map((c) => valor(laboratorio[c])), usuarioId,
    ];
    await conn.query(
      `INSERT INTO laboratorio (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, vals
    );
    guardado.push("laboratorio");
  }

  // ── Tratamiento ───────────────────────────────────────────────────────────
  if (tratamiento) {
    const insulinas = (tratamiento.insulinas || []).filter((i) => !vacio(i.insulina_id));
    const orales = (tratamiento.orales || []).filter((o) => !vacio(o.antidiabetico_id));
    const hayTrat = insulinas.length || orales.length ||
      ["terapia_id", "esquema_insulina_id", "dispositivo_id"].some((c) => !vacio(tratamiento[c]));
    if (hayTrat) {
      const inicio = tratamiento.fecha_inicio || fecha_consulta;
      const [rt] = await conn.query(
        `INSERT INTO tratamiento (paciente_id, consulta_id, terapia_id, esquema_insulina_id, dispositivo_id, fecha_inicio, activo, usuario_id)
         VALUES (?,?,?,?,?,?,1,?)`,
        [pacienteId, consultaId, valor(tratamiento.terapia_id), valor(tratamiento.esquema_insulina_id),
          valor(tratamiento.dispositivo_id), inicio, usuarioId]
      );
      for (const i of insulinas) {
        await conn.query(
          `INSERT INTO tratamiento_insulina_detalle (tratamiento_id, insulina_id, dosis_unidades, frecuencia, momento)
           VALUES (?,?,?,?,?)`,
          [rt.insertId, i.insulina_id, valor(i.dosis_unidades), valor(i.frecuencia), valor(i.momento)]
        );
      }
      for (const o of orales) {
        await conn.query(
          `INSERT INTO tratamiento_oral (paciente_id, consulta_id, antidiabetico_id, dosis_mg, frecuencia, fecha_inicio, usuario_id)
           VALUES (?,?,?,?,?,?,?)`,
          [pacienteId, consultaId, o.antidiabetico_id, valor(o.dosis_mg), valor(o.frecuencia), o.fecha_inicio || inicio, usuarioId]
        );
      }
      guardado.push("tratamiento");
    }
  }

  // ── Evaluación de complicaciones ──────────────────────────────────────────
  if (hayDatos(evaluacion, EVAL_COLS)) {
    const cols = ["paciente_id", "consulta_id", "fecha_evaluacion", ...EVAL_COLS, "usuario_id"];
    const upd = ["consulta_id", ...EVAL_COLS].map((c) => `${c}=VALUES(${c})`).join(",");
    // La tabla tiene UNIQUE (paciente_id, fecha_evaluacion): una segunda captura el mismo día la actualiza.
    await conn.query(
      `INSERT INTO evaluacion (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})
       ON DUPLICATE KEY UPDATE ${upd}`,
      [pacienteId, consultaId, fecha_consulta, ...EVAL_COLS.map((c) => valor(evaluacion[c])), usuarioId]
    );
    guardado.push("evaluacion");
  }

  // ── Educación ─────────────────────────────────────────────────────────────
  if (educacion && !vacio(educacion.tema)) {
    await conn.query(
      `INSERT INTO educacion (paciente_id, consulta_id, fecha, tema, modalidad, duracion_min, educador, observaciones, usuario_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [pacienteId, consultaId, fecha_consulta, educacion.tema, valor(educacion.modalidad),
        valor(educacion.duracion_min), valor(educacion.educador), valor(educacion.observaciones), usuarioId]
    );
    guardado.push("educacion");
  }

  // ── Estilo de vida ────────────────────────────────────────────────────────
  if (hayDatos(estilo_vida, ESTILO_COLS)) {
    const cols = ["paciente_id", "consulta_id", ...ESTILO_COLS, "usuario_id"];
    await conn.query(
      `INSERT INTO estilovida (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
      [pacienteId, consultaId, ...ESTILO_COLS.map((c) => valor(estilo_vida[c])), usuarioId]
    );
    guardado.push("estilo_vida");
  }

  // ── Toxicomanías ──────────────────────────────────────────────────────────
  // La tabla tiene UNIQUE (paciente_id): es un solo registro por paciente (como lo importado),
  // así que cada consulta lo ACTUALIZA y lo liga a la consulta más reciente.
  if (hayDatos(toxicomanias, TOX_COLS)) {
    const cols = ["paciente_id", "consulta_id", ...TOX_COLS, "usuario_id"];
    const upd = ["consulta_id", ...TOX_COLS, "usuario_id"].map((c) => `${c}=VALUES(${c})`).join(",");
    await conn.query(
      `INSERT INTO toxicomanias (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})
       ON DUPLICATE KEY UPDATE ${upd}`,
      [pacienteId, consultaId, ...TOX_COLS.map((c) => valor(toxicomanias[c])), usuarioId]
    );
    guardado.push("toxicomanias");
  }

  // ── Eventos (cada uno con la fecha en que ocurrió; por omisión la de la consulta) ──
  const evs = (eventos || []).filter((e) => !vacio(e.tipo));
  for (const e of evs) {
    await conn.query(
      `INSERT INTO evento (paciente_id, consulta_id, tipo, fecha, descripcion, gravedad, requirio_hospitalizacion, usuario_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [pacienteId, consultaId, e.tipo, e.fecha || fecha_consulta, valor(e.descripcion),
        GRAVEDAD_POR_TIPO[e.tipo] || null, e.requirio_hospitalizacion ? 1 : 0, usuarioId]
    );
  }
  if (evs.length) guardado.push("eventos");

  return { consulta_id: consultaId, guardado };
}
