// Historial de consultas de un paciente: una "visita" por fecha con todo lo registrado ese día.
//
// Los datos nuevos traen `consulta_id`; los del sistema anterior casi no (cada pestaña tenía su
// propia fecha). Para que se vean igual, todo se agrupa por la FECHA de la visita:
//   · fila con consulta_id  → fecha de esa consulta
//   · fila sin consulta_id  → su propia fecha (fecha_muestra, fecha_evaluacion, fecha, fecha_inicio…)
// Solo lectura: no modifica nada.

const dia = (v) => (v ? String(v).slice(0, 10) : null);
export const SIN_FECHA = "sin_fecha";

/**
 * @param {import("mysql2/promise").Pool} db
 * @param {string|number} pacienteId
 * @returns {Promise<Array>} visitas, la más reciente primero
 */
export async function armarHistorial(db, pacienteId) {
  const [consultas] = await db.query(
    `SELECT c.*, m.nombre AS medico_nombre, m.ap_pat AS medico_ap_pat
     FROM consulta c LEFT JOIN medico m ON m.curp = c.medico_curp
     WHERE c.paciente_id = ?`, [pacienteId]
  );
  const [labs] = await db.query("SELECT * FROM laboratorio WHERE paciente_id = ?", [pacienteId]);
  const [evals] = await db.query(
    `SELECT e.*, cr.descripcion AS retinopatia, cn.descripcion AS nefropatia, cne.descripcion AS neuropatia,
            cp.descripcion AS pie_diabetico, cc.descripcion AS enf_cardiovascular
     FROM evaluacion e
     LEFT JOIN cat_retinopatia cr ON cr.id = e.retinopatia_id
     LEFT JOIN cat_nefropatia cn ON cn.id = e.nefropatia_id
     LEFT JOIN cat_neuropatia cne ON cne.id = e.neuropatia_id
     LEFT JOIN cat_pie_diabetico cp ON cp.id = e.pie_diabetico_id
     LEFT JOIN cat_enfermedad_cardiovascular_periferica cc ON cc.id = e.enf_cardiovascular_id
     WHERE e.paciente_id = ?`, [pacienteId]
  );
  const [trats] = await db.query(
    `SELECT t.*, ct.descripcion AS terapia, ce.descripcion AS esquema_insulina, cd.descripcion AS dispositivo
     FROM tratamiento t
     LEFT JOIN cat_terapia ct ON ct.id = t.terapia_id
     LEFT JOIN cat_esquemas_insulinas ce ON ce.id = t.esquema_insulina_id
     LEFT JOIN cat_dispositivo cd ON cd.id = t.dispositivo_id
     WHERE t.paciente_id = ?`, [pacienteId]
  );
  const insPorTrat = {};
  if (trats.length) {
    const [ins] = await db.query(
      `SELECT tid.tratamiento_id, tid.dosis_unidades, tid.frecuencia, tid.momento, ci.nombre AS insulina
       FROM tratamiento_insulina_detalle tid JOIN cat_insulina ci ON ci.id = tid.insulina_id
       WHERE tid.tratamiento_id IN (?)`, [trats.map((t) => t.id)]
    );
    for (const i of ins) (insPorTrat[i.tratamiento_id] ||= []).push(i);
  }
  const [orales] = await db.query(
    `SELECT tor.*, ca.nombre AS antidiabetico
     FROM tratamiento_oral tor LEFT JOIN cat_antidiabetico ca ON ca.id = tor.antidiabetico_id
     WHERE tor.paciente_id = ?`, [pacienteId]
  );
  const [edu] = await db.query("SELECT * FROM educacion WHERE paciente_id = ?", [pacienteId]);
  const [estilos] = await db.query("SELECT * FROM estilovida WHERE paciente_id = ?", [pacienteId]);
  const [toxs] = await db.query("SELECT * FROM toxicomanias WHERE paciente_id = ?", [pacienteId]);
  const [eventos] = await db.query("SELECT * FROM evento WHERE paciente_id = ?", [pacienteId]);

  const fechaDeConsulta = new Map(consultas.map((c) => [String(c.id), dia(c.fecha_consulta)]));
  const visitas = new Map();
  const visita = (fecha) => {
    if (!visitas.has(fecha)) {
      visitas.set(fecha, {
        fecha, consulta_id: null, visita: null,
        laboratorio: [], tratamiento: [], evaluacion: [], educacion: [],
        estilo_vida: [], toxicomanias: [], eventos: [],
      });
    }
    return visitas.get(fecha);
  };
  // Fecha de agrupación: la de la consulta ligada; si no, la propia de la fila; si no hay, "sin_fecha".
  // (No se usa fecha_captura: en datos importados es la fecha de la migración, no de la visita.)
  const fechaDe = (fila, propia) =>
    (fila.consulta_id != null && fechaDeConsulta.get(String(fila.consulta_id))) || dia(propia) || SIN_FECHA;

  for (const c of consultas) {
    const v = visita(dia(c.fecha_consulta));
    v.consulta_id = v.consulta_id ?? c.id;
    v.visita = v.visita ?? c;
  }
  for (const l of labs) { visita(fechaDe(l, l.fecha_muestra)).laboratorio.push(l); }
  for (const e of evals) { visita(fechaDe(e, e.fecha_evaluacion)).evaluacion.push(e); }
  for (const d of edu) { visita(fechaDe(d, d.fecha)).educacion.push(d); }
  // Estilo de vida y toxicomanías no tienen fecha propia: solo se ubican si están ligados a una consulta.
  // (En lo importado, fecha_captura es la fecha de la migración, no de la visita.)
  const soloLigadas = (filas, destino) => {
    for (const fila of filas) {
      const f = fila.consulta_id != null ? fechaDeConsulta.get(String(fila.consulta_id)) : null;
      if (f) visita(f)[destino].push(fila);
    }
  };
  soloLigadas(estilos, "estilo_vida");
  soloLigadas(toxs, "toxicomanias");
  for (const e of eventos) visita(fechaDe(e, e.fecha)).eventos.push(e);
  for (const t of trats) {
    visita(fechaDe(t, t.fecha_inicio)).tratamiento.push({ ...t, tipo: "principal", insulinas: insPorTrat[t.id] || [] });
  }
  for (const o of orales) {
    visita(fechaDe(o, o.fecha_inicio)).tratamiento.push({ ...o, tipo: "oral" });
  }

  // Más reciente primero; los registros sin fecha al final.
  const orden = (f) => (f === SIN_FECHA ? "" : f);
  return [...visitas.values()].sort((a, b) => (orden(a.fecha) < orden(b.fecha) ? 1 : orden(a.fecha) > orden(b.fecha) ? -1 : 0));
}
