import { useEffect, useState, Fragment } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import {
  getPaciente,
  getDiagnosticoClinico,
  getConsultas, createConsulta,
  getLaboratorios, createLaboratorio,
  getTratamiento, createTratamiento,
  createTratamientoOtx, updateTratamientoOtx, deleteTratamientoOtx,
  createAjusteDosis, updateAjusteDosis, deleteAjusteDosis,
  getEvaluaciones, createEvaluacion,
  getEvaluacionesComplementarias,
  createEvaluacionComplementaria, updateEvaluacionComplementaria, deleteEvaluacionComplementaria,
  getMonitoreo, createMonitoreo, updateMonitoreo, deleteMonitoreo,
  getEducacion, createEducacion,
  getCatalogosEvaluacion,
  getComorbilidad,
  getPatologia,
  getAntecedentesGO,
  getEventos,
  getEstiloVida,
  getToxicomanias,
  getReclasificaciones,
  getEmbarazos,
} from "../../api/renacedApi";

const TABS = ["Resumen", "Diagnóstico", "Consultas", "Laboratorio", "Tratamiento", "Evaluación", "Monitoreo", "Educación",
  "Comorbilidades", "Patologías", "Ant. G.O.", "Eventos", "Estilo Vida", "Toxicomanías", "Reclasificación", "Embarazo"];

const TAB_GRUPOS = [
  { label: "Expediente", tabs: ["Resumen","Diagnóstico","Consultas","Laboratorio","Tratamiento","Evaluación","Monitoreo","Educación"] },
  { label: "Antecedentes", tabs: ["Comorbilidades","Patologías","Ant. G.O.","Eventos","Estilo Vida","Toxicomanías","Reclasificación","Embarazo"] },
];

// Opciones reutilizables para los formularios de las tablas nuevas
const INSULINAS_OPC = [
  ["1", "NPH"], ["2", "Glargina"], ["3", "Detemir"], ["4", "Degludec"],
  ["5", "Rápida"], ["6", "Lispro"], ["7", "Aspart"], ["8", "Glulisina"],
];
const FLAG_OPC  = ["", "SI", "NO"];
const NEURO_OPC = ["", "NORMAL", "ANORMAL", "PRESENTE", "AUSENTE", "DISMINUIDO"];

// Campos de Evaluación Complementaria (base → se generan _d / _i)
const COMP_OJOS = [
  ["Sin retinopatía", "ret_sin", "flag"],
  ["Retinopatía no proliferativa", "ret_no_prolif", "flag"],
  ["Retinopatía proliferativa", "ret_prolif", "flag"],
  ["Fotocoagulación", "fotocoagulacion", "flag"],
  ["Vitrectomía", "vitrectomia", "flag"],
  ["Cataratas", "cataratas", "flag"],
  ["Glaucoma", "glaucoma", "flag"],
  ["Mácula", "macula", "flag"],
];
const COMP_PIES = [
  ["Deformado", "deformado", "flag"],
  ["Piel seca", "piel_seca", "flag"],
  ["Callosidades", "callosidades", "flag"],
  ["Infección", "infeccion", "flag"],
  ["Fisuras", "fisuras", "flag"],
  ["Ulceración aguda", "ulceracion_aguda", "flag"],
  ["Ulceración curada", "ulceracion_curada", "flag"],
  ["Angioplastia", "angioplastia", "flag"],
  ["Onicomicosis", "onicomicosis", "flag"],
  ["Vibración", "vibracion", "neuro"],
  ["Monofilamento", "monofilamento", "neuro"],
  ["Reflejo aquiliano", "aquiliano", "neuro"],
  ["Pulso pedio", "pedio", "neuro"],
];

// Campos de Monitoreo por periodo [label, name, type] (type: date|text|number|flag)
const MON_DISPOSITIVOS = [
  ["Fecha registro", "fecha_registro", "date"],
  ["Automonitoreo", "automonitoreo", "flag"],
  ["¿Dónde?", "automonitoreo_donde", "text"],
  ["Glucómetro (id)", "glucometro_id", "number"],
  ["N° mediciones/día", "num_mediciones", "number"],
  ["DSM", "dsm", "text"],
  ["Cetonas", "cetonas", "flag"],
  ["Cetonas ¿dónde?", "cetonas_donde", "text"],
  ["Flash (Libre)", "flash_libre", "flag"],
  ["Flash semanas", "flash_semanas", "number"],
  ["Flash escaneos/día", "flash_escaneos", "number"],
  ["MCG continuo", "continuo", "flag"],
  ["Continuo marca", "continuo_marca", "text"],
  ["Continuo submodelo", "continuo_sub", "text"],
  ["Continuo semanas", "continuo_semanas", "number"],
  ["Continuo % uso", "continuo_porcentaje", "number"],
];
const MON_METRICAS = [
  ["Glucosa prom.", "glucosa_prom"],
  ["Tiempo en rango (%)", "tiempo_rango"],
  ["T. rango objetivo (%)", "tiempo_rango_obj"],
  ["T. rango obj. embarazo (%)", "tiempo_rango_obj_emb"],
  [">250 (%)", "per_250"],
  [">180 (%)", "per_180"],
  [">140 (%)", "per_140"],
  ["<70 (%)", "per_70"],
  ["<63 (%)", "per_63"],
  ["<54 (%)", "per_54"],
  ["IMG", "img"],
  ["Sensor", "sensor"],
  ["Desv. estándar", "desv_std"],
  ["Coef. variación (%)", "cohef_var"],
];

const btnEditar   = { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "2px 6px" };
const btnEliminar = { background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "2px 6px" };

export default function RenacedPacienteDetalle() {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab]    = useState("Resumen");

  // diagnóstico clínico (solo lectura)
  const [dx, setDx]         = useState(null);
  const [dxCargando, setDxCargando] = useState(false);

  // datos por tab
  const [consultas, setConsultas]         = useState([]);
  const [laboratorios, setLaboratorios]   = useState([]);
  const [tratamiento, setTratamiento]     = useState({ tratamientos: [], insulinas: [], orales: [], otros: [], ajustes: [] });
  const [evaluaciones, setEvaluaciones]   = useState([]);
  const [complementarias, setComplementarias] = useState([]);
  const [monitoreo, setMonitoreo]         = useState([]);
  const [educacion, setEducacion]         = useState([]);

  // nuevos módulos (solo lectura)
  const [comorb, setComorb]         = useState(null);
  const [patologia, setPatologia]   = useState([]);
  const [ago, setAgo]               = useState(null);
  const [eventos, setEventos]       = useState([]);
  const [estiloVida, setEstiloVida] = useState([]);
  const [toxicoList, setToxicoList] = useState([]);
  const [reclList, setReclList]     = useState([]);
  const [embList, setEmbList]       = useState([]);
  const [nuevosCargando, setNuevosCargando] = useState(false);

  // catálogos para evaluación
  const [cats, setCats] = useState({ retinopatia: [], nefropatia: [], neuropatia: [], pie_diabetico: [], cardiovascular: [] });

  // modales de nueva entrada
  const [modalConsulta, setModalConsulta]     = useState(false);
  const [modalLab, setModalLab]               = useState(false);
  const [modalTratamiento, setModalTratamiento] = useState(false);
  const [modalEvaluacion, setModalEvaluacion] = useState(false);
  const [modalEducacion, setModalEducacion]   = useState(false);
  const [formConsulta, setFormConsulta]     = useState({ fecha_consulta: "", peso: "", estatura: "", pa_sistolica: "", pa_diastolica: "", cintura: "" });
  const [formLab, setFormLab]               = useState({ fecha_muestra: "", hba1c: "", glucosa_ayuno: "", colesterol_total: "", hdl: "", ldl: "", trigliceridos: "", creatinina: "" });
  const [formTratamiento, setFormTratamiento] = useState({ fecha_inicio: "", terapia_id: "", esquema_insulina_id: "", dispositivo_id: "", insulina_id: "", dosis_unidades: "", antidiabetico_id: "", dosis_mg: "", frecuencia: "" });
  const [formEvaluacion, setFormEvaluacion] = useState({ fecha_evaluacion: "", retinopatia_id: "", nefropatia_id: "", neuropatia_id: "", pie_diabetico_id: "", enf_cardiovascular_id: "", observaciones: "" });
  const [formEducacion, setFormEducacion]   = useState({ fecha: "", tema: "", modalidad: "", duracion_min: "", educador: "", observaciones: "" });
  const [guardando, setGuardando]           = useState(false);

  // ── Tablas nuevas: otros tratamientos, ajustes de dosis, complementarias, monitoreo ──
  const [modalOtx, setModalOtx]   = useState(false);
  const [editOtxId, setEditOtxId] = useState(null);
  const [formOtx, setFormOtx]     = useState({ descripcion: "", dosis: "", fecha_inicio: "", fecha_fin: "", activo: "1" });

  const [modalAjuste, setModalAjuste]   = useState(false);
  const [editAjusteId, setEditAjusteId] = useState(null);
  const [formAjuste, setFormAjuste]     = useState({ fecha_ajuste: "", dosis_total_dia: "", dosis_total_kg_dia: "" });
  const [formAjusteDet, setFormAjusteDet] = useState([{ insulina_id: "", dosis: "", inyecciones: "" }]);

  const [modalComp, setModalComp]   = useState(false);
  const [editCompId, setEditCompId] = useState(null);
  const [formComp, setFormComp]     = useState({});

  const [modalMon, setModalMon]   = useState(false);
  const [editMonId, setEditMonId] = useState(null);
  const [formMon, setFormMon]     = useState({});

  useEffect(() => {
    getPaciente(id)
      .then((r) => setPaciente(r.data))
      .catch(() => setPaciente(null))
      .finally(() => setCargando(false));
    getCatalogosEvaluacion().then((r) => setCats(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (tab === "Diagnóstico") {
      setDxCargando(true);
      getDiagnosticoClinico(id)
        .then((r) => setDx(r.data || null))
        .catch(() => setDx(null))
        .finally(() => setDxCargando(false));
    }
    if (tab === "Consultas")   getConsultas(id).then((r)    => setConsultas(r.data));
    if (tab === "Laboratorio") getLaboratorios(id).then((r)  => setLaboratorios(r.data));
    if (tab === "Tratamiento") getTratamiento(id).then((r)   => setTratamiento(r.data));
    if (tab === "Evaluación") {
      getEvaluaciones(id).then((r)  => setEvaluaciones(r.data));
      getEvaluacionesComplementarias(id).then((r) => setComplementarias(r.data)).catch(() => setComplementarias([]));
    }
    if (tab === "Monitoreo")   getMonitoreo(id).then((r)      => setMonitoreo(r.data)).catch(() => setMonitoreo([]));
    if (tab === "Educación")   getEducacion(id).then((r)     => setEducacion(r.data));
    // nuevos módulos
    const nuevos = { "Comorbilidades": ()=>getComorbilidad(id).then(r=>setComorb(r.data||null)).catch(()=>{}),
                     "Patologías":     ()=>getPatologia(id).then(r=>setPatologia(r.data||[])).catch(()=>{}),
                     "Ant. G.O.":      ()=>getAntecedentesGO(id).then(r=>setAgo(r.data||null)).catch(()=>{}),
                     "Eventos":        ()=>getEventos(id).then(r=>setEventos(r.data||[])).catch(()=>{}),
                     "Estilo Vida":    ()=>getEstiloVida(id).then(r=>setEstiloVida(r.data||[])).catch(()=>{}),
                     "Toxicomanías":   ()=>getToxicomanias(id).then(r=>setToxicoList(r.data||[])).catch(()=>{}),
                     "Reclasificación":()=>getReclasificaciones(id).then(r=>setReclList(r.data||[])).catch(()=>{}),
                     "Embarazo":       ()=>getEmbarazos(id).then(r=>setEmbList(r.data||[])).catch(()=>{}) };
    if (nuevos[tab]) nuevos[tab]();
  }, [tab, id]);

  async function guardarConsulta(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await createConsulta(id, formConsulta);
      const r = await getConsultas(id);
      setConsultas(r.data);
      setModalConsulta(false);
      setFormConsulta({ fecha_consulta: "", peso: "", estatura: "", pa_sistolica: "", pa_diastolica: "", cintura: "" });
    } finally {
      setGuardando(false);
    }
  }

  async function guardarLab(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await createLaboratorio(id, formLab);
      const r = await getLaboratorios(id);
      setLaboratorios(r.data);
      setModalLab(false);
      setFormLab({ fecha_muestra: "", hba1c: "", glucosa_ayuno: "", colesterol_total: "", hdl: "", ldl: "", trigliceridos: "", creatinina: "" });
    } finally { setGuardando(false); }
  }

  async function guardarTratamiento(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const insulinas = formTratamiento.insulina_id
        ? [{ insulina_id: formTratamiento.insulina_id, dosis_unidades: formTratamiento.dosis_unidades }]
        : [];
      const orales = formTratamiento.antidiabetico_id
        ? [{ antidiabetico_id: formTratamiento.antidiabetico_id, dosis_mg: formTratamiento.dosis_mg, frecuencia: formTratamiento.frecuencia }]
        : [];
      await createTratamiento(id, {
        terapia_id: formTratamiento.terapia_id || null,
        esquema_insulina_id: formTratamiento.esquema_insulina_id || null,
        dispositivo_id: formTratamiento.dispositivo_id || null,
        fecha_inicio: formTratamiento.fecha_inicio || null,
        insulinas,
        orales,
      });
      const r = await getTratamiento(id);
      setTratamiento(r.data);
      setModalTratamiento(false);
      setFormTratamiento({ fecha_inicio: "", terapia_id: "", esquema_insulina_id: "", dispositivo_id: "", insulina_id: "", dosis_unidades: "", antidiabetico_id: "", dosis_mg: "", frecuencia: "" });
    } finally { setGuardando(false); }
  }

  async function guardarEvaluacion(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await createEvaluacion(id, formEvaluacion);
      const r = await getEvaluaciones(id);
      setEvaluaciones(r.data);
      setModalEvaluacion(false);
      setFormEvaluacion({ fecha_evaluacion: "", retinopatia_id: "", nefropatia_id: "", neuropatia_id: "", pie_diabetico_id: "", enf_cardiovascular_id: "", observaciones: "" });
    } finally { setGuardando(false); }
  }

  async function guardarEducacion(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await createEducacion(id, formEducacion);
      const r = await getEducacion(id);
      setEducacion(r.data);
      setModalEducacion(false);
      setFormEducacion({ fecha: "", tema: "", modalidad: "", duracion_min: "", educador: "", observaciones: "" });
    } finally { setGuardando(false); }
  }

  // ── Otros tratamientos ──────────────────────────────────────────────────
  function abrirOtxNuevo() {
    setEditOtxId(null);
    setFormOtx({ descripcion: "", dosis: "", fecha_inicio: "", fecha_fin: "", activo: "1" });
    setModalOtx(true);
  }
  function abrirOtxEdit(o) {
    setEditOtxId(o.id);
    setFormOtx({
      descripcion: o.descripcion || "", dosis: o.dosis || "",
      fecha_inicio: o.fecha_inicio || "", fecha_fin: o.fecha_fin || "",
      activo: o.activo ? "1" : "0",
    });
    setModalOtx(true);
  }
  async function guardarOtx(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const payload = { ...formOtx, activo: Number(formOtx.activo) };
      if (editOtxId) await updateTratamientoOtx(id, editOtxId, payload);
      else await createTratamientoOtx(id, payload);
      const r = await getTratamiento(id);
      setTratamiento(r.data);
      setModalOtx(false);
    } finally { setGuardando(false); }
  }
  async function eliminarOtx(o) {
    if (!window.confirm("¿Eliminar este tratamiento?")) return;
    await deleteTratamientoOtx(id, o.id);
    const r = await getTratamiento(id);
    setTratamiento(r.data);
  }

  // ── Ajustes de dosis ────────────────────────────────────────────────────
  function abrirAjusteNuevo() {
    setEditAjusteId(null);
    setFormAjuste({ fecha_ajuste: "", dosis_total_dia: "", dosis_total_kg_dia: "" });
    setFormAjusteDet([{ insulina_id: "", dosis: "", inyecciones: "" }]);
    setModalAjuste(true);
  }
  function abrirAjusteEdit(a) {
    setEditAjusteId(a.id);
    setFormAjuste({
      fecha_ajuste: a.fecha_ajuste || "",
      dosis_total_dia: a.dosis_total_dia ?? "",
      dosis_total_kg_dia: a.dosis_total_kg_dia ?? "",
    });
    const det = (a.detalle || []).map((d) => ({
      insulina_id: d.insulina_id != null ? String(d.insulina_id) : "",
      dosis: d.dosis ?? "", inyecciones: d.inyecciones ?? "",
    }));
    setFormAjusteDet(det.length ? det : [{ insulina_id: "", dosis: "", inyecciones: "" }]);
    setModalAjuste(true);
  }
  async function guardarAjuste(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const detalle = formAjusteDet.filter((d) => d.insulina_id);
      const payload = { ...formAjuste, detalle };
      if (editAjusteId) await updateAjusteDosis(id, editAjusteId, payload);
      else await createAjusteDosis(id, payload);
      const r = await getTratamiento(id);
      setTratamiento(r.data);
      setModalAjuste(false);
    } finally { setGuardando(false); }
  }
  async function eliminarAjuste(a) {
    if (!window.confirm("¿Eliminar este ajuste de dosis?")) return;
    await deleteAjusteDosis(id, a.id);
    const r = await getTratamiento(id);
    setTratamiento(r.data);
  }

  // ── Evaluación complementaria ───────────────────────────────────────────
  function abrirCompNuevo() {
    setEditCompId(null);
    setFormComp({ fecha_ojos: "", fecha_pies: "" });
    setModalComp(true);
  }
  function abrirCompEdit(c) {
    setEditCompId(c.id);
    const f = { fecha_ojos: c.fecha_ojos || "", fecha_pies: c.fecha_pies || "" };
    [...COMP_OJOS, ...COMP_PIES].forEach(([, base]) => {
      f[`${base}_d`] = c[`${base}_d`] || "";
      f[`${base}_i`] = c[`${base}_i`] || "";
    });
    setFormComp(f);
    setModalComp(true);
  }
  async function guardarComp(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editCompId) await updateEvaluacionComplementaria(id, editCompId, formComp);
      else await createEvaluacionComplementaria(id, formComp);
      const r = await getEvaluacionesComplementarias(id);
      setComplementarias(r.data);
      setModalComp(false);
    } finally { setGuardando(false); }
  }
  async function eliminarComp(c) {
    if (!window.confirm("¿Eliminar esta evaluación complementaria?")) return;
    await deleteEvaluacionComplementaria(id, c.id);
    const r = await getEvaluacionesComplementarias(id);
    setComplementarias(r.data);
  }

  // ── Monitoreo ───────────────────────────────────────────────────────────
  function abrirMonNuevo() {
    setEditMonId(null);
    setFormMon({ fecha_registro: "" });
    setModalMon(true);
  }
  function abrirMonEdit(m) {
    setEditMonId(m.id);
    const f = {};
    MON_DISPOSITIVOS.forEach(([, name]) => { f[name] = m[name] ?? ""; });
    MON_METRICAS.forEach(([, base]) => {
      f[`${base}_2s`] = m[`${base}_2s`] ?? "";
      f[`${base}_3m`] = m[`${base}_3m`] ?? "";
    });
    setFormMon(f);
    setModalMon(true);
  }
  async function guardarMon(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editMonId) await updateMonitoreo(id, editMonId, formMon);
      else await createMonitoreo(id, formMon);
      const r = await getMonitoreo(id);
      setMonitoreo(r.data);
      setModalMon(false);
    } finally { setGuardando(false); }
  }
  async function eliminarMon(m) {
    if (!window.confirm("¿Eliminar este registro de monitoreo?")) return;
    await deleteMonitoreo(id, m.id);
    const r = await getMonitoreo(id);
    setMonitoreo(r.data);
  }

  if (cargando) return <RenacedLayout><div className="loading">Cargando paciente…</div></RenacedLayout>;
  if (!paciente) return <RenacedLayout><div className="card" style={{ color: "#dc2626" }}>Paciente no encontrado</div></RenacedLayout>;

  const p = paciente;
  const nombreCompleto = `${p.nombre} ${p.ap_pat} ${p.ap_mat || ""}`.trim();

  const hba1cColor = (v) => {
    if (!v) return "#94a3b8";
    if (v < 7)  return "#22c55e";
    if (v <= 9) return "#f59e0b";
    return "#ef4444";
  };

  const InfoRow = ({ label, value }) => (
    <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ minWidth: 160, fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );

  return (
    <RenacedLayout>
      {/* Header */}
      <div className="page-header" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to="/renaced/pacientes" style={{ color: "#94a3b8", fontSize: 13, display: "inline-block", marginBottom: 4 }}>
            ← Pacientes RENACED
          </Link>
          <h1 style={{ margin: 0, fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", wordBreak: "break-word" }}>{nombreCompleto}</h1>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              {p.diagnostico?.tipo_diabetes || "Sin diagnóstico"}
            </span>
            <span style={{ background: p.sexo === "F" ? "#fce7f3" : "#dbeafe", color: p.sexo === "F" ? "#be185d" : "#1d4ed8", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              {p.sexo === "F" ? "Mujer" : "Hombre"}
            </span>
            {p.edad != null && <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>{p.edad} años</span>}
            {p.curp && <span style={{ background: "#f8fafc", color: "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontFamily: "monospace" }}>{p.curp}</span>}
          </div>
        </div>
        <Link to={`/renaced/pacientes/${id}/editar`} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
          Editar
        </Link>
      </div>

      {/* ── Tabs responsivos ─────────────────────────────────────────────────── */}
      {/* Móvil: select desplegable */}
      <div className="tab-select-mobile">
        <select
          value={tab}
          onChange={e => setTab(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, background: "#fff", color: "#0f172a", marginBottom: 16 }}
        >
          {TAB_GRUPOS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.tabs.map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {/* Desktop: dos filas de tabs */}
      <div className="tab-grupos-desktop" style={{ marginBottom: 20 }}>
        {TAB_GRUPOS.map((grupo) => (
          <div key={grupo.label} style={{ marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", paddingLeft: 4 }}>
              {grupo.label}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "2px solid #e2e8f0" }}>
              {grupo.tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "7px 14px", border: "none", background: "none",
                    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
                    marginBottom: "-2px",
                    color: tab === t ? "#6366f1" : "#64748b",
                    fontWeight: tab === t ? 700 : 500,
                    fontSize: 13, cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Resumen ──────────────────────────────────────────────────────────── */}
      {tab === "Resumen" && (
        <div className="detalle-2col">
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Datos Personales</h3>
            <InfoRow label="Expediente"         value={p.expediente} />
            <InfoRow label="Fecha nacimiento"   value={p.fecha_nacimiento} />
            <InfoRow label="CURP"               value={p.curp} />
            <InfoRow label="Estado nacimiento"  value={p.estado_nacimiento} />
            <InfoRow label="Teléfonos"          value={p.telefonos} />
            <InfoRow label="Email"              value={p.email} />
          </div>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Diagnóstico</h3>
            {p.diagnostico ? (
              <>
                <InfoRow label="Tipo de diabetes"    value={p.diagnostico.tipo_diabetes} />
                <InfoRow label="Fecha diagnóstico"   value={p.diagnostico.fecha_diagnostico} />
                <InfoRow label="Edad al diagnóstico" value={p.diagnostico.edad_diagnostico ? `${p.diagnostico.edad_diagnostico} años` : null} />
                <InfoRow label="Criterio Dx"         value={p.diagnostico.criterio_dx} />
              </>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: 13 }}>Sin diagnóstico registrado</p>
            )}
          </div>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Domicilio</h3>
            <InfoRow label="Estado residencia"  value={p.estado_residencia} />
            <InfoRow label="Colonia"            value={p.colonia} />
            <InfoRow label="Calle y número"     value={p.calle_num} />
            <InfoRow label="Código postal"      value={p.codigo_postal} />
          </div>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Unidad Médica</h3>
            <InfoRow label="Establecimiento"    value={p.establecimiento_cve} />
            <InfoRow label="Unidad"             value={p.unidad} />
            <InfoRow label="Aviso privacidad"   value={p.tiene_aviso_privacidad ? "Sí" : "No"} />
            <InfoRow label="Consentimiento"     value={p.tiene_consentimiento ? "Sí" : "No"} />
          </div>
        </div>
      )}

      {/* ── Diagnóstico Clínico (solo lectura) ──────────────────────────────── */}
      {tab === "Diagnóstico" && (
        <div>
          {dxCargando && <div className="loading">Cargando diagnóstico…</div>}

          {!dxCargando && !dx && (
            <div className="card" style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <p style={{ fontSize: 15, margin: "0 0 16px" }}>Sin datos de diagnóstico clínico registrados</p>
              <button className="btn btn-primary" onClick={() => navigate(`/renaced/consultas/${id}`)}>
                Registrar diagnóstico en Consultas
              </button>
            </div>
          )}

          {!dxCargando && dx && (() => {
            // helper: valor o null para mostrar "—" en campos vacíos
            const val = (v) => (v == null || v === "" ? null : v);
            const fechaDx = dx.fecha_approx
              ? `${dx.fecha_approx_anio}${dx.fecha_approx_mes ? `/${dx.fecha_approx_mes}` : ""} (aprox.)`
              : dx.fecha_diagnostico?.slice(0, 10);

            return (
              <div className="detalle-2col">
                {/* Datos básicos del dx */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Datos al Diagnóstico</h3>
                  <InfoRow label="Fecha diagnóstico"   value={fechaDx} />
                  <InfoRow label="Edad al diagnóstico" value={dx.edad_diagnostico != null ? `${dx.edad_diagnostico} años` : null} />
                  <InfoRow label="Peso (kg)"        value={val(dx.peso)} />
                  <InfoRow label="Estatura (m)"     value={val(dx.estatura)} />
                  <InfoRow label="IMC"              value={val(dx.imc)} />
                  <InfoRow label="PA"               value={val(dx.pa_sistolica) != null ? `${dx.pa_sistolica}/${dx.pa_diastolica} mmHg` : null} />
                  <InfoRow label="Glucemia al azar" value={val(dx.glucemia_azar) != null ? `${dx.glucemia_azar} mg/dl` : null} />
                  <InfoRow label="HbA1c"            value={val(dx.hba1c) != null ? `${dx.hba1c}%` : null} />
                  <InfoRow label="Péptido C"        value={val(dx.peptido_c) != null ? `${dx.peptido_c} ng/ml` : null} />
                </div>

                {/* Evento al diagnóstico */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Evento al Diagnóstico</h3>
                  <InfoRow label="Cetoacidosis" value={val(dx.cetoacidosis)} />
                  <InfoRow label="PH" value={val(dx.cetoacidosis_ph)} />
                  <InfoRow label="Bicarbonato" value={val(dx.cetoacidosis_bicarbonato) != null ? `${dx.cetoacidosis_bicarbonato} mEq/L` : null} />
                  <InfoRow label="Hospitalización" value={val(dx.hospitalizacion)} />
                  <InfoRow label="Días hospital" value={val(dx.hospitalizacion_dias)} />
                  <InfoRow label="Terapia intensiva" value={val(dx.terapia_intensiva)} />
                  <InfoRow label="Días UCI" value={val(dx.terapia_intensiva_dias)} />
                </div>

                {/* Anticuerpos */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Anticuerpos</h3>
                  {[["Anti-GAD","anti_gad","anti_gad_valor"],["Anti-Insulina","anti_insulina","anti_insulina_valor"],["Anti-Islotes","anti_islotes","anti_islotes_valor"],["Anti-IA2","anti_ia2","anti_ia2_valor"],["Anti-ZCT8","anti_zct8","anti_zct8_valor"]].map(([label, f, fv]) => (
                    <InfoRow key={f} label={label} value={val(dx[f]) != null ? `${dx[f]}${dx[f] === "POS" && dx[fv] ? ` (${dx[fv]} nmol/L)` : ""}` : null} />
                  ))}
                </div>

                {/* Antecedentes */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Antecedentes</h3>
                  <InfoRow label="DM T1 familiar" value={val(dx.antec_dm1) != null ? `${dx.antec_dm1}${dx.antec_dm1_grado ? ` — ${dx.antec_dm1_grado}° grado` : ""}` : null} />
                  <InfoRow label="DM T2 familiar" value={val(dx.antec_dm2) != null ? `${dx.antec_dm2}${dx.antec_dm2_grado ? ` — ${dx.antec_dm2_grado}° grado` : ""}` : null} />
                  <InfoRow label="Nacido por"        value={val(dx.nacido_por)} />
                  <InfoRow label="Lactancia materna" value={val(dx.lactancia_materna)} />
                  <InfoRow label="Hipotiroidismo"    value={val(dx.hipotiroidismo_dx)} />
                </div>

                {/* Tratamiento al diagnóstico */}
                <div className="card" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Tratamiento al Diagnóstico</h3>
                  <div className="detalle-3col">
                    <InfoRow label="Terapia"          value={val(dx.terapia)} />
                    <InfoRow label="Esquema insulina" value={val(dx.esquema_insulina)} />
                    <InfoRow label="Cálculo dosis"    value={val(dx.calculo_dosis)} />
                    <InfoRow label="Dosis prescrita"  value={val(dx.dosis_prescrita) != null ? `${dx.dosis_prescrita} U/día` : null} />
                    <InfoRow label="Dispositivo"      value={val(dx.dispositivo)} />
                    <InfoRow label="Institución"      value={val(dx.institucion)} />
                  </div>
                </div>

                {/* MODY / LADA */}
                {dx.tipo_mody && (
                  <div className="card" style={{ margin: 0, border: "1.5px solid #e9d5ff" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#7c3aed" }}>Datos MODY</h3>
                    <InfoRow label="Tipo MODY"             value={dx.tipo_mody} />
                    <InfoRow label="Confirmación genética" value={dx.confirmacion_genetica} />
                    {dx.mutacion && <InfoRow label="Mutación" value={dx.mutacion} />}
                  </div>
                )}
                {dx.lada_fecha_insulina && (
                  <div className="card" style={{ margin: 0, border: "1.5px solid #bfdbfe" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#1d4ed8" }}>Datos LADA</h3>
                    <InfoRow label="Fecha inicio insulina" value={dx.lada_fecha_insulina?.slice(0,10)} />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Consultas ────────────────────────────────────────────────────────── */}
      {tab === "Consultas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalConsulta(true)}>
              + Nueva Consulta
            </button>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Peso (kg)</th>
                    <th>Talla (m)</th>
                    <th>IMC</th>
                    <th>Cintura (cm)</th>
                    <th>PA</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fecha_consulta}</td>
                      <td>{c.peso ?? "—"}</td>
                      <td>{c.estatura ?? "—"}</td>
                      <td>{c.imc ?? "—"}</td>
                      <td>{c.cintura ?? "—"}</td>
                      <td>{c.pa_sistolica && c.pa_diastolica ? `${c.pa_sistolica}/${c.pa_diastolica}` : "—"}</td>
                    </tr>
                  ))}
                  {consultas.length === 0 && <tr><td colSpan={6} className="empty-cell">Sin consultas registradas</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Laboratorio ──────────────────────────────────────────────────────── */}
      {tab === "Laboratorio" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalLab(true)}>
              + Nuevo Laboratorio
            </button>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha muestra</th>
                    <th>HbA1c (%)</th>
                    <th>Glucosa en ayuno</th>
                    <th>Colesterol</th>
                    <th>HDL</th>
                    <th>LDL</th>
                    <th>Triglicéridos</th>
                    <th>Creatinina</th>
                  </tr>
                </thead>
                <tbody>
                  {laboratorios.map((l) => (
                    <tr key={l.id}>
                      <td>{l.fecha_muestra}</td>
                      <td>
                        {l.hba1c != null
                          ? <span style={{ fontWeight: 700, color: hba1cColor(l.hba1c) }}>{l.hba1c}%</span>
                          : "—"}
                      </td>
                      <td>{l.glucosa_ayuno ?? "—"}</td>
                      <td>{l.colesterol_total ?? "—"}</td>
                      <td>{l.hdl ?? "—"}</td>
                      <td>{l.ldl ?? "—"}</td>
                      <td>{l.trigliceridos ?? "—"}</td>
                      <td>{l.creatinina ?? "—"}</td>
                    </tr>
                  ))}
                  {laboratorios.length === 0 && <tr><td colSpan={8} className="empty-cell">Sin resultados de laboratorio</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tratamiento ──────────────────────────────────────────────────────── */}
      {tab === "Tratamiento" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalTratamiento(true)}>
              + Nuevo Tratamiento
            </button>
          </div>
          {/* Insulinas */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Insulinas</h3>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr><th>Fecha inicio</th><th>Terapia</th><th>Esquema</th><th>Dispositivo</th><th>Activo</th></tr>
                </thead>
                <tbody>
                  {tratamiento.tratamientos.map((t) => (
                    <tr key={t.id}>
                      <td>{t.fecha_inicio || "—"}</td>
                      <td>{t.terapia || "—"}</td>
                      <td>{t.esquema_insulina || "—"}</td>
                      <td>{t.dispositivo || "—"}</td>
                      <td>
                        <span style={{ color: t.activo ? "#22c55e" : "#94a3b8", fontWeight: 600 }}>
                          {t.activo ? "Sí" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tratamiento.insulinas.map((ins) => (
                    <tr key={`ins-${ins.id}`} style={{ background: "#f8fafc" }}>
                      <td colSpan={2} style={{ paddingLeft: 24, color: "#64748b", fontSize: 12 }}>↳ {ins.insulina}</td>
                      <td>{ins.dosis_unidades ? `${ins.dosis_unidades} U` : "—"}</td>
                      <td>{ins.frecuencia || "—"}</td>
                      <td>{ins.momento || "—"}</td>
                    </tr>
                  ))}
                  {tratamiento.tratamientos.length === 0 && (
                    <tr><td colSpan={5} className="empty-cell">Sin tratamiento con insulina registrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Oral */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#6366f1" }}>Antidiabéticos Orales</h3>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr><th>Medicamento</th><th>Dosis (mg)</th><th>Frecuencia</th><th>Inicio</th><th>Fin</th><th>Activo</th></tr>
                </thead>
                <tbody>
                  {tratamiento.orales.map((o) => (
                    <tr key={o.id}>
                      <td>{o.antidiabetico || "—"}</td>
                      <td>{o.dosis_mg ?? "—"}</td>
                      <td>{o.frecuencia || "—"}</td>
                      <td>{o.fecha_inicio || "—"}</td>
                      <td>{o.fecha_fin || "—"}</td>
                      <td><span style={{ color: o.activo ? "#22c55e" : "#94a3b8", fontWeight: 600 }}>{o.activo ? "Sí" : "No"}</span></td>
                    </tr>
                  ))}
                  {tratamiento.orales.length === 0 && (
                    <tr><td colSpan={6} className="empty-cell">Sin medicamentos orales registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Otros tratamientos */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#6366f1" }}>Otros Tratamientos</h3>
              <button className="btn btn-primary btn-sm" onClick={abrirOtxNuevo}>+ Nuevo</button>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr><th>Medicamento</th><th>Dosis</th><th>Inicio</th><th>Fin</th><th>Activo</th><th></th></tr>
                </thead>
                <tbody>
                  {(tratamiento.otros || []).map((o) => (
                    <tr key={`otx-${o.id}`}>
                      <td>{o.descripcion || "—"}</td>
                      <td>{o.dosis || "—"}</td>
                      <td>{o.fecha_inicio || "—"}</td>
                      <td>{o.fecha_fin || "—"}</td>
                      <td><span style={{ color: o.activo ? "#22c55e" : "#94a3b8", fontWeight: 600 }}>{o.activo ? "Sí" : "No"}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn-link" onClick={() => abrirOtxEdit(o)} style={btnEditar}>Editar</button>
                        <button className="btn-link" onClick={() => eliminarOtx(o)} style={btnEliminar}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {(!tratamiento.otros || tratamiento.otros.length === 0) && (
                    <tr><td colSpan={6} className="empty-cell">Sin otros tratamientos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Ajustes de dosis de insulina */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#6366f1" }}>Ajustes de Dosis de Insulina</h3>
              <button className="btn btn-primary btn-sm" onClick={abrirAjusteNuevo}>+ Nuevo</button>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr><th>Fecha ajuste</th><th>Insulinas</th><th>Dosis total (U/día)</th><th>U/kg/día</th><th></th></tr>
                </thead>
                <tbody>
                  {(tratamiento.ajustes || []).map((a) => (
                    <tr key={`adj-${a.id}`}>
                      <td>{a.fecha_ajuste || "—"}</td>
                      <td style={{ fontSize: 12, color: "#475569" }}>
                        {(a.detalle && a.detalle.length)
                          ? a.detalle.map((d) => `${d.insulina}: ${d.dosis ?? "—"} U${d.inyecciones ? ` (${d.inyecciones}×)` : ""}`).join(" · ")
                          : "—"}
                      </td>
                      <td>{a.dosis_total_dia ?? "—"}</td>
                      <td>{a.dosis_total_kg_dia ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn-link" onClick={() => abrirAjusteEdit(a)} style={btnEditar}>Editar</button>
                        <button className="btn-link" onClick={() => eliminarAjuste(a)} style={btnEliminar}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {(!tratamiento.ajustes || tratamiento.ajustes.length === 0) && (
                    <tr><td colSpan={5} className="empty-cell">Sin ajustes de dosis registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Evaluación de complicaciones ─────────────────────────────────────── */}
      {tab === "Evaluación" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalEvaluacion(true)}>
              + Nueva Evaluación
            </button>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Retinopatía</th>
                    <th>Nefropatía</th>
                    <th>Neuropatía</th>
                    <th>Pie diabético</th>
                    <th>Enf. cardiovascular</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluaciones.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.fecha_evaluacion || "—"}</td>
                      <td>{ev.retinopatia || "—"}</td>
                      <td>{ev.nefropatia || "—"}</td>
                      <td>{ev.neuropatia || "—"}</td>
                      <td>{ev.pie_diabetico || "—"}</td>
                      <td>{ev.enf_cardiovascular || "—"}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.observaciones || "—"}
                      </td>
                    </tr>
                  ))}
                  {evaluaciones.length === 0 && (
                    <tr><td colSpan={7} className="empty-cell">Sin evaluaciones de complicaciones registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluaciones complementarias (oftalmología y revisión de pies) */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#6366f1" }}>Evaluaciones Complementarias (Oftalmología y Pies)</h3>
              <button className="btn btn-primary btn-sm" onClick={abrirCompNuevo}>+ Nueva</button>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha ojos</th>
                    <th>Retinopatía (D/I)</th>
                    <th>Fotocoagulación</th>
                    <th>Fecha pies</th>
                    <th>Úlcera aguda</th>
                    <th>Monofilamento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {complementarias.map((c) => {
                    const par = (d, i) => `${d || "—"} / ${i || "—"}`;
                    return (
                      <tr key={`comp-${c.id}`}>
                        <td>{c.fecha_ojos || "—"}</td>
                        <td>{par(c.ret_no_prolif_d || c.ret_prolif_d, c.ret_no_prolif_i || c.ret_prolif_i)}</td>
                        <td>{par(c.fotocoagulacion_d, c.fotocoagulacion_i)}</td>
                        <td>{c.fecha_pies || "—"}</td>
                        <td>{par(c.ulceracion_aguda_d, c.ulceracion_aguda_i)}</td>
                        <td>{par(c.monofilamento_d, c.monofilamento_i)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn-link" onClick={() => abrirCompEdit(c)} style={btnEditar}>Editar</button>
                          <button className="btn-link" onClick={() => eliminarComp(c)} style={btnEliminar}>Eliminar</button>
                        </td>
                      </tr>
                    );
                  })}
                  {complementarias.length === 0 && (
                    <tr><td colSpan={7} className="empty-cell">Sin evaluaciones complementarias registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Monitoreo (automonitoreo y MCG) ──────────────────────────────────── */}
      {tab === "Monitoreo" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#6366f1" }}>Monitoreo de Glucosa por Periodo</h3>
            <button className="btn btn-primary btn-sm" onClick={abrirMonNuevo}>+ Nuevo</button>
          </div>
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Automonitoreo</th>
                  <th>Flash (Libre)</th>
                  <th>MCG continuo</th>
                  <th>Glucosa prom.</th>
                  <th>Tiempo en rango (%)</th>
                  <th>&gt;180 (%)</th>
                  <th>&lt;70 (%)</th>
                  <th>CV (%)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {monitoreo.map((m) => (
                  <tr key={`mon-${m.id}`}>
                    <td>{m.fecha_registro || "—"}</td>
                    <td>{m.automonitoreo || "—"}</td>
                    <td>{m.flash_libre || "—"}</td>
                    <td>{m.continuo || "—"}</td>
                    <td>{m.glucosa_prom_3m ?? m.glucosa_prom_2s ?? "—"}</td>
                    <td>{m.tiempo_rango_3m ?? m.tiempo_rango_2s ?? "—"}</td>
                    <td>{m.per_180_3m ?? m.per_180_2s ?? "—"}</td>
                    <td>{m.per_70_3m ?? m.per_70_2s ?? "—"}</td>
                    <td>{m.cohef_var_3m ?? m.cohef_var_2s ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn-link" onClick={() => abrirMonEdit(m)} style={btnEditar}>Editar</button>
                      <button className="btn-link" onClick={() => eliminarMon(m)} style={btnEliminar}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {monitoreo.length === 0 && (
                  <tr><td colSpan={10} className="empty-cell">Sin registros de monitoreo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Educación ────────────────────────────────────────────────────────── */}
      {tab === "Educación" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalEducacion(true)}>
              + Nueva Sesión
            </button>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tema</th>
                    <th>Modalidad</th>
                    <th>Duración (min)</th>
                    <th>Educador</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {educacion.map((ed) => (
                    <tr key={ed.id}>
                      <td>{ed.fecha || "—"}</td>
                      <td>{ed.tema}</td>
                      <td>{ed.modalidad || "—"}</td>
                      <td>{ed.duracion_min ?? "—"}</td>
                      <td>{ed.educador || "—"}</td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ed.observaciones || "—"}
                      </td>
                    </tr>
                  ))}
                  {educacion.length === 0 && (
                    <tr><td colSpan={6} className="empty-cell">Sin sesiones de educación registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva consulta ─────────────────────────────────────────────── */}
      {modalConsulta && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nueva Consulta</h3>
              <button onClick={() => setModalConsulta(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarConsulta}>
              <div className="detalle-2col">
                {[
                  ["Fecha consulta", "fecha_consulta", "date"],
                  ["Peso (kg)", "peso", "number"],
                  ["Talla (m)", "estatura", "number"],
                  ["Cintura (cm)", "cintura", "number"],
                  ["PA sistólica", "pa_sistolica", "number"],
                  ["PA diastólica", "pa_diastolica", "number"],
                ].map(([label, name, type]) => (
                  <div className="form-group" key={name}>
                    <label style={{ fontSize: 12 }}>{label}</label>
                    <input
                      type={type}
                      step="any"
                      value={formConsulta[name]}
                      onChange={(e) => setFormConsulta((f) => ({ ...f, [name]: e.target.value }))}
                      required={name === "fecha_consulta"}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalConsulta(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal nuevo laboratorio ──────────────────────────────────────────── */}
      {modalLab && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nuevo Laboratorio</h3>
              <button onClick={() => setModalLab(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarLab}>
              <div className="detalle-2col">
                {[
                  ["Fecha muestra", "fecha_muestra", "date"],
                  ["HbA1c (%)", "hba1c", "number"],
                  ["Glucosa en ayuno", "glucosa_ayuno", "number"],
                  ["Colesterol total", "colesterol_total", "number"],
                  ["HDL", "hdl", "number"],
                  ["LDL", "ldl", "number"],
                  ["Triglicéridos", "trigliceridos", "number"],
                  ["Creatinina", "creatinina", "number"],
                ].map(([label, name, type]) => (
                  <div className="form-group" key={name}>
                    <label style={{ fontSize: 12 }}>{label}</label>
                    <input
                      type={type}
                      step="any"
                      value={formLab[name]}
                      onChange={(e) => setFormLab((f) => ({ ...f, [name]: e.target.value }))}
                      required={name === "fecha_muestra"}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalLab(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Modal nuevo tratamiento ─────────────────────────────────────────── */}
      {modalTratamiento && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 560, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nuevo Tratamiento</h3>
              <button onClick={() => setModalTratamiento(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarTratamiento}>
              <div className="detalle-2col">
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Fecha inicio</label>
                  <input type="date" value={formTratamiento.fecha_inicio}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, fecha_inicio: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Terapia</label>
                  <select value={formTratamiento.terapia_id}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, terapia_id: e.target.value }))}>
                    <option value="">-- Seleccionar --</option>
                    <option value="1">Dieta y ejercicio</option>
                    <option value="2">Oral</option>
                    <option value="3">Insulina</option>
                    <option value="4">Insulina + Oral</option>
                    <option value="5">Otra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Esquema insulina</label>
                  <select value={formTratamiento.esquema_insulina_id}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, esquema_insulina_id: e.target.value }))}>
                    <option value="">-- Seleccionar --</option>
                    <option value="1">Tradicional</option>
                    <option value="2">Premezcla</option>
                    <option value="3">Basal</option>
                    <option value="4">Basal-Bolo</option>
                    <option value="5">Microinfusora</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Dispositivo</label>
                  <select value={formTratamiento.dispositivo_id}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, dispositivo_id: e.target.value }))}>
                    <option value="">-- Seleccionar --</option>
                    <option value="1">Jeringa</option>
                    <option value="2">Pluma</option>
                    <option value="3">Microinfusora</option>
                    <option value="4">Otro</option>
                  </select>
                </div>
                <p style={{ gridColumn: "1/-1", margin: "8px 0 0", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Insulina (opcional)</p>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Tipo de insulina</label>
                  <select value={formTratamiento.insulina_id}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, insulina_id: e.target.value }))}>
                    <option value="">-- Ninguna --</option>
                    <option value="1">NPH</option>
                    <option value="2">Glargina</option>
                    <option value="3">Detemir</option>
                    <option value="4">Degludec</option>
                    <option value="5">Rápida</option>
                    <option value="6">Lispro</option>
                    <option value="7">Aspart</option>
                    <option value="8">Glulisina</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Dosis (U)</label>
                  <input type="number" step="0.01" value={formTratamiento.dosis_unidades}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, dosis_unidades: e.target.value }))} />
                </div>
                <p style={{ gridColumn: "1/-1", margin: "8px 0 0", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Medicamento oral (opcional)</p>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Antidiabético oral</label>
                  <select value={formTratamiento.antidiabetico_id}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, antidiabetico_id: e.target.value }))}>
                    <option value="">-- Ninguno --</option>
                    <option value="1">Metformina</option>
                    <option value="2">Sulfonilureas</option>
                    <option value="7">Análogos GLP-1</option>
                    <option value="8">Inhibidores DPP-4</option>
                    <option value="9">Inhibidores SGLT2</option>
                    <option value="5">Glitazonas</option>
                    <option value="10">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Dosis (mg)</label>
                  <input type="number" step="0.01" value={formTratamiento.dosis_mg}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, dosis_mg: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 12 }}>Frecuencia</label>
                  <input type="text" placeholder="Ej: 1 vez al día, con el desayuno" value={formTratamiento.frecuencia}
                    onChange={(e) => setFormTratamiento((f) => ({ ...f, frecuencia: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalTratamiento(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal nueva evaluación ───────────────────────────────────────────── */}
      {modalEvaluacion && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Nueva Evaluación de Complicaciones</h3>
              <button onClick={() => setModalEvaluacion(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarEvaluacion}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Fecha evaluación *</label>
                  <input type="date" value={formEvaluacion.fecha_evaluacion}
                    onChange={(e) => setFormEvaluacion((f) => ({ ...f, fecha_evaluacion: e.target.value }))} required />
                </div>

                {[
                  ["Retinopatía",         "retinopatia_id",        cats.retinopatia],
                  ["Nefropatía",          "nefropatia_id",         cats.nefropatia],
                  ["Neuropatía",          "neuropatia_id",         cats.neuropatia],
                  ["Pie diabético",       "pie_diabetico_id",      cats.pie_diabetico],
                  ["Enf. cardiovascular", "enf_cardiovascular_id", cats.cardiovascular],
                ].map(([label, field, opciones]) => (
                  <div className="form-group" key={field}>
                    <label style={{ fontSize: 12 }}>{label}</label>
                    <select
                      value={formEvaluacion[field]}
                      onChange={(e) => setFormEvaluacion((f) => ({ ...f, [field]: e.target.value }))}
                    >
                      <option value="">— Sin registro —</option>
                      {opciones.map((o) => (
                        <option key={o.id} value={o.id}>{o.descripcion}</option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Observaciones</label>
                  <textarea rows={3} value={formEvaluacion.observaciones}
                    onChange={(e) => setFormEvaluacion((f) => ({ ...f, observaciones: e.target.value }))}
                    style={{ resize: "vertical" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalEvaluacion(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal nueva sesión de educación ─────────────────────────────────── */}
      {modalEducacion && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nueva Sesión de Educación</h3>
              <button onClick={() => setModalEducacion(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarEducacion}>
              <div className="detalle-2col">
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Fecha</label>
                  <input type="date" value={formEducacion.fecha}
                    onChange={(e) => setFormEducacion((f) => ({ ...f, fecha: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Duración (min)</label>
                  <input type="number" value={formEducacion.duracion_min}
                    onChange={(e) => setFormEducacion((f) => ({ ...f, duracion_min: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 12 }}>Tema</label>
                  <input type="text" value={formEducacion.tema}
                    onChange={(e) => setFormEducacion((f) => ({ ...f, tema: e.target.value }))} required
                    placeholder="Ej. Conteo de carbohidratos, ajuste de dosis…" />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Modalidad</label>
                  <select value={formEducacion.modalidad}
                    onChange={(e) => setFormEducacion((f) => ({ ...f, modalidad: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option value="Individual">Individual</option>
                    <option value="Grupal">Grupal</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Taller">Taller</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Educador</label>
                  <input type="text" value={formEducacion.educador}
                    onChange={(e) => setFormEducacion((f) => ({ ...f, educador: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 12 }}>Observaciones</label>
                  <textarea rows={2} value={formEducacion.observaciones}
                    onChange={(e) => setFormEducacion((f) => ({ ...f, observaciones: e.target.value }))}
                    style={{ resize: "vertical" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalEducacion(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Otros Tratamientos ─────────────────────────────────────────── */}
      {modalOtx && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editOtxId ? "Editar" : "Nuevo"} Otro Tratamiento</h3>
              <button onClick={() => setModalOtx(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarOtx}>
              <div className="detalle-2col">
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 12 }}>Medicamento / descripción *</label>
                  <input type="text" value={formOtx.descripcion} required
                    onChange={(e) => setFormOtx((f) => ({ ...f, descripcion: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Dosis</label>
                  <input type="text" value={formOtx.dosis}
                    onChange={(e) => setFormOtx((f) => ({ ...f, dosis: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Activo</label>
                  <select value={formOtx.activo}
                    onChange={(e) => setFormOtx((f) => ({ ...f, activo: e.target.value }))}>
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Fecha inicio</label>
                  <input type="date" value={formOtx.fecha_inicio}
                    onChange={(e) => setFormOtx((f) => ({ ...f, fecha_inicio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Fecha fin</label>
                  <input type="date" value={formOtx.fecha_fin}
                    onChange={(e) => setFormOtx((f) => ({ ...f, fecha_fin: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOtx(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Ajuste de Dosis ────────────────────────────────────────────── */}
      {modalAjuste && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 560, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editAjusteId ? "Editar" : "Nuevo"} Ajuste de Dosis</h3>
              <button onClick={() => setModalAjuste(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarAjuste}>
              <div className="detalle-3col">
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Fecha ajuste *</label>
                  <input type="date" value={formAjuste.fecha_ajuste} required
                    onChange={(e) => setFormAjuste((f) => ({ ...f, fecha_ajuste: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Dosis total (U/día)</label>
                  <input type="number" step="0.001" value={formAjuste.dosis_total_dia}
                    onChange={(e) => setFormAjuste((f) => ({ ...f, dosis_total_dia: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>U/kg/día</label>
                  <input type="number" step="0.001" value={formAjuste.dosis_total_kg_dia}
                    onChange={(e) => setFormAjuste((f) => ({ ...f, dosis_total_kg_dia: e.target.value }))} />
                </div>
              </div>
              <p style={{ margin: "14px 0 6px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Insulinas del ajuste</p>
              {formAjusteDet.map((d, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Insulina</label>
                    <select value={d.insulina_id}
                      onChange={(e) => setFormAjusteDet((arr) => arr.map((x, i) => i === idx ? { ...x, insulina_id: e.target.value } : x))}>
                      <option value="">-- Seleccionar --</option>
                      {INSULINAS_OPC.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Dosis (U)</label>
                    <input type="number" step="0.001" value={d.dosis}
                      onChange={(e) => setFormAjusteDet((arr) => arr.map((x, i) => i === idx ? { ...x, dosis: e.target.value } : x))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Inyec.</label>
                    <input type="number" value={d.inyecciones}
                      onChange={(e) => setFormAjusteDet((arr) => arr.map((x, i) => i === idx ? { ...x, inyecciones: e.target.value } : x))} />
                  </div>
                  <button type="button" onClick={() => setFormAjusteDet((arr) => arr.filter((_, i) => i !== idx))}
                    style={{ ...btnEliminar, paddingBottom: 8 }}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => setFormAjusteDet((arr) => [...arr, { insulina_id: "", dosis: "", inyecciones: "" }])}>
                + Agregar insulina
              </button>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalAjuste(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Evaluación Complementaria ──────────────────────────────────── */}
      {modalComp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 620, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{editCompId ? "Editar" : "Nueva"} Evaluación Complementaria</h3>
              <button onClick={() => setModalComp(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarComp}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Oftalmología</p>
              <div className="form-group" style={{ maxWidth: 220 }}>
                <label style={{ fontSize: 12 }}>Fecha evaluación ojos</label>
                <input type="date" value={formComp.fecha_ojos || ""}
                  onChange={(e) => setFormComp((f) => ({ ...f, fecha_ojos: e.target.value }))} />
              </div>
              {COMP_OJOS.map(([label, base, tipo]) => (
                <div key={base} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 8, alignItems: "center", margin: "4px 0" }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
                  {["d", "i"].map((lado) => (
                    <select key={lado} value={formComp[`${base}_${lado}`] || ""}
                      onChange={(e) => setFormComp((f) => ({ ...f, [`${base}_${lado}`]: e.target.value }))}>
                      {(tipo === "neuro" ? NEURO_OPC : FLAG_OPC).map((o) => (
                        <option key={o} value={o}>{o === "" ? (lado === "d" ? "Der —" : "Izq —") : o}</option>
                      ))}
                    </select>
                  ))}
                </div>
              ))}
              <p style={{ margin: "16px 0 8px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Revisión de pies</p>
              <div className="form-group" style={{ maxWidth: 220 }}>
                <label style={{ fontSize: 12 }}>Fecha evaluación pies</label>
                <input type="date" value={formComp.fecha_pies || ""}
                  onChange={(e) => setFormComp((f) => ({ ...f, fecha_pies: e.target.value }))} />
              </div>
              {COMP_PIES.map(([label, base, tipo]) => (
                <div key={base} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 8, alignItems: "center", margin: "4px 0" }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
                  {["d", "i"].map((lado) => (
                    <select key={lado} value={formComp[`${base}_${lado}`] || ""}
                      onChange={(e) => setFormComp((f) => ({ ...f, [`${base}_${lado}`]: e.target.value }))}>
                      {(tipo === "neuro" ? NEURO_OPC : FLAG_OPC).map((o) => (
                        <option key={o} value={o}>{o === "" ? (lado === "d" ? "Der —" : "Izq —") : o}</option>
                      ))}
                    </select>
                  ))}
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalComp(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Monitoreo ──────────────────────────────────────────────────── */}
      {modalMon && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 680, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{editMonId ? "Editar" : "Nuevo"} Monitoreo</h3>
              <button onClick={() => setModalMon(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <form onSubmit={guardarMon}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Dispositivos</p>
              <div className="detalle-2col">
                {MON_DISPOSITIVOS.map(([label, name, type]) => (
                  <div className="form-group" key={name}>
                    <label style={{ fontSize: 12 }}>{label}</label>
                    {type === "flag" ? (
                      <select value={formMon[name] || ""}
                        onChange={(e) => setFormMon((f) => ({ ...f, [name]: e.target.value }))}>
                        {FLAG_OPC.map((o) => <option key={o} value={o}>{o === "" ? "—" : o}</option>)}
                      </select>
                    ) : (
                      <input type={type} step={type === "number" ? "any" : undefined} value={formMon[name] || ""}
                        required={name === "fecha_registro"}
                        onChange={(e) => setFormMon((f) => ({ ...f, [name]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              <p style={{ margin: "16px 0 8px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Métricas (2 semanas / 3 meses)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}></span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>2 semanas</span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>3 meses</span>
                {MON_METRICAS.map(([label, base]) => (
                  <Fragment key={base}>
                    <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
                    <input type="number" step="any" value={formMon[`${base}_2s`] || ""}
                      onChange={(e) => setFormMon((f) => ({ ...f, [`${base}_2s`]: e.target.value }))} />
                    <input type="number" step="any" value={formMon[`${base}_3m`] || ""}
                      onChange={(e) => setFormMon((f) => ({ ...f, [`${base}_3m`]: e.target.value }))} />
                  </Fragment>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalMon(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Comorbilidades (lectura) ──────────────────────────────────────────── */}
      {tab === "Comorbilidades" && (
        <div>
          {!comorb ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin comorbilidades registradas</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : (
            <div className="card">
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Comorbilidades Crónicas</h3>
              {[["Retinopatía","retinopatia","retinopatia_fecha","retinopatia_tipo_label"],["Nefropatía","nefropatia","nefropatia_fecha","nefropatia_tipo_label"],["Neuropatía","neuropatia","neuropatia_fecha","neuropatia_tipo_label"],["Vasculopatía Periférica","vascular_perif","vascular_perif_fecha",null],["Enf. Cardiovascular","cardiovascular","cardiovascular_fecha",null],["Pie Diabético","pie_diabetico","pie_diabetico_fecha",null]].map(([label,campo,fechaCampo,tipoCampo])=>(
                <InfoRow key={campo} label={label} value={
                  comorb[campo]==="SI"
                    ? `SI${comorb[fechaCampo]?` (${comorb[fechaCampo].slice(0,10)})`:""} ${tipoCampo&&comorb[tipoCampo]?`— ${comorb[tipoCampo]}`:""}`
                    : comorb[campo]||"—"
                } />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Patologías (lectura) ──────────────────────────────────────────────── */}
      {tab === "Patologías" && (
        <div>
          {!patologia || patologia.length === 0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin patologías registradas</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : (
            <div className="card">
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Patologías Asociadas</h3>
              {patologia.map(p=>(
                <InfoRow key={p.id} label={p.nombre}
                  value={[p.fecha_dx?.slice(0,10), p.activa===0?"(inactiva)":null, p.observaciones].filter(Boolean).join(" · ") || "—"} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Antecedentes G.O. (lectura) ──────────────────────────────────────── */}
      {tab === "Ant. G.O." && (
        <div>
          {!ago ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin antecedentes G.O. registrados</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div className="card" style={{ margin:0 }}>
                <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Datos Ginecológicos</h3>
                <InfoRow label="Menarca" value={ago.menarca?`${ago.menarca} años`:null} />
                <InfoRow label="FUM" value={ago.fum?.slice(0,10)} />
                <InfoRow label="VISA" value={ago.visa} />
                <InfoRow label="MAC" value={ago.mac} />
                <InfoRow label="Hijos > 4 kg" value={ago.peso_4000} />
                <InfoRow label="Menopausia" value={ago.menopausia} />
                {ago.menopausia==="SI" && <>
                  <InfoRow label="Fecha menopausia" value={ago.menopausia_fecha?.slice(0,10)} />
                  <InfoRow label="Tipo" value={ago.tipo_menopausia} />
                  <InfoRow label="TRH" value={ago.trh} />
                </>}
              </div>
              <div className="card" style={{ margin:0 }}>
                <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Embarazos Previos</h3>
                {[1,2,3,4,5,6,7,8,9,10].filter(i=>ago[`emb_previo${i}_des`]).map(i=>(
                  <InfoRow key={i} label={`Embarazo ${i}`} value={`${{"P":"Parto","C":"Cesárea","A":"Aborto","O":"Otro"}[ago[`emb_previo${i}_des`]]||ago[`emb_previo${i}_des`]}${ago[`emb_previo${i}_fecha`]?` — ${ago[`emb_previo${i}_fecha`].slice(0,10)}`:""}${ago[`emb_previo${i}_diabetes`]?` · DM: ${ago[`emb_previo${i}_diabetes`]}`:""}`} />
                ))}
                {![1,2,3,4,5,6,7,8,9,10].some(i=>ago[`emb_previo${i}_des`]) && <p style={{ color:"#94a3b8", fontSize:13 }}>Sin embarazos previos registrados</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Eventos (lectura) ─────────────────────────────────────────────────── */}
      {tab === "Eventos" && (
        <div>
          {eventos.length === 0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin eventos registrados</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : eventos.map(ev=>(
            <div key={ev.id} className="card" style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ background:"#ede9fe", color:"#6366f1", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600 }}>
                  {ev.tipo?.replace(/_/g," ")}
                </span>
                <span style={{ fontSize:11, color:"#94a3b8" }}>{ev.fecha?.slice(0,10) || ev.fecha_captura?.slice(0,10)}</span>
              </div>
              {ev.descripcion && <p style={{ margin:"4px 0 0", fontSize:13, color:"#374151" }}>{ev.descripcion}</p>}
              {ev.gravedad && <InfoRow label="Gravedad" value={ev.gravedad} />}
              <InfoRow label="Requirió hospitalización" value={ev.requirio_hospitalizacion ? "Sí" : "No"} />
            </div>
          ))}
        </div>
      )}

      {/* ── Estilo de Vida (lectura) ──────────────────────────────────────────── */}
      {tab === "Estilo Vida" && (
        <div>
          {estiloVida.length === 0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin registros de estilo de vida</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : (
            <div className="card">
              <div className="table-wrapper">
                <table className="tabla"><thead><tr><th>Fecha</th><th>Actividad física</th><th>Min/sem</th><th>Dieta especial</th><th>Tipo dieta</th><th>Tabaquismo</th><th>Alcoholismo</th></tr></thead>
                  <tbody>{estiloVida.map(r=>(
                    <tr key={r.id}>
                      <td>{r.fecha_captura?.slice(0,10)}</td>
                      <td>{r.actividad_fisica||"—"}</td>
                      <td>{r.minutos_semana||"—"}</td>
                      <td>{r.dieta_especial||"—"}</td>
                      <td>{r.tipo_dieta||"—"}</td>
                      <td>{r.tabaquismo||"—"}</td>
                      <td>{r.alcoholismo||"—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Toxicomanías (lectura) ────────────────────────────────────────────── */}
      {tab === "Toxicomanías" && (
        <div>
          {toxicoList.length === 0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin registros de toxicomanías</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : (
            <div className="card">
              <div className="table-wrapper">
                <table className="tabla"><thead><tr><th>Fecha</th><th>Tabaco</th><th>Alcohol</th><th>Drogas</th><th>Observaciones</th></tr></thead>
                  <tbody>{toxicoList.map(r=>(
                    <tr key={r.id}>
                      <td>{r.fecha_captura?.slice(0,10)}</td>
                      <td>{r.tabaco||"—"}</td>
                      <td>{r.alcohol||"—"}</td>
                      <td>{r.drogas||"—"}</td>
                      <td>{r.observaciones||"—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reclasificación (lectura) ─────────────────────────────────────────── */}
      {tab === "Reclasificación" && (
        <div>
          {reclList.length === 0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin reclasificaciones registradas</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : reclList.map(r=>(
            <div key={r.id} className="card" style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <p style={{ margin:0, fontSize:11, color:"#94a3b8" }}>{r.fecha_captura?.slice(0,10)}</p>
                <span style={{ background:r.resultado==="SI"?"#dcfce7":"#fef2f2", color:r.resultado==="SI"?"#166534":"#dc2626", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600 }}>
                  {r.resultado==="SI"?"Reclasificado":"No reclasificado"}
                </span>
              </div>
              <div className="detalle-3col">
                <InfoRow label="Glucosa ayuno" value={r.glucosa_ayuno?`${r.glucosa_ayuno} mg/dl`:null} />
                <InfoRow label="HbA1c" value={r.hba1c?`${r.hba1c}%`:null} />
                <InfoRow label="CTOG 75g ayuno" value={r.ctog_ayuno?`${r.ctog_ayuno} mg/dl`:null} />
                <InfoRow label="CTOG 75g 1h" value={r.ctog_60min?`${r.ctog_60min} mg/dl`:null} />
                <InfoRow label="CTOG 75g 2h" value={r.ctog_120min?`${r.ctog_120min} mg/dl`:null} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Embarazo (lectura) ────────────────────────────────────────────────── */}
      {tab === "Embarazo" && (
        <div>
          {embList.length === 0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
              <p style={{ margin:"0 0 16px" }}>Sin embarazos registrados</p>
              <button className="btn btn-primary" onClick={()=>navigate(`/renaced/consultas/${id}`)}>Registrar en Consultas</button>
            </div>
          ) : embList.map(r=>(
            <div key={r.id} className="card" style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <h4 style={{ margin:0, fontSize:"0.9rem" }}>FUM: {r.fecha_um?.slice(0,10)||"—"}</h4>
                <span style={{ background:r.estatus_embarazo==="EN_CURSO"?"#dbeafe":"#f1f5f9", color:r.estatus_embarazo==="EN_CURSO"?"#1d4ed8":"#475569", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600 }}>
                  {r.estatus_embarazo||"—"}
                </span>
              </div>
              <div className="detalle-3col">
                <InfoRow label="Tipo embarazo" value={r.tipo_embarazo} />
                <InfoRow label="Logro" value={r.logro_embarazo} />
                <InfoRow label="HbA1c dx" value={r.hba1c_dx?`${r.hba1c_dx}%`:null} />
                <InfoRow label="Semanas" value={r.semanas_gestacion} />
                <InfoRow label="Vía parto" value={r.via_parto} />
                <InfoRow label="Peso RN" value={r.peso_rn?`${r.peso_rn} kg`:null} />
                {r.hipertension==="SI" && <InfoRow label="Hipertensión" value="SI" />}
                {r.preeclampsia==="SI" && <InfoRow label="Preeclampsia" value="SI" />}
                {r.eclampsia==="SI"    && <InfoRow label="Eclampsia" value="SI" />}
                {r.macrosomia==="SI"   && <InfoRow label="Macrosomía" value="SI" />}
              </div>
            </div>
          ))}
        </div>
      )}

    </RenacedLayout>
  );
}
