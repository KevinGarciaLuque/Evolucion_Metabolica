import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RenacedLayout from "../components/RenacedLayout";
import HojaConsulta from "../components/HojaConsulta";
import SeccionAcordeon from "../components/SeccionAcordeon";
import { FiClipboard, FiActivity, FiLayers, FiUsers, FiHeart, FiRepeat, FiPlus, FiX } from "react-icons/fi";
import HistorialConsultas from "../components/HistorialConsultas";
import {
  getPaciente,
  getDiagnosticoClinico, saveDiagnosticoClinico,
  getCatalogosEvaluacion,
  getComorbilidad, saveComorbilidad,
  getPatologia, savePatologia,
  getAntecedentesGO, saveAntecedentesGO,
  getReclasificaciones, createReclasificacion, deleteReclasificacion,
  getEmbarazos, createEmbarazo, deleteEmbarazo,
} from "../api/renacedApi";

// ── Constantes compartidas ────────────────────────────────────────────────────
const SINON    = ["", "SI", "NO", "SE DESCONOCE"];
const SINON2   = ["", "SI", "NO"];
const POSNEG   = ["", "POS", "NEG"];
const GRADOS   = [{ id: "", label: "—" }, { id: 1, label: "1er grado" }, { id: 2, label: "2do grado" }, { id: 3, label: "Otro" }];

const DX_INIT = {
  fecha_diagnostico: "", fecha_approx: 0, fecha_approx_anio: "", fecha_approx_mes: "",
  peso: "", estatura: "", imc: "", pa_sistolica: "", pa_diastolica: "",
  cetoacidosis: "", cetoacidosis_ph: "", cetoacidosis_bicarbonato: "",
  glucemia_azar: "", hba1c: "", hba1c_fecha: "", peptido_c: "",
  anti_gad: "", anti_gad_valor: "", anti_insulina: "", anti_insulina_valor: "",
  anti_islotes: "", anti_islotes_valor: "", anti_ia2: "", anti_ia2_valor: "",
  anti_zct8: "", anti_zct8_valor: "",
  hospitalizacion: "", hospitalizacion_dias: "",
  terapia_intensiva: "", terapia_intensiva_dias: "",
  antec_dm1: "", antec_dm1_grado: "", antec_dm2: "", antec_dm2_grado: "",
  nacido_por: "", lactancia_materna: "", hipotiroidismo_dx: "",
  terapia_id: "", esquema_insulina_id: "", calculo_dosis_id: "",
  dosis_prescrita: "", dispositivo_id: "", institucion_id: "",
  tipo_mody: "", confirmacion_genetica: "", mutacion: "",
  lada_fecha_insulina: "", lada_fecha_approx: 0,
};

const DM_COLOR = {
  "Tipo 1":      { bg: "#dbeafe", color: "#1e40af" },
  "Tipo 2":      { bg: "#fef9c3", color: "#92400e" },
  "Gestacional": { bg: "#fce7f3", color: "#9d174d" },
  "Otros":       { bg: "#f3e8ff", color: "#6b21a8" },
};

const COMORB_TIPOS = {
  retinopatia:    ["No proliferativa","Proliferativa","Macular"],
  nefropatia:     ["Microalbuminuria","Macroalbuminuria","Insuficiencia renal"],
  neuropatia:     ["Periférica","Autonómica"],
  vascular_perif: ["Claudicación","Amputación","Otro"],
  cardiovascular: ["Cardiopatía isquémica","Infarto","ICC","Otro"],
  pie_diabetico:  ["Grado 0","Grado 1","Grado 2","Grado 3"],
};

// Patologías frecuentes (se puede escribir cualquier otra)
const PAT_SUGERIDAS = ["HIPOTIROIDISMO", "ENFERMEDAD CELÍACA", "ENFERMEDAD DE ADDISON", "VITILIGO", "ENFERMEDAD DE GRAVES", "HIPERTENSIÓN ARTERIAL", "DISLIPIDEMIA", "OBESIDAD", "SÍNDROME DE OVARIO POLIQUÍSTICO"];
const TIPOS_DM = [["1", "Tipo 1"], ["2", "Tipo 2"], ["3", "Gestacional"], ["4", "Otros"]];
const TERAPIAS_GEST = [["1", "Dieta y ejercicio"], ["2", "Metformina"], ["3", "Insulina"], ["4", "Glibenclamida"]];
const RESULTADOS_EMB = [["EMBARAZADA", "Embarazada (en curso)"], ["NACIMIENTO", "Nacimiento"], ["ABORTO", "Aborto"]];
const hoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const EMB_INIT = { num_gesta: "", fecha_ultima_mens: "", fecha_probable_parto: "", semanas_gestacion: "", terapia_gest_id: "", resultado: "EMBARAZADA", fecha_parto: "", observaciones: "" };

const grupoTitulo = { fontSize: 13, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em", margin: "22px 2px 10px" };
const grupoSub = { fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#94a3b8", fontSize: 12 };

// ── Componente Campo reutilizable ─────────────────────────────────────────────
function Campo({ label, children, colSpan, required }) {
  return (
    <div className="form-group" style={colSpan ? { gridColumn: `span ${colSpan}` } : {}}>
      <label className="form-label">
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ── Feedback inline ───────────────────────────────────────────────────────────
function Feedback({ ok, error }) {
  if (ok)    return <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: 12 }}>{ok}</div>;
  if (error) return <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", marginBottom: 12 }}>{error}</div>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RenacedConsultasClinical() {
  const { pacienteId } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("consulta"); // consulta | historial
  const [ab, setAb] = useState({});                  // secciones de la ficha abiertas
  const alternarAb = (k) => setAb((a) => ({ ...a, [k]: !a[k] }));
  const [cats, setCats] = useState({ retinopatia: [], nefropatia: [], neuropatia: [], pie_diabetico: [], cardiovascular: [] });

  // ── Estado por sección ────────────────────────────────────────────────────
  const [dx, setDx]       = useState(DX_INIT);
  const [dxOk, setDxOk]   = useState("");
  const [dxErr, setDxErr] = useState("");
  const [dxLoading, setDxLoading] = useState(false);

  // ── Comorbilidades ────────────────────────────────────────────────────────
  const COMORB_INIT = { retinopatia:"NO",retinopatia_fecha:"",retinopatia_tipo:"",retinopatia_laser:"",nefropatia:"NO",nefropatia_fecha:"",nefropatia_tipo:"",neuropatia:"NO",neuropatia_fecha:"",neuropatia_tipo:"",neuropatia_auto_tipo:"",vascular_perif:"NO",vascular_perif_fecha:"",vascular_perif_tipo:"",cardiovascular:"NO",cardiovascular_fecha:"",cardiovascular_tipo:"",pie_diabetico:"NO",pie_diabetico_fecha:"",pie_diabetico_tipo:"" };
  const [comorb, setComorb]       = useState(COMORB_INIT);
  const [comorbOk, setComorbOk]   = useState("");
  const [comorbErr, setComorbErr] = useState("");
  const [comorbLoad, setComorbLoad] = useState(false);

  // ── Antecedentes G.O. ─────────────────────────────────────────────────────
  const AGO_INIT = { menarca:"",fum:"",visa:"",mac:"",peso_4000:"",menopausia:"",menopausia_fecha:"",tipo_menopausia:"",trh:"" };
  const [ago, setAgo]             = useState(AGO_INIT);
  const [agoOk, setAgoOk]         = useState("");
  const [agoErr, setAgoErr]       = useState("");
  const [agoLoad, setAgoLoad]     = useState(false);

  // ── Patologías (lista editable: nombre, fecha de diagnóstico, activa, observaciones) ──
  const [patList, setPatList] = useState([]);
  const [patOk, setPatOk]     = useState("");
  const [patErr, setPatErr]   = useState("");
  const [patLoad, setPatLoad] = useState(false);

  // ── Embarazo ──────────────────────────────────────────────────────────────
  const [emb, setEmb]           = useState(EMB_INIT);
  const [embList, setEmbList]   = useState([]);
  const [embOk, setEmbOk]       = useState("");
  const [embErr, setEmbErr]     = useState("");
  const [embLoad, setEmbLoad]   = useState(false);

  // ── Reclasificación ───────────────────────────────────────────────────────
  const [recl, setRecl]         = useState({ tipo_diabetes_anterior_id: "", tipo_diabetes_nuevo_id: "", motivo: "", fecha: hoy() });
  const [reclList, setReclList] = useState([]);
  const [reclOk, setReclOk]     = useState("");
  const [reclErr, setReclErr]   = useState("");
  const [reclLoad, setReclLoad] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    getPaciente(pacienteId)
      .then((r) => setPaciente(r.data))
      .catch(() => setPaciente(null))
      .finally(() => setCargando(false));
    getCatalogosEvaluacion().then((r) => setCats(r.data)).catch(() => {});
  }, [pacienteId]);

  // Cargar datos de diagnóstico al entrar al tab
  useEffect(() => {
    getDiagnosticoClinico(pacienteId).then((r) => {
      if (!r.data) return;
      const d = r.data;
      setDx({
        fecha_diagnostico:       d.fecha_diagnostico?.slice(0,10) || "",
        fecha_approx:            d.fecha_approx || 0,
        fecha_approx_anio:       d.fecha_approx_anio || "",
        fecha_approx_mes:        d.fecha_approx_mes || "",
        peso:                    d.peso ?? "",
        estatura:                d.estatura ?? "",
        imc:                     d.imc ?? "",
        pa_sistolica:            d.pa_sistolica ?? "",
        pa_diastolica:           d.pa_diastolica ?? "",
        cetoacidosis:            d.cetoacidosis || "",
        cetoacidosis_ph:         d.cetoacidosis_ph ?? "",
        cetoacidosis_bicarbonato: d.cetoacidosis_bicarbonato ?? "",
        glucemia_azar:           d.glucemia_azar ?? "",
        hba1c:                   d.hba1c ?? "",
        hba1c_fecha:             d.hba1c_fecha?.slice(0,10) || "",
        peptido_c:               d.peptido_c ?? "",
        anti_gad:                d.anti_gad || "",
        anti_gad_valor:          d.anti_gad_valor ?? "",
        anti_insulina:           d.anti_insulina || "",
        anti_insulina_valor:     d.anti_insulina_valor ?? "",
        anti_islotes:            d.anti_islotes || "",
        anti_islotes_valor:      d.anti_islotes_valor ?? "",
        anti_ia2:                d.anti_ia2 || "",
        anti_ia2_valor:          d.anti_ia2_valor ?? "",
        anti_zct8:               d.anti_zct8 || "",
        anti_zct8_valor:         d.anti_zct8_valor ?? "",
        hospitalizacion:         d.hospitalizacion || "",
        hospitalizacion_dias:    d.hospitalizacion_dias ?? "",
        terapia_intensiva:       d.terapia_intensiva || "",
        terapia_intensiva_dias:  d.terapia_intensiva_dias ?? "",
        antec_dm1:               d.antec_dm1 || "",
        antec_dm1_grado:         d.antec_dm1_grado ?? "",
        antec_dm2:               d.antec_dm2 || "",
        antec_dm2_grado:         d.antec_dm2_grado ?? "",
        nacido_por:              d.nacido_por || "",
        lactancia_materna:       d.lactancia_materna || "",
        hipotiroidismo_dx:       d.hipotiroidismo_dx || "",
        terapia_id:              d.terapia_id ?? "",
        esquema_insulina_id:     d.esquema_insulina_id ?? "",
        calculo_dosis_id:        d.calculo_dosis_id ?? "",
        dosis_prescrita:         d.dosis_prescrita ?? "",
        dispositivo_id:          d.dispositivo_id ?? "",
        institucion_id:          d.institucion_id ?? "",
        tipo_mody:               d.tipo_mody || "",
        confirmacion_genetica:   d.confirmacion_genetica || "",
        mutacion:                d.mutacion || "",
        lada_fecha_insulina:     d.lada_fecha_insulina?.slice(0,10) || "",
        lada_fecha_approx:       d.lada_fecha_approx || 0,
      });
    }).catch(() => {});
  }, [pacienteId]);

  // ── Handlers cambio de campo ──────────────────────────────────────────────
  function cambiarDx(e) {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? (checked ? 1 : 0) : value;
    setDx((f) => {
      const next = { ...f, [name]: val };
      if (name === "peso" || name === "estatura") {
        const p = parseFloat(name === "peso" ? val : f.peso);
        const h = parseFloat(name === "estatura" ? val : f.estatura);
        if (p > 0 && h > 0) next.imc = (p / (h * h)).toFixed(2);
      }
      if (name === "tipo_diabetes_id" && value !== "4") next.tipo_diabetes_otra_id = "";
      return next;
    });
  }

  // ── Carga de las fichas al entrar (así cada acordeón ya muestra si tiene datos) ──
  function cargarPat() {
    getPatologia(pacienteId).then((r) => setPatList((r.data || []).map((x) => ({
      nombre: x.nombre || "", fecha_dx: x.fecha_dx ? String(x.fecha_dx).slice(0, 10) : "", activa: x.activa ?? 1, observaciones: x.observaciones || "",
    })))).catch(() => {});
  }
  const cargarEmb = () => getEmbarazos(pacienteId).then((r) => setEmbList(r.data || [])).catch(() => {});
  const cargarRecl = () => getReclasificaciones(pacienteId).then((r) => setReclList(r.data || [])).catch(() => {});

  useEffect(() => {
    getComorbilidad(pacienteId).then((r) => { if (r.data) setComorb({ ...COMORB_INIT, ...r.data }); }).catch(() => {});
    getAntecedentesGO(pacienteId).then((r) => { if (r.data) setAgo({ ...AGO_INIT, ...r.data }); }).catch(() => {});
    cargarPat(); cargarEmb(); cargarRecl();
  }, [pacienteId]);

  // ── Guardar diagnóstico ────────────────────────────────────────────────────
  async function guardarDx(e) {
    e.preventDefault();
    setDxLoading(true); setDxOk(""); setDxErr("");
    try {
      await saveDiagnosticoClinico(pacienteId, dx);
      setDxOk("Diagnóstico guardado");
      setTimeout(() => setDxOk(""), 3000);
    } catch (err) {
      setDxErr(err.response?.data?.error || "Error al guardar");
    } finally { setDxLoading(false); }
  }

  // ── Guardar comorbilidades ─────────────────────────────────────────────────
  async function guardarComorb(e) {
    e.preventDefault(); setComorbLoad(true); setComorbOk(""); setComorbErr("");
    try { await saveComorbilidad(pacienteId, comorb); setComorbOk("Comorbilidades guardadas"); setTimeout(()=>setComorbOk(""),3000); }
    catch (err) { setComorbErr(err.response?.data?.error||"Error al guardar"); }
    finally { setComorbLoad(false); }
  }

  // ── Guardar antecedentes G.O. ──────────────────────────────────────────────
  async function guardarAgo(e) {
    e.preventDefault(); setAgoLoad(true); setAgoOk(""); setAgoErr("");
    try { await saveAntecedentesGO(pacienteId, ago); setAgoOk("Antecedentes G.O. guardados"); setTimeout(()=>setAgoOk(""),3000); }
    catch (err) { setAgoErr(err.response?.data?.error||"Error al guardar"); }
    finally { setAgoLoad(false); }
  }

  // ── Patologías ────────────────────────────────────────────────────────────
  async function guardarPat(e) {
    e.preventDefault(); setPatLoad(true); setPatOk(""); setPatErr("");
    try {
      await savePatologia(pacienteId, { enfermedades: patList.filter((p) => p.nombre.trim()) });
      setPatOk("Patologías guardadas"); setTimeout(() => setPatOk(""), 3000); cargarPat();
    } catch (err) { setPatErr(err.response?.data?.error || "Error al guardar"); }
    finally { setPatLoad(false); }
  }
  const cambiarPat = (i, campo, valor) => setPatList((l) => l.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)));

  // ── Embarazo ──────────────────────────────────────────────────────────────
  function cambiarEmb(campo, valor) {
    setEmb((f) => {
      const n = { ...f, [campo]: valor };
      // Fecha probable de parto = FUM + 280 días (si no se capturó otra)
      if (campo === "fecha_ultima_mens" && valor) n.fecha_probable_parto = sumarDias(valor, 280);
      return n;
    });
  }
  async function guardarEmb(e) {
    e.preventDefault(); setEmbLoad(true); setEmbOk(""); setEmbErr("");
    try {
      await createEmbarazo(pacienteId, emb);
      setEmbOk("Embarazo registrado"); setEmb(EMB_INIT); setTimeout(() => setEmbOk(""), 3000); cargarEmb();
    } catch (err) { setEmbErr(err.response?.data?.error || "Error al guardar"); }
    finally { setEmbLoad(false); }
  }
  async function quitarEmb(id) {
    if (!window.confirm("¿Eliminar este embarazo?")) return;
    await deleteEmbarazo(pacienteId, id); cargarEmb();
  }

  // ── Reclasificación ───────────────────────────────────────────────────────
  async function guardarRecl(e) {
    e.preventDefault(); setReclLoad(true); setReclOk(""); setReclErr("");
    try {
      await createReclasificacion(pacienteId, { ...recl, tipo_diabetes_anterior_id: recl.tipo_diabetes_anterior_id || paciente?.diagnostico?.tipo_diabetes_id || "" });
      setReclOk("Reclasificación registrada"); setRecl({ tipo_diabetes_anterior_id: "", tipo_diabetes_nuevo_id: "", motivo: "", fecha: hoy() });
      setTimeout(() => setReclOk(""), 3000); cargarRecl();
    } catch (err) { setReclErr(err.response?.data?.error || "Error al guardar"); }
    finally { setReclLoad(false); }
  }
  async function quitarRecl(id) {
    if (!window.confirm("¿Eliminar esta reclasificación?")) return;
    await deleteReclasificacion(pacienteId, id); cargarRecl();
  }

  if (cargando) return <RenacedLayout><div className="loading">Cargando paciente…</div></RenacedLayout>;
  if (!paciente) return <RenacedLayout><div className="card" style={{ color: "#dc2626" }}>Paciente no encontrado</div></RenacedLayout>;

  const p = paciente;
  const nombreCompleto = `${p.nombre} ${p.ap_pat} ${p.ap_mat || ""}`.trim();
  const dmC = DM_COLOR[p.diagnostico?.tipo_diabetes] || { bg: "#f1f5f9", color: "#475569" };
  const tipoDM5 = String(p.diagnostico?.tipo_diabetes_id) === "4";
  const esMODY  = String(p.diagnostico?.tipo_diabetes_otra_id) === "1";
  const esLADA  = String(p.diagnostico?.tipo_diabetes_otra_id) === "2";

  return (
    <RenacedLayout>
      {/* ── Header paciente ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <Link to="/renaced/consultas" style={{ color: "#94a3b8", fontSize: 13 }}>← Consultas</Link>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <Link to={`/renaced/pacientes/${pacienteId}`} style={{ color: "#94a3b8", fontSize: 13 }}>Ver expediente</Link>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", wordBreak: "break-word" }}>{nombreCompleto}</h1>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {p.diagnostico?.tipo_diabetes && (
              <span style={{ background: dmC.bg, color: dmC.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                {p.diagnostico.tipo_diabetes}
              </span>
            )}
            <span style={{ background: p.sexo === "F" ? "#fce7f3" : "#dbeafe", color: p.sexo === "F" ? "#be185d" : "#1d4ed8", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              {({ F: "Mujer", M: "Hombre", I: "Intersexual", N: "No reportado" })[p.sexo] || "—"}
            </span>
            {p.edad != null && (
              <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>
                {p.edad} años
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Vista: consulta (hoja única) o historial ─────────────────────────── */}
      <div style={{ display: "flex", gap: 8, margin: "4px 0 18px", borderBottom: "2px solid #e2e8f0" }}>
        {[["consulta", "Consulta"], ["historial", "Historial"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setVista(id)} style={{
            padding: "8px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
            fontWeight: vista === id ? 700 : 500, color: vista === id ? "#6366f1" : "#64748b",
            borderBottom: vista === id ? "2px solid #6366f1" : "2px solid transparent", marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {vista === "historial" && <HistorialConsultas pacienteId={pacienteId} />}

      {vista === "consulta" && (
        <HojaConsulta paciente={paciente} pacienteId={pacienteId} cats={cats}>

          {/* ═══════ GRUPO 2 · Ficha del paciente ═══════ */}
          <div style={grupoTitulo}>Ficha del paciente <span style={grupoSub}>· se actualiza; cada apartado se guarda con su botón</span></div>

          <SeccionAcordeon icono={FiClipboard} color="#6366f1" titulo="Diagnóstico" descripcion="Tipo de diabetes, fecha de diagnóstico y estudios iniciales" abierta={!!ab.dx} onToggle={() => alternarAb("dx")} estado={!!dx.fecha_diagnostico}>
            <div className="seccion-plana">
              <form onSubmit={guardarDx}>
          {/* Fecha */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Fecha de Diagnóstico</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" name="fecha_approx" checked={!!dx.fecha_approx} onChange={cambiarDx} />
              <span style={{ fontWeight: 500 }}>Fecha aproximada</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {!dx.fecha_approx ? (
                <Campo label="Fecha exacta">
                  <input type="date" name="fecha_diagnostico" value={dx.fecha_diagnostico} onChange={cambiarDx} />
                </Campo>
              ) : (
                <>
                  <Campo label="Año">
                    <input type="number" name="fecha_approx_anio" value={dx.fecha_approx_anio} onChange={cambiarDx} min="1900" max={new Date().getFullYear()} placeholder="2010" />
                  </Campo>
                  <Campo label="Mes (opcional)">
                    <select name="fecha_approx_mes" value={dx.fecha_approx_mes} onChange={cambiarDx}>
                      <option value="">— Desconocido —</option>
                      {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m,i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                      ))}
                    </select>
                  </Campo>
                </>
              )}
            </div>
          </div>

          {/* Somatometría */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Somatometría al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
              <Campo label="Peso (kg)"><input type="number" step="0.01" name="peso" value={dx.peso} onChange={cambiarDx} /></Campo>
              <Campo label="Estatura (m)"><input type="number" step="0.01" name="estatura" value={dx.estatura} onChange={cambiarDx} /></Campo>
              <Campo label={<>IMC <span style={{ fontSize: 11, color: "#94a3b8" }}>(auto)</span></>}>
                <input type="number" step="0.01" name="imc" value={dx.imc} onChange={cambiarDx} style={{ background: dx.peso && dx.estatura ? "#f0fdf4" : undefined }} />
              </Campo>
              <Campo label="PA Sistólica (mmHg)"><input type="number" name="pa_sistolica" value={dx.pa_sistolica} onChange={cambiarDx} /></Campo>
              <Campo label="PA Diastólica (mmHg)"><input type="number" name="pa_diastolica" value={dx.pa_diastolica} onChange={cambiarDx} /></Campo>
            </div>
          </div>

          {/* Cetoacidosis */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Cetoacidosis al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              <Campo label="¿Cetoacidosis?" required>
                <select name="cetoacidosis" value={dx.cetoacidosis} onChange={cambiarDx}>
                  {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              {dx.cetoacidosis === "SI" && (
                <>
                  <Campo label="PH al diagnóstico"><input type="number" step="0.01" name="cetoacidosis_ph" value={dx.cetoacidosis_ph} onChange={cambiarDx} /></Campo>
                  <Campo label="Bicarbonato (mEq/L)"><input type="number" step="0.01" name="cetoacidosis_bicarbonato" value={dx.cetoacidosis_bicarbonato} onChange={cambiarDx} /></Campo>
                </>
              )}
            </div>
          </div>

          {/* Laboratorio */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Laboratorio al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              <Campo label="Glucemia al azar (mg/dl)"><input type="number" step="0.01" name="glucemia_azar" value={dx.glucemia_azar} onChange={cambiarDx} /></Campo>
              <Campo label="HbA1c (%)"><input type="number" step="0.01" name="hba1c" value={dx.hba1c} onChange={cambiarDx} /></Campo>
              <Campo label="Fecha HbA1c"><input type="date" name="hba1c_fecha" value={dx.hba1c_fecha} onChange={cambiarDx} /></Campo>
              <Campo label="Péptido C (ng/ml)"><input type="number" step="0.001" name="peptido_c" value={dx.peptido_c} onChange={cambiarDx} /></Campo>
            </div>
          </div>

          {/* Anticuerpos */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Anticuerpos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {[["Anti-GAD","anti_gad","anti_gad_valor"],["Anti-Insulina","anti_insulina","anti_insulina_valor"],["Anti-Islotes","anti_islotes","anti_islotes_valor"],["Anti-IA2","anti_ia2","anti_ia2_valor"],["Anti-ZCT8","anti_zct8","anti_zct8_valor"]].map(([label, campo, campoVal]) => (
                <div key={campo} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flex: "0 0 140px" }}>
                    <label className="form-label">{label}</label>
                    <select name={campo} value={dx[campo]} onChange={cambiarDx}>
                      {POSNEG.map((v) => <option key={v} value={v}>{v || "— S/D —"}</option>)}
                    </select>
                  </div>
                  {dx[campo] === "POS" && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Valor (nmol/L)</label>
                      <input type="number" step="0.01" name={campoVal} value={dx[campoVal]} onChange={cambiarDx} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hospitalización */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Hospitalización al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              <Campo label="¿Hospitalización?" required>
                <select name="hospitalizacion" value={dx.hospitalizacion} onChange={cambiarDx}>
                  {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              {dx.hospitalizacion === "SI" && <Campo label="Días hospitalizados"><input type="number" name="hospitalizacion_dias" value={dx.hospitalizacion_dias} onChange={cambiarDx} min="1" /></Campo>}
              <Campo label="¿Terapia intensiva?" required>
                <select name="terapia_intensiva" value={dx.terapia_intensiva} onChange={cambiarDx}>
                  {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              {dx.terapia_intensiva === "SI" && <Campo label="Días en UCI"><input type="number" name="terapia_intensiva_dias" value={dx.terapia_intensiva_dias} onChange={cambiarDx} min="1" /></Campo>}
            </div>
          </div>

          {/* Antecedentes familiares */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Antecedentes Familiares</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
              {[["Antecedentes DM Tipo 1","antec_dm1","antec_dm1_grado"],["Antecedentes DM Tipo 2","antec_dm2","antec_dm2_grado"]].map(([label, campo, campoGrado]) => (
                <div key={campo} style={{ display: "contents" }}>
                  <Campo label={label} required>
                    <select name={campo} value={dx[campo]} onChange={cambiarDx}>
                      {SINON.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                    </select>
                  </Campo>
                  {dx[campo] === "SI" && (
                    <Campo label="Grado">
                      <select name={campoGrado} value={dx[campoGrado]} onChange={cambiarDx}>
                        {GRADOS.map(({ id, label: l }) => <option key={id} value={id}>{l}</option>)}
                      </select>
                    </Campo>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Antecedentes personales */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Antecedentes Personales</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Nacido por" required>
                <select name="nacido_por" value={dx.nacido_por} onChange={cambiarDx}>
                  <option value="">— Seleccionar —</option>
                  {[["PARTO","Parto"],["CESAREA","Cesárea"],["OTRO","Otro"],["SE_DESCONOCE","Se desconoce"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Lactancia materna" required>
                <select name="lactancia_materna" value={dx.lactancia_materna} onChange={cambiarDx}>
                  {SINON.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              <Campo label="Hipotiroidismo previo" required>
                <select name="hipotiroidismo_dx" value={dx.hipotiroidismo_dx} onChange={cambiarDx}>
                  {SINON.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          {/* Tratamiento al diagnóstico */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Tratamiento Prescrito al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Terapia prescrita" required>
                <select name="terapia_id" value={dx.terapia_id} onChange={cambiarDx}>
                  <option value="">— Seleccionar —</option>
                  {[["1","Dieta y ejercicio"],["2","Oral"],["3","Insulina"],["4","Insulina + Oral"],["5","Otra"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              {(dx.terapia_id === "3" || dx.terapia_id === "4") && (
                <>
                  <Campo label="Esquema de insulina">
                    <select name="esquema_insulina_id" value={dx.esquema_insulina_id} onChange={cambiarDx}>
                      <option value="">— Seleccionar —</option>
                      {[["1","Tradicional (NPH+Rápida)"],["2","Premezcla"],["3","Basal"],["4","Basal-Bolo (MID)"],["5","Microinfusora (ICSI)"],["6","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Cálculo de dosis">
                    <select name="calculo_dosis_id" value={dx.calculo_dosis_id} onChange={cambiarDx}>
                      <option value="">— Seleccionar —</option>
                      {[["1","Conteo CHOs+factor"],["2","Por equivalentes"],["3","Dosis fijas"],["4","Glucosa preprandial"],["5","Por intuición"],["6","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Dosis prescrita (U/día)"><input type="number" step="0.01" name="dosis_prescrita" value={dx.dosis_prescrita} onChange={cambiarDx} /></Campo>
                  <Campo label="Dispositivo">
                    <select name="dispositivo_id" value={dx.dispositivo_id} onChange={cambiarDx}>
                      <option value="">— Seleccionar —</option>
                      {[["1","Jeringa"],["2","Pluma"],["3","Microinfusora"],["4","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                </>
              )}
              <Campo label="Institución de atención" required>
                <select name="institucion_id" value={dx.institucion_id} onChange={cambiarDx}>
                  <option value="">— Seleccionar —</option>
                  {[["1","IMSS"],["2","ISSSTE"],["3","SSA/INSABI"],["4","PEMEX"],["5","SEDENA"],["6","SEMAR"],["7","Privado"],["8","Sin seguro"],["9","Otro"],["10","IMSS Bienestar"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          {/* MODY */}
          {esMODY && (
            <div className="card" style={{ marginBottom: 16, border: "1.5px solid #e9d5ff" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#7c3aed" }}>Datos MODY</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <Campo label="Tipo MODY">
                  <select name="tipo_mody" value={dx.tipo_mody} onChange={cambiarDx}>
                    <option value="">— Seleccionar —</option>
                    {["MODY 1","MODY 2","MODY 3","MODY 4","MODY 5","MODY 6","MODY 7","Otro"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Campo>
                <Campo label="Confirmación genética">
                  <select name="confirmacion_genetica" value={dx.confirmacion_genetica} onChange={cambiarDx}>
                    {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                  </select>
                </Campo>
                {dx.confirmacion_genetica === "SI" && <Campo label="Mutación"><input type="text" name="mutacion" value={dx.mutacion} onChange={cambiarDx} /></Campo>}
              </div>
            </div>
          )}

          {/* LADA */}
          {esLADA && (
            <div className="card" style={{ marginBottom: 16, border: "1.5px solid #bfdbfe" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#1d4ed8" }}>Datos LADA</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <Campo label="Fecha inicio insulina">
                  <input type="date" name="lada_fecha_insulina" value={dx.lada_fecha_insulina} onChange={cambiarDx} />
                </Campo>
              </div>
            </div>
          )}

          <Feedback ok={dxOk} error={dxErr} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={dxLoading}>
              {dxLoading ? "Guardando…" : "Guardar Diagnóstico"}
            </button>
          </div>
        </form>
            </div>
          </SeccionAcordeon>

          <SeccionAcordeon icono={FiActivity} color="#f59e0b" titulo="Comorbilidades" descripcion="Retinopatía, nefropatía, neuropatía y otras complicaciones crónicas" abierta={!!ab.comorb} onToggle={() => alternarAb("comorb")} estado={Object.entries(comorb).some(([k, v]) => v === "SI" && !k.includes("_"))}>
            <div className="seccion-plana">
              <form onSubmit={guardarComorb}>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Comorbilidades Crónicas</h3>
            <p style={{ fontSize:12, color:"#94a3b8", margin:"0 0 16px" }}>Marca SI si el paciente tiene la complicación, luego ingresa fecha y tipo.</p>
            {[
              ["Retinopatía","retinopatia","retinopatia_fecha","retinopatia_tipo",true,"retinopatia_laser","Láser"],
              ["Nefropatía","nefropatia","nefropatia_fecha","nefropatia_tipo",false,null,null],
              ["Neuropatía","neuropatia","neuropatia_fecha","neuropatia_tipo",false,null,null],
              ["Vasculopatía Periférica","vascular_perif","vascular_perif_fecha","vascular_perif_tipo",false,null,null],
              ["Enf. Cardiovascular","cardiovascular","cardiovascular_fecha","cardiovascular_tipo",false,null,null],
              ["Pie Diabético","pie_diabetico","pie_diabetico_fecha","pie_diabetico_tipo",false,null,null],
            ].map(([label, campo, campoFecha, campoTipo, hasLaser, laserCampo, laserLabel]) => (
              <div key={campo} style={{ display:"grid", gridTemplateColumns:"180px 90px 160px 1fr", gap:10, alignItems:"center", marginBottom:10, padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                <span style={{ fontWeight:600, fontSize:13 }}>{label}</span>
                <select value={comorb[campo]} onChange={e=>setComorb(f=>({...f,[campo]:e.target.value}))} style={{ minWidth:70 }}>
                  <option value="NO">NO</option><option value="SI">SI</option>
                </select>
                {comorb[campo]==="SI" && <>
                  <input type="date" value={comorb[campoFecha]||""} onChange={e=>setComorb(f=>({...f,[campoFecha]:e.target.value}))} />
                  <select value={comorb[campoTipo]||""} onChange={e=>setComorb(f=>({...f,[campoTipo]:e.target.value}))}>
                    <option value="">— Tipo —</option>
                    {(COMORB_TIPOS[campo]||[]).map((t,i)=><option key={i+1} value={i+1}>{t}</option>)}
                  </select>
                  {hasLaser && (
                    <label style={{ display:"flex", alignItems:"center", gap:6, gridColumn:"span 2" }}>
                      <span style={{ fontSize:12, color:"#64748b" }}>{laserLabel}:</span>
                      <select value={comorb[laserCampo]||""} onChange={e=>setComorb(f=>({...f,[laserCampo]:e.target.value}))} style={{ minWidth:70 }}>
                        <option value="">—</option><option value="SI">SI</option><option value="NO">NO</option>
                      </select>
                    </label>
                  )}
                </>}
              </div>
            ))}
          </div>
          <Feedback ok={comorbOk} error={comorbErr} />
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={comorbLoad}>
              {comorbLoad ? "Guardando…" : "Guardar Comorbilidades"}
            </button>
          </div>
        </form>
            </div>
          </SeccionAcordeon>

          <SeccionAcordeon icono={FiLayers} color="#0ea5e9" titulo="Patologías asociadas" descripcion="Hipotiroidismo, hipertensión, celiaquía y otras" abierta={!!ab.pat} onToggle={() => alternarAb("pat")} estado={patList.length > 0} etiqueta={patList.length ? `${patList.length} registrada${patList.length > 1 ? "s" : ""}` : "Sin datos"}>
            <form onSubmit={guardarPat}>
              <datalist id="pat-sugeridas">{PAT_SUGERIDAS.map((n) => <option key={n} value={n} />)}</datalist>
              {patList.map((pt, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 90px 2fr auto", gap: 10, alignItems: "end", marginBottom: 10 }}>
                  <Campo label={i === 0 ? "Patología" : ""}><input list="pat-sugeridas" value={pt.nombre} onChange={(e) => cambiarPat(i, "nombre", e.target.value.toUpperCase())} placeholder="Escribe o elige" /></Campo>
                  <Campo label={i === 0 ? "Fecha de diagnóstico" : ""}><input type="date" value={pt.fecha_dx} onChange={(e) => cambiarPat(i, "fecha_dx", e.target.value)} /></Campo>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, paddingBottom: 9 }}><input type="checkbox" checked={!!pt.activa} onChange={(e) => cambiarPat(i, "activa", e.target.checked ? 1 : 0)} /> Activa</label>
                  <Campo label={i === 0 ? "Observaciones" : ""}><input value={pt.observaciones} onChange={(e) => cambiarPat(i, "observaciones", e.target.value)} /></Campo>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPatList((l) => l.filter((_, k) => k !== i))} title="Quitar"><FiX /></button>
                </div>
              ))}
              {patList.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>Sin patologías registradas.</p>}
              <Feedback ok={patOk} error={patErr} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPatList((l) => [...l, { nombre: "", fecha_dx: "", activa: 1, observaciones: "" }])}><FiPlus /> Agregar patología</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={patLoad}>{patLoad ? "Guardando…" : "Guardar patologías"}</button>
              </div>
            </form>
          </SeccionAcordeon>

          {p.sexo === "F" && (
            <SeccionAcordeon icono={FiUsers} color="#ec4899" titulo="Antecedentes ginecobstétricos" descripcion="Menarca, ciclo, menopausia y anticoncepción" abierta={!!ab.ago} onToggle={() => alternarAb("ago")} estado={Object.values(ago).some((v) => v !== "" && v !== null && v !== undefined)}>
              <div className="seccion-plana">
                <form onSubmit={guardarAgo}>
          {paciente.sexo !== "F" && (
            <div className="card" style={{ background:"#fef9c3", border:"1px solid #fde68a", color:"#92400e", marginBottom:16 }}>
              Este módulo aplica solo para pacientes femeninas.
            </div>
          )}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Datos Ginecológicos</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              <Campo label="Menarca (años)"><input type="number" value={ago.menarca||""} onChange={e=>setAgo(f=>({...f,menarca:e.target.value}))} min="8" max="20" /></Campo>
              <Campo label="FUM"><input type="date" value={ago.fum||""} onChange={e=>setAgo(f=>({...f,fum:e.target.value}))} /></Campo>
              <Campo label="VISA (vive en área de influencia)">
                <select value={ago.visa||""} onChange={e=>setAgo(f=>({...f,visa:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                </select>
              </Campo>
              <Campo label="MAC (método anticonceptivo)">
                <select value={ago.mac||""} onChange={e=>setAgo(f=>({...f,mac:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                </select>
              </Campo>
              <Campo label="Hijos con peso > 4 kg">
                <select value={ago.peso_4000||""} onChange={e=>setAgo(f=>({...f,peso_4000:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option>
                </select>
              </Campo>
            </div>
          </div>
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Menopausia</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              <Campo label="Menopausia">
                <select value={ago.menopausia||""} onChange={e=>setAgo(f=>({...f,menopausia:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option>
                </select>
              </Campo>
              {ago.menopausia==="SI" && <>
                <Campo label="Fecha menopausia"><input type="date" value={ago.menopausia_fecha||""} onChange={e=>setAgo(f=>({...f,menopausia_fecha:e.target.value}))} /></Campo>
                <Campo label="Tipo menopausia">
                  <select value={ago.tipo_menopausia||""} onChange={e=>setAgo(f=>({...f,tipo_menopausia:e.target.value}))}>
                    <option value="">—</option><option value="NATURAL">Natural</option><option value="QUIRURGICA">Quirúrgica</option><option value="PREMATURA">Prematura</option>
                  </select>
                </Campo>
                <Campo label="TRH (terapia reemplazo hormonal)">
                  <select value={ago.trh||""} onChange={e=>setAgo(f=>({...f,trh:e.target.value}))}>
                    <option value="">—</option><option>SI</option><option>NO</option>
                  </select>
                </Campo>
              </>}
            </div>
          </div>
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Embarazos Previos</h3>
            <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 160px 100px", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:12, color:"#94a3b8" }}>#</span>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Desenlace</span>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Fecha</span>
              <span style={{ fontSize:12, color:"#94a3b8" }}>DM</span>
            </div>
            {[1,2,3,4,5,6,7,8,9,10].map(i=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"40px 1fr 160px 100px", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#64748b", paddingTop:4 }}>{i}</span>
                <select value={ago[`emb_previo${i}_des`]||""} onChange={e=>setAgo(f=>({...f,[`emb_previo${i}_des`]:e.target.value}))}>
                  <option value="">—</option>
                  <option value="P">Parto</option><option value="C">Cesárea</option>
                  <option value="A">Aborto</option><option value="O">Otro</option>
                </select>
                <input type="date" value={ago[`emb_previo${i}_fecha`]||""} onChange={e=>setAgo(f=>({...f,[`emb_previo${i}_fecha`]:e.target.value}))} />
                <select value={ago[`emb_previo${i}_diabetes`]||""} onChange={e=>setAgo(f=>({...f,[`emb_previo${i}_diabetes`]:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option>
                </select>
              </div>
            ))}
          </div>
          <Feedback ok={agoOk} error={agoErr} />
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={agoLoad}>
              {agoLoad ? "Guardando…" : "Guardar Ant. G.O."}
            </button>
          </div>
        </form>
              </div>
            </SeccionAcordeon>
          )}

          {/* ═══════ GRUPO 3 · Casos especiales ═══════ */}
          <div style={grupoTitulo}>Casos especiales <span style={grupoSub}>· solo cuando aplican</span></div>

          {p.sexo === "F" && (
            <SeccionAcordeon icono={FiHeart} color="#d946ef" titulo="Embarazo" descripcion="Embarazos registrados y nuevo registro" abierta={!!ab.emb} onToggle={() => alternarAb("emb")} estado={embList.length > 0} etiqueta={embList.length ? `${embList.length} registrado${embList.length > 1 ? "s" : ""}` : "Sin datos"}>
              {embList.length > 0 && (
                <div className="table-wrapper" style={{ marginBottom: 16 }}>
                  <table className="tabla">
                    <thead><tr><th>FUM</th><th>Fecha prob. parto</th><th>Semanas</th><th>Resultado</th><th>Fecha de parto</th><th>Tratamiento</th><th></th></tr></thead>
                    <tbody>
                      {embList.map((m) => (
                        <tr key={m.id}>
                          <td>{m.fecha_ultima_mens ? String(m.fecha_ultima_mens).slice(0, 10) : "—"}</td>
                          <td>{m.fecha_probable_parto ? String(m.fecha_probable_parto).slice(0, 10) : "—"}</td>
                          <td>{m.semanas_gestacion ?? "—"}</td>
                          <td>{m.resultado || "—"}</td>
                          <td>{m.fecha_parto ? String(m.fecha_parto).slice(0, 10) : "—"}</td>
                          <td>{m.terapia_gest || "—"}</td>
                          <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => quitarEmb(m.id)} title="Eliminar"><FiX /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form onSubmit={guardarEmb}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
                  <Campo label="N.º de gesta"><input type="number" min="1" value={emb.num_gesta} onChange={(e) => cambiarEmb("num_gesta", e.target.value)} /></Campo>
                  <Campo label="Fecha de última menstruación (FUM)"><input type="date" value={emb.fecha_ultima_mens} onChange={(e) => cambiarEmb("fecha_ultima_mens", e.target.value)} /></Campo>
                  <Campo label={<>Fecha probable de parto <span style={{ fontSize: 11, color: "#94a3b8" }}>(FUM + 280 días)</span></>}><input type="date" value={emb.fecha_probable_parto} onChange={(e) => cambiarEmb("fecha_probable_parto", e.target.value)} /></Campo>
                  <Campo label="Semanas de gestación"><input type="number" min="0" max="45" value={emb.semanas_gestacion} onChange={(e) => cambiarEmb("semanas_gestacion", e.target.value)} /></Campo>
                  <Campo label="Tratamiento en el embarazo"><select value={emb.terapia_gest_id} onChange={(e) => cambiarEmb("terapia_gest_id", e.target.value)}><option value="">— Seleccionar —</option>{TERAPIAS_GEST.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Campo>
                  <Campo label="Resultado"><select value={emb.resultado} onChange={(e) => cambiarEmb("resultado", e.target.value)}>{RESULTADOS_EMB.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Campo>
                  {emb.resultado !== "EMBARAZADA" && <Campo label="Fecha de parto / aborto"><input type="date" value={emb.fecha_parto} onChange={(e) => cambiarEmb("fecha_parto", e.target.value)} /></Campo>}
                  <Campo label="Observaciones" colSpan={2}><input value={emb.observaciones} onChange={(e) => cambiarEmb("observaciones", e.target.value)} /></Campo>
                </div>
                <Feedback ok={embOk} error={embErr} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}><button type="submit" className="btn btn-primary btn-sm" disabled={embLoad}>{embLoad ? "Guardando…" : "Registrar embarazo"}</button></div>
              </form>
            </SeccionAcordeon>
          )}

          <SeccionAcordeon icono={FiRepeat} color="#14b8a6" titulo="Reclasificación" descripcion="Cambio del tipo de diabetes" abierta={!!ab.recl} onToggle={() => alternarAb("recl")} estado={reclList.length > 0} etiqueta={reclList.length ? `${reclList.length} registrada${reclList.length > 1 ? "s" : ""}` : "Sin datos"}>
            {reclList.length > 0 && (
              <div className="table-wrapper" style={{ marginBottom: 16 }}>
                <table className="tabla">
                  <thead><tr><th>Fecha</th><th>Tipo anterior</th><th>Tipo nuevo</th><th>Motivo</th><th></th></tr></thead>
                  <tbody>
                    {reclList.map((r) => (
                      <tr key={r.id}>
                        <td>{r.fecha ? String(r.fecha).slice(0, 10) : "—"}</td>
                        <td>{r.tipo_anterior || "—"}</td>
                        <td>{r.tipo_nuevo || "—"}</td>
                        <td>{r.motivo || "—"}</td>
                        <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => quitarRecl(r.id)} title="Eliminar"><FiX /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form onSubmit={guardarRecl}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
                <Campo label="Fecha"><input type="date" value={recl.fecha} onChange={(e) => setRecl((f) => ({ ...f, fecha: e.target.value }))} /></Campo>
                <Campo label="Tipo anterior"><select value={recl.tipo_diabetes_anterior_id || String(paciente?.diagnostico?.tipo_diabetes_id || "")} onChange={(e) => setRecl((f) => ({ ...f, tipo_diabetes_anterior_id: e.target.value }))}><option value="">— Seleccionar —</option>{TIPOS_DM.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Campo>
                <Campo label="Tipo nuevo" required><select value={recl.tipo_diabetes_nuevo_id} onChange={(e) => setRecl((f) => ({ ...f, tipo_diabetes_nuevo_id: e.target.value }))} required><option value="">— Seleccionar —</option>{TIPOS_DM.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Campo>
                <Campo label="Motivo" colSpan={2}><input value={recl.motivo} onChange={(e) => setRecl((f) => ({ ...f, motivo: e.target.value }))} placeholder="ej. anticuerpos positivos, evolución clínica" /></Campo>
              </div>
              <Feedback ok={reclOk} error={reclErr} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}><button type="submit" className="btn btn-primary btn-sm" disabled={reclLoad}>{reclLoad ? "Guardando…" : "Registrar reclasificación"}</button></div>
            </form>
          </SeccionAcordeon>
        </HojaConsulta>
      )}
    </RenacedLayout>
  );
}
