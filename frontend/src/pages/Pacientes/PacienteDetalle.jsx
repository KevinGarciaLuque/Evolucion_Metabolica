import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { FiTrash2, FiEdit2, FiEye, FiArrowLeft, FiUpload, FiEdit3, FiPlus, FiActivity, FiDroplet, FiBookOpen, FiUser, FiBarChart2, FiSun, FiZap } from "react-icons/fi";
import { MdOutlineBiotech } from "react-icons/md";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import SemaforoISPAD from "../../components/SemaforoISPAD";
import { useAuth } from "../../context/AuthContext";

// ─── Colores por clasificación ──────────────────────────────────────────────
const COLORS_CLASIF = { OPTIMO: "#16a34a", MODERADO: "#d97706", ALTO_RIESGO: "#dc2626" };

// ─── Paleta ISPAD ────────────────────────────────────────────────────────────
const C_MUY_ALTO  = "#FEBF01"; // TAR Muy Alto  >250 mg/dL
const C_ALTO      = "#FDD94F"; // TAR Alto      181-250 mg/dL
const C_OBJETIVO  = "#76B250"; // TIR Objetivo  70-180 mg/dL
const C_BAJO      = "#FB0D0A"; // TBR Bajo      54-69 mg/dL
const C_MUY_BAJO  = "#86270C"; // TBR Muy Bajo  <54 mg/dL

// ─── Tooltip personalizado para barra apilada ───────────────────────────────
function TooltipTIR({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>Registro {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value?.toFixed(1)}%</strong>
        </div>
      ))}
    </div>
  );
}

export default function PacienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: yo } = useAuth();
  const [paciente, setPaciente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet]   = useState(window.innerWidth < 1024);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [modalVer, setModalVer] = useState(null);
  const [modalInfo, setModalInfo] = useState(null); // clave de INFO_GRAFICAS

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [tabActiva, setTabActiva] = useState("info");
  const [hoveredTab, setHoveredTab] = useState(null);

  // ── Insulina ──────────────────────────────────────────────────────────────
  const [insulina, setInsulina] = useState([]);
  const [relacionIC, setRelacionIC] = useState([]);
  const [modalInsulina, setModalInsulina] = useState(false);
  const [editInsulina, setEditInsulina] = useState(null);
  const [formInsulina, setFormInsulina] = useState({});
  const [guardandoInsulina, setGuardandoInsulina] = useState(false);
  const [eliminarInsulina, setEliminarInsulina] = useState(null);
  const [eliminandoInsulina, setEliminandoInsulina] = useState(false);

  // ── Alimentación ──────────────────────────────────────────────────────────
  const [alimentacion, setAlimentacion] = useState([]);
  const [modalAlimentacion, setModalAlimentacion] = useState(false);
  const [editAlimentacion, setEditAlimentacion] = useState(null);
  const [formAlimentacion, setFormAlimentacion] = useState({});
  const [guardandoAlimentacion, setGuardandoAlimentacion] = useState(false);
  const [eliminarAlimentacion, setEliminarAlimentacion] = useState(null);
  const [eliminandoAlimentacion, setEliminandoAlimentacion] = useState(false);

  // ── Anticuerpos ───────────────────────────────────────────────────────────
  const [anticuerpos, setAnticuerpos] = useState([]);
  const [modalAnticuerpos, setModalAnticuerpos] = useState(false);
  const [editAnticuerpos, setEditAnticuerpos] = useState(null);
  const [formAnticuerpos, setFormAnticuerpos] = useState({});
  const [guardandoAnticuerpos, setGuardandoAnticuerpos] = useState(false);
  const [eliminarAnticuerpos, setEliminarAnticuerpos] = useState(null);
  const [eliminandoAnticuerpos, setEliminandoAnticuerpos] = useState(false);

  async function eliminarAnalisis() {
    setEliminando(true);
    try {
      await api.delete(`/analisis/${modalEliminar.id}`);
      setHistorial(h => h.filter(a => a.id !== modalEliminar.id));
      setModalEliminar(null);
    } catch {
      alert("Error al eliminar el análisis. Intenta de nuevo.");
    } finally {
      setEliminando(false);
    }
  }

  function abrirEditar(analisis) {
    setEditForm({ ...analisis });
    setModalEditar(analisis);
  }

  function cambiarEditForm(e) {
    const { name, type, checked, value } = e.target;
    setEditForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function guardarEdicion() {
    setGuardandoEdicion(true);
    try {
      const { data } = await api.put(`/analisis/${modalEditar.id}`, editForm);
      setHistorial(h => h.map(a =>
        a.id === modalEditar.id ? { ...a, ...editForm, clasificacion: data.clasificacion } : a
      ));
      setModalEditar(null);
      setEditForm(null);
    } catch {
      alert("Error al guardar los cambios. Intenta de nuevo.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  // ── Insulina helpers ──────────────────────────────────────────────────────
  function abrirNuevaInsulina() {
    // Pre-poblar con la insulina actual del paciente
    setFormInsulina({
      fecha: new Date().toISOString().split("T")[0],
      insulina_prolongada: paciente.tipo_insulina  || "",
      insulina_corta:      paciente.tipo_insulina_2 || "",
      dosis_prolongada: "", dosis_corta: "",
      dosis_prolongada_u: "", dosis_corta_u: "",
      via_administracion: "Subcutánea",
      motivo_cambio: "", observaciones: "",
    });
    setEditInsulina(null);
    setModalInsulina(true);
  }
  function abrirEditarInsulina(reg) {
    setFormInsulina({ ...reg, fecha: reg.fecha?.split("T")[0] || reg.fecha });
    setEditInsulina(reg);
    setModalInsulina(true);
  }
  async function guardarInsulina() {
    setGuardandoInsulina(true);
    try {
      if (editInsulina) {
        await api.put(`/pacientes/${id}/insulina/${editInsulina.id}`, formInsulina);
        setInsulina(list => list.map(r => r.id === editInsulina.id ? { ...r, ...formInsulina } : r));
      } else {
        const { data } = await api.post(`/pacientes/${id}/insulina`, formInsulina);
        setInsulina(list => [{ ...formInsulina, id: data.id }, ...list]);
      }
      setModalInsulina(false);
    } catch {
      alert("Error al guardar el registro de insulina.");
    } finally {
      setGuardandoInsulina(false);
    }
  }
  async function confirmarEliminarInsulina() {
    setEliminandoInsulina(true);
    try {
      await api.delete(`/pacientes/${id}/insulina/${eliminarInsulina.id}`);
      setInsulina(list => list.filter(r => r.id !== eliminarInsulina.id));
      setEliminarInsulina(null);
    } catch {
      alert("Error al eliminar el registro.");
    } finally {
      setEliminandoInsulina(false);
    }
  }

  // ── Alimentación helpers ──────────────────────────────────────────────────
  function abrirNuevaAlimentacion() {
    setFormAlimentacion({
      fecha: new Date().toISOString().split("T")[0],
      tipo_dieta: "", calorias_dia: "", carbohidratos_g: "",
      proteinas_g: "", grasas_g: "", fibra_g: "",
      distribucion: "", restricciones: "", observaciones: "", elaborado_por: "",
    });
    setEditAlimentacion(null);
    setModalAlimentacion(true);
  }
  function abrirEditarAlimentacion(reg) {
    setFormAlimentacion({ ...reg, fecha: reg.fecha?.split("T")[0] || reg.fecha });
    setEditAlimentacion(reg);
    setModalAlimentacion(true);
  }
  async function guardarAlimentacion() {
    setGuardandoAlimentacion(true);
    try {
      if (editAlimentacion) {
        await api.put(`/pacientes/${id}/alimentacion/${editAlimentacion.id}`, formAlimentacion);
        setAlimentacion(list => list.map(r => r.id === editAlimentacion.id ? { ...r, ...formAlimentacion } : r));
      } else {
        const { data } = await api.post(`/pacientes/${id}/alimentacion`, formAlimentacion);
        setAlimentacion(list => [{ ...formAlimentacion, id: data.id }, ...list]);
      }
      setModalAlimentacion(false);
    } catch {
      alert("Error al guardar el plan de alimentación.");
    } finally {
      setGuardandoAlimentacion(false);
    }
  }
  async function confirmarEliminarAlimentacion() {
    setEliminandoAlimentacion(true);
    try {
      await api.delete(`/pacientes/${id}/alimentacion/${eliminarAlimentacion.id}`);
      setAlimentacion(list => list.filter(r => r.id !== eliminarAlimentacion.id));
      setEliminarAlimentacion(null);
    } catch {
      alert("Error al eliminar el plan.");
    } finally {
      setEliminandoAlimentacion(false);
    }
  }

  // ── Anticuerpos helpers ───────────────────────────────────────────────────
  function abrirNuevoAnticuerpos() {
    setFormAnticuerpos({
      fecha: new Date().toISOString().split("T")[0],
      iaa: "", anti_gad65: "", anti_ia2: "", znt8: "", ica: "",
      observaciones: "", elaborado_por: "",
    });
    setEditAnticuerpos(null);
    setModalAnticuerpos(true);
  }
  function abrirEditarAnticuerpos(reg) {
    setFormAnticuerpos({ ...reg, fecha: reg.fecha?.split("T")[0] || reg.fecha });
    setEditAnticuerpos(reg);
    setModalAnticuerpos(true);
  }
  async function guardarAnticuerpos() {
    setGuardandoAnticuerpos(true);
    try {
      if (editAnticuerpos) {
        await api.put(`/pacientes/${id}/anticuerpos/${editAnticuerpos.id}`, formAnticuerpos);
        setAnticuerpos(list => list.map(r => r.id === editAnticuerpos.id ? { ...r, ...formAnticuerpos } : r));
      } else {
        const { data } = await api.post(`/pacientes/${id}/anticuerpos`, formAnticuerpos);
        setAnticuerpos(list => [{ ...formAnticuerpos, id: data.id }, ...list]);
      }
      setModalAnticuerpos(false);
    } catch {
      alert("Error al guardar el registro de anticuerpos.");
    } finally {
      setGuardandoAnticuerpos(false);
    }
  }
  async function confirmarEliminarAnticuerpos() {
    setEliminandoAnticuerpos(true);
    try {
      await api.delete(`/pacientes/${id}/anticuerpos/${eliminarAnticuerpos.id}`);
      setAnticuerpos(list => list.filter(r => r.id !== eliminarAnticuerpos.id));
      setEliminarAnticuerpos(null);
    } catch {
      alert("Error al eliminar el registro.");
    } finally {
      setEliminandoAnticuerpos(false);
    }
  }

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1024);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      api.get(`/pacientes/${id}`),
      api.get(`/pacientes/${id}/historial`),
      api.get(`/pacientes/${id}/insulina`),
      api.get(`/pacientes/${id}/alimentacion`),
      api.get(`/pacientes/${id}/anticuerpos`),
      api.get(`/pacientes/${id}/relacion-ic`),
    ]).then(([p, h, ins, ali, ant, ric]) => {
      setPaciente(p.data);
      setHistorial(h.data);
      setInsulina(ins.data);
      setAlimentacion(ali.data);
      setAnticuerpos(ant.data);
      setRelacionIC(ric.data);
    }).finally(() => setCargando(false));
  }, [id, location.key]);

  if (cargando) return <Layout><div className="loading">Cargando paciente...</div></Layout>;
  if (!paciente) return <Layout><div className="login-error">Paciente no encontrado</div></Layout>;

  const ultimoAnalisis = historial[0];

  // ── Información explicativa de cada gráfica ─────────────────────────────
  const INFO_GRAFICAS = {
    tirTarTbr: {
      titulo: "📊 Comparación TIR / TAR / TBR",
      items: [
        { label: "TIR — Tiempo en Rango", desc: "Porcentaje de tiempo que la glucosa estuvo entre 70–180 mg/dL. Es el indicador principal del control glucémico. Objetivo ISPAD: ≥ 70%." },
        { label: "TAR — Tiempo sobre Rango", desc: "Tiempo con glucosa > 180 mg/dL. Se divide en TAR Alto (181–250) y TAR Muy Alto (> 250 mg/dL). Objetivo: < 25% total." },
        { label: "TBR — Tiempo bajo Rango", desc: "Tiempo con glucosa < 70 mg/dL. Se divide en TBR Bajo (54–69) y TBR Muy Bajo (< 54 mg/dL). Objetivo: < 4% total." },
        { label: "Clasificación ISPAD", desc: "Óptimo: TIR ≥ 70% y TBR < 4%. Moderado: TIR 50–69%. Alto Riesgo: TIR < 50%. Basada en consenso ISPAD 2022." },
      ],
    },
    gmiCv: {
      titulo: "GMI y Coeficiente de Variación (CV)",
      items: [
        { label: "GMI — Glucose Management Indicator", desc: "Estima la HbA1c a partir del promedio de glucosa del sensor. Fórmula: GMI (%) = 3.31 + 0.02392 × glucosa promedio (mg/dL). Objetivo: < 7% (refleja HbA1c < 7%)." },
        { label: "CV — Coeficiente de Variación", desc: "Mide la variabilidad glucémica: cuánto oscila la glucosa respecto a su promedio. Se calcula como (desviación estándar / glucosa promedio) × 100. Objetivo: ≤ 36%. CV > 36% indica alta variabilidad y riesgo de hipoglucemias inadvertidas." },
      ],
    },
    gri: {
      titulo: "GRI — Glycemia Risk Index",
      items: [
        { label: "¿Qué es el GRI?", desc: "Índice compuesto que combina el riesgo de hipoglucemia (TBR) y de hiperglucemia (TAR) en un solo número. Rango 0–100. Fórmula: GRI = (3 × TBR Muy Bajo) + (2.4 × TBR Bajo) + (1.6 × TAR Muy Alto) + (0.8 × TAR Alto)." },
        { label: "Zonas de riesgo", desc: "Zona A (0–20): riesgo mínimo — ideal. Zona B (20–40): riesgo bajo. Zona C (40–60): riesgo moderado. Zona D (60–80): riesgo alto. Zona E (> 80): riesgo muy alto." },
        { label: "Interpretación", desc: "A menor GRI, mejor perfil glucémico global. El GRI es útil para comparar períodos y evaluar si los ajustes de tratamiento reducen el riesgo combinado de hipo e hiperglucemia." },
      ],
    },
    evolucionTir: {
      titulo: "📈 Evolución TIR en el Tiempo",
      items: [
        { label: "¿Qué muestra?", desc: "Tendencia del TIR, TAR y TBR a lo largo de todos los registros MCG del paciente, en orden cronológico. Permite ver si el control glucémico mejora, empeora o se mantiene entre consultas." },
        { label: "¿Cómo interpretarla?", desc: "Una línea TIR ascendente indica mejoría. Si TIR sube y TAR/TBR bajan simultáneamente, el control es óptimo. Si TIR sube pero TBR también sube, puede indicar hipoglucemias frecuentes que 'inflan' el TIR artificialmente." },
        { label: "Meta", desc: "La línea de referencia verde marca el 70% de TIR objetivo ISPAD. El objetivo clínico es que la línea TIR esté por encima de esa referencia de forma sostenida." },
      ],
    },
    hipoglucemia: {
      titulo: "⚡ Eventos de Hipoglucemia",
      items: [
        { label: "Nº de eventos", desc: "Cantidad de episodios de glucosa < 54 mg/dL (hipoglucemia nivel 2) registrados durante el período del sensor. Son clínicamente significativos porque requieren intervención inmediata." },
        { label: "Duración (min)", desc: "Tiempo total acumulado en hipoglucemia durante el período. Una duración alta con pocos eventos indica episodios prolongados; muchos eventos cortos sugieren hipoglucemias reactivas frecuentes." },
        { label: "¿Por qué importa?", desc: "En niños, la hipoglucemia severa puede afectar el desarrollo neurológico. Reducir eventos y duración es prioritario, incluso si eso implica tolerar un TIR menor temporalmente." },
      ],
    },
    gmiHba1c: {
      titulo: "🔬 GMI vs HbA1c real",
      items: [
        { label: "GMI (estimado por sensor)", desc: "Calculado a partir del promedio de glucosa del MCG. Estima la HbA1c sin necesidad de muestra de sangre. Es inmediato pero puede diferir del laboratorio." },
        { label: "HbA1c real (laboratorio)", desc: "Refleja el promedio de glucosa de los últimos 2–3 meses mediante la hemoglobina glicosilada. Es el estándar de referencia, pero no distingue variabilidad ni hipoglucemias." },
        { label: "¿Por qué compararlos?", desc: "Si el GMI es menor que la HbA1c real, puede indicar que el sensor no capturó períodos de hiperglucemia (p. ej., uso < 70% del tiempo). Si el GMI es mayor, puede haber discordancia por condiciones que alteran la HbA1c (anemia, hemoglobinopatías). La concordancia validará la fiabilidad del sensor." },
      ],
    },
  };

  // Datos para gráficas — orden cronológico
  const chartData = [...historial].reverse().map((a, i) => ({
    label: `R${a.numero_registro || i + 1}`,
    fecha: a.fecha,
    TIR:   Number(a.tir)  || 0,
    TAR:   Number(a.tar)  || 0,
    TBR:   Number(a.tbr)  || 0,
    GMI:   Number(a.gmi)  || 0,
    CV:    Number(a.cv)   || 0,
    TA:    Number(a.tiempo_activo) || 0,
    GRI:   Number(a.gri)  || 0,
    clasificacion: a.clasificacion,
    eventos_hip:  a.eventos_hipoglucemia  != null ? Number(a.eventos_hipoglucemia)  : null,
    duracion_hip: a.duracion_hipoglucemia != null ? Number(a.duracion_hipoglucemia) : null,
    hba1c_post:   a.hba1c_post_mcg        != null ? Number(a.hba1c_post_mcg)        : null,
  }));

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
          <Link to="/pacientes" className="back-btn" title="Volver a Pacientes">
            <FiArrowLeft size={18} />
          </Link>
          <div className="patient-avatar">
            {paciente.nombre?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0 }}>{paciente.nombre}</h1>
            <div className="patient-chips">
              <span className="patient-chip">
                {paciente.sexo === "F" ? "♀ Femenino" : "♂ Masculino"}
              </span>
              <span className="patient-chip chip-age">
                {paciente.edad} años
              </span>
              {paciente.departamento && (
                <span className="patient-chip">{paciente.departamento}</span>
              )}
              <span className="patient-chip chip-diabetes">
                {paciente.tipo_diabetes}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link to={`/analisis/subir?paciente=${id}`} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FiUpload size={15} /> Subir PDF
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BARRA DE TABS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="tab-bar">
        {[
          { key: "info",         label: "Información",  icon: <FiUser size={14} /> },
          { key: "analisis",     label: "Análisis MCG", icon: <FiBarChart2 size={14} />, count: historial.length },
          { key: "insulina",     label: "Insulina",      icon: <FiZap size={14} />,      count: insulina.length },
          { key: "alimentacion", label: "Alimentación",  icon: <FiSun size={14} />,      count: alimentacion.length },
          { key: "anticuerpos",  label: "Anticuerpos",   icon: <MdOutlineBiotech size={15} />, count: anticuerpos.length },
        ].map(tab => {
          const activa = tabActiva === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              onMouseEnter={() => setHoveredTab(tab.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: isMobile ? "10px 10px 8px" : isTablet ? "10px 10px 8px" : "12px 22px 10px",
                border: "none", cursor: "pointer",
                borderBottom: activa ? "3px solid #6366f1" : "3px solid transparent",
                marginBottom: -2,
                color: activa ? "#4f46e5" : hoveredTab === tab.key ? "#6366f1" : "#94a3b8",
                fontWeight: activa ? 700 : 500,
                fontSize: "0.88rem",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                letterSpacing: activa ? "0.01em" : "normal",
                background: hoveredTab === tab.key && !activa ? "#f5f3ff" : "none",
                borderRadius: hoveredTab === tab.key && !activa ? "8px 8px 0 0" : 0,
              }}
            >
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 6,
                background: activa ? "#ede9fe" : hoveredTab === tab.key ? "#ede9fe" : "#f8fafc",
                color: activa ? "#6366f1" : hoveredTab === tab.key ? "#6366f1" : "#94a3b8",
                transition: "all 0.15s",
              }}>{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.count != null && (
                <span style={{
                  background: activa ? "#ede9fe" : "#f1f5f9",
                  color: activa ? "#6366f1" : "#94a3b8",
                  borderRadius: 20, padding: "2px 8px",
                  fontSize: "0.68rem", fontWeight: 700,
                  lineHeight: "16px", minWidth: 20, textAlign: "center",
                }}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB: INFORMACIÓN ──────────────────────────────────────────────── */}
      {tabActiva === "info" && (
        <div className="detalle-grid" style={{ alignItems: "start" }}>

          {/* COLUMNA IZQUIERDA: datos del paciente + tutor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="card-header-row">
                <h3 style={{ margin: 0 }}>Información del Paciente</h3>
                <Link to={`/pacientes/${id}/editar`} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "5px 12px" }}>
                  <FiEdit3 size={13} /> Editar
                </Link>
              </div>
              <table className="info-tabla">
                <tbody>
                  <SeccionFila>Datos del Paciente</SeccionFila>
                  <InfoFila label="DNI / Expediente"    valor={paciente.dni || "—"} />
                  <InfoFila label="Nombre"               valor={paciente.nombre || "—"} />
                  <InfoFila label="Fecha Nacimiento"     valor={paciente.fecha_nacimiento?.split("T")[0] || "—"} />
                  <InfoFila label="Edad actual"          valor={paciente.edad != null ? `${paciente.edad} años` : "—"} />
                  <InfoFila label="Género"               valor={paciente.sexo === "F" ? "👧 Femenino" : "👦 Masculino"} />
                  {paciente.telefono && <InfoFila label="Teléfono" valor={paciente.telefono} />}

                  <SeccionFila>Ubicación y Procedencia</SeccionFila>
                  <InfoFila label="Departamento"         valor={paciente.departamento || "—"} />
                  {paciente.municipio        && <InfoFila label="Municipio"    valor={paciente.municipio} />}
                  {paciente.procedencia_tipo && <InfoFila label="Procedencia"  valor={paciente.procedencia_tipo} />}
                  {paciente.direccion        && <InfoFila label="Dirección"    valor={paciente.direccion} />}

                  <SeccionFila>Datos Clínicos</SeccionFila>
                  <InfoFila label="Institución"          valor={paciente.institucion || "—"} />
                  <InfoFila label="Tipo Diabetes"        valor={paciente.tipo_diabetes || "—"} />
                  {paciente.subtipo_monogenica && <InfoFila label="Subtipo Monogénica" valor={paciente.subtipo_monogenica} />}
                  <InfoFila label="Edad al debut"        valor={paciente.edad_debut != null ? `${paciente.edad_debut} años` : "—"} />
                  {paciente.hba1c_previo && <InfoFila label="HbA1c previo" valor={`${paciente.hba1c_previo}%`} />}
                  <InfoFila label="Peso"                 valor={paciente.peso  ? `${Number(paciente.peso).toFixed(1)} kg`  : "—"} />
                  <InfoFila label="Talla"                valor={paciente.talla ? `${Number(paciente.talla).toFixed(1)} cm` : "—"} />
                  {paciente.dosis_por_kg          && <InfoFila label="Dosis por Kg"       valor={paciente.dosis_por_kg} />}
                  {paciente.promedio_glucometrias && <InfoFila label="Glucometrías / día" valor={paciente.promedio_glucometrias} />}
                  <tr>
                    <td style={{ color: "#64748b", fontWeight: 500, padding: "6px 0", width: "42%", verticalAlign: "middle" }}>Monitor MCG</td>
                    <td style={{ padding: "6px 0" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600,
                        background: paciente.con_monitor ? "#ede9fe" : "#f1f5f9",
                        color: paciente.con_monitor ? "#6366f1" : "#94a3b8",
                      }}>
                        {paciente.con_monitor ? "🟣 Con monitor MCG" : "Sin monitor MCG"}
                      </span>
                    </td>
                  </tr>

                  {paciente.antecedente_familiar && (
                    <>
                      <SeccionFila>Antecedentes</SeccionFila>
                      <InfoFila label="Antecedente familiar" valor={paciente.antecedente_familiar} />
                    </>
                  )}

                  <SeccionFila>Insulina inicial al ingreso</SeccionFila>
                  <InfoFila label="Insulina acción prolongada" valor={paciente.tipo_insulina  || "—"} />
                  <InfoFila label="Insulina acción corta"      valor={paciente.tipo_insulina_2 || "—"} />
                  {paciente.anticuerpos && <InfoFila label="Anticuerpos" valor={paciente.anticuerpos} />}

                  <SeccionFila>Datos del Tutor</SeccionFila>
                  <InfoFila label="Nombre tutor"   valor={paciente.nombre_tutor   || "—"} />
                  <InfoFila label="Teléfono tutor" valor={paciente.telefono_tutor || "—"} />
                </tbody>
              </table>
            </div>
          </div>

          {/* COLUMNA DERECHA: semáforo + guía */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ultimoAnalisis ? (
              <div className="card">
                <h3>Último Análisis · {ultimoAnalisis.fecha?.split("T")[0] || ultimoAnalisis.fecha}</h3>
                <SemaforoISPAD
                  tir={Number(ultimoAnalisis.tir)}
                  tar={Number(ultimoAnalisis.tar)}
                  tbr={Number(ultimoAnalisis.tbr)}
                  gmi={Number(ultimoAnalisis.gmi)}
                  clasificacion={ultimoAnalisis.clasificacion}
                  tarMuyAlto={ultimoAnalisis.tar_muy_alto != null ? Number(ultimoAnalisis.tar_muy_alto) : null}
                  tarAlto={ultimoAnalisis.tar_alto != null ? Number(ultimoAnalisis.tar_alto) : null}
                  tbrBajo={ultimoAnalisis.tbr_bajo != null ? Number(ultimoAnalisis.tbr_bajo) : null}
                  tbrMuyBajo={ultimoAnalisis.tbr_muy_bajo != null ? Number(ultimoAnalisis.tbr_muy_bajo) : null}
                  tiempoActivo={ultimoAnalisis.tiempo_activo != null ? ultimoAnalisis.tiempo_activo : null}
                />
              </div>
            ) : (
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 140, color: "#94a3b8", fontSize: "0.9rem" }}>
                Sin análisis registrados aún
              </div>
            )}

            <div className="card guia-metricas">
              <h3 style={{ marginBottom: 14 }}>📘 Guía de Métricas MCG</h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
                Los indicadores del monitoreo continuo de glucosa (MCG) se calculan a partir del porcentaje
                de tiempo que el sensor registra glucosa dentro de cada rango, sobre un período mínimo de 14 días
                con ≥ 70% de datos activos (recomendación ISPAD 2022).
              </p>
              <div className="guia-items">
                <div className="guia-item">
                  <span className="guia-dot" style={{ background: "#FEBF01" }} />
                  <div><strong>TAR Muy Alto</strong> — Tiempo sobre rango (&gt; 250 mg/dL)<span className="guia-meta">Objetivo: &lt; 5%</span></div>
                </div>
                <div className="guia-item">
                  <span className="guia-dot" style={{ background: "#FDD94F" }} />
                  <div><strong>TAR Alto</strong> — Tiempo sobre rango (181–250 mg/dL)<span className="guia-meta">Objetivo: &lt; 25%</span></div>
                </div>
                <div className="guia-item">
                  <span className="guia-dot" style={{ background: "#76B250" }} />
                  <div><strong>TIR</strong> — Tiempo en Rango (70–180 mg/dL)<span className="guia-meta">Objetivo: ≥ 70%</span></div>
                </div>
                <div className="guia-item">
                  <span className="guia-dot" style={{ background: "#FB0D0A" }} />
                  <div><strong>TBR Bajo</strong> — Tiempo bajo rango (54–69 mg/dL)<span className="guia-meta">Objetivo: &lt; 4%</span></div>
                </div>
                <div className="guia-item">
                  <span className="guia-dot" style={{ background: "#86270C" }} />
                  <div><strong>TBR Muy Bajo</strong> — Tiempo bajo rango (&lt; 54 mg/dL)<span className="guia-meta">Objetivo: &lt; 1%</span></div>
                </div>
                <div className="guia-item">
                  <span className="guia-dot" style={{ background: "#c27803" }} />
                  <div><strong>GMI</strong> — Indicador de Gestión de Glucosa<span className="guia-meta">Estimado de HbA1c a partir del sensor</span></div>
                </div>
              </div>
              <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 14, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                Clasificación: <strong style={{ color: "#22c55e" }}>Óptimo</strong> (TIR ≥ 70% y TBR &lt; 4%) ·{" "}
                <strong style={{ color: "#f59e0b" }}>Moderado</strong> (TIR 50–69%) ·{" "}
                <strong style={{ color: "#ef4444" }}>Alto Riesgo</strong> (TIR &lt; 50%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ANÁLISIS MCG (+ resto de tabs) ───────────────────────────── */}
      <div style={{ display: tabActiva === "info" ? "none" : "block" }}>
        {/* ── TAB: ANÁLISIS MCG ─────────────────────────────────────────── */}
        {tabActiva === "analisis" && (
          <>
            {chartData.length > 0 && (
              <>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h3 style={{ margin: 0 }}>📊 Comparación de Registros MCG — TIR / TAR / TBR</h3>
                    {yo?.mostrar_info_graficas ? (
                      <button onClick={() => setModalInfo("tirTarTbr")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #cbd5e1", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
                    ) : null}
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 12 }}>
                    Cada barra representa un registro de monitoreo. Objetivo: TIR ≥ 70% (verde), TAR ≤ 25%, TBR ≤ 4%.
                  </p>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <BarChart data={chartData} margin={{ top: 16, right: isMobile ? 4 : 20, left: isMobile ? -16 : -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={props => {
                          const d = chartData[props.index];
                          return (
                            <g transform={`translate(${props.x},${props.y})`}>
                              <text x={0} y={0} dy={14} textAnchor="middle" fill="#94a3b8" fontSize={12}>{props.payload.value}</text>
                              {!isMobile && d?.clasificacion && (
                                <text x={0} y={0} dy={26} textAnchor="middle" fontSize={9}
                                  fill={COLORS_CLASIF[d.clasificacion] || "#64748b"}>
                                  ● {d.clasificacion === 'OPTIMO' ? 'Óptimo' : d.clasificacion === 'MODERADO' ? 'Moderado' : 'Alto Riesgo'}
                                </text>
                              )}
                            </g>
                          );
                        }}
                        height={isMobile ? 25 : 42}
                      />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip content={<TooltipTIR />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "TIR 70%", fontSize: 10, fill: "#16a34a" }} />
                      <Bar dataKey="TIR" name="TIR %" stackId="a" fill={C_OBJETIVO} radius={[0,0,0,0]} />
                      <Bar dataKey="TAR" name="TAR %" stackId="b" fill={C_MUY_ALTO} radius={[4,4,0,0]} />
                      <Bar dataKey="TBR" name="TBR %" stackId="c" fill={C_BAJO} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboard-row">
                  <div className="card card-wide">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <h3 style={{ margin: 0 }}>GMI y CV por registro</h3>
                      {yo?.mostrar_info_graficas ? (
                        <button onClick={() => setModalInfo("gmiCv")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #cbd5e1", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
                      ) : null}
                    </div>
                    <ResponsiveContainer width="100%" height={isMobile ? 165 : 200}>
                      <BarChart data={chartData} margin={{ top: 5, right: isMobile ? 4 : 20, left: isMobile ? -18 : -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 60]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={v => `${v?.toFixed(1)}%`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <ReferenceLine y={7} stroke="#c27803" strokeDasharray="4 4" label={{ value: "GMI 7%", fontSize: 10, fill: "#c27803" }} />
                        <ReferenceLine y={36} stroke="#7c3aed" strokeDasharray="4 4" label={{ value: "CV 36%", fontSize: 10, fill: "#7c3aed" }} />
                        <Bar dataKey="GMI" name="GMI %" fill="#c27803" radius={[4,4,0,0]} label={isMobile ? false : { position: "top", fontSize: 10, formatter: v => v > 0 ? `${v}%` : "" }} />
                        <Bar dataKey="CV"  name="CV %"  fill="#7c3aed" radius={[4,4,0,0]} label={isMobile ? false : { position: "top", fontSize: 10, formatter: v => v > 0 ? `${v}%` : "" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <h3 style={{ margin: 0 }}>GRI por registro</h3>
                      {yo?.mostrar_info_graficas ? (
                        <button onClick={() => setModalInfo("gri")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #cbd5e1", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
                      ) : null}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>Zona A: 0-20 (ideal) · B: 20-40 · C: 40-60 · D: 60-80 · E: &gt;80</p>
                    <ResponsiveContainer width="100%" height={isMobile ? 165 : 200}>
                      <BarChart data={chartData} margin={{ top: 5, right: isMobile ? 4 : 10, left: isMobile ? -18 : -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={v => v} />
                        <ReferenceLine y={20} stroke="#16a34a" strokeDasharray="3 3" />
                        <ReferenceLine y={40} stroke="#d97706" strokeDasharray="3 3" />
                        <Bar dataKey="GRI" name="GRI" radius={[4,4,0,0]}
                          label={isMobile ? false : { position: "top", fontSize: 10, formatter: v => v > 0 ? v : "" }}>
                          {chartData.map(d => (
                            <Cell key={d.label}
                              fill={d.GRI <= 20 ? "#16a34a" : d.GRI <= 40 ? "#d97706" : d.GRI <= 60 ? "#f59e0b" : "#dc2626"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Gráfica: Evolución TIR en el tiempo ─────────────────── */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h3 style={{ margin: 0 }}>📈 Evolución TIR en el Tiempo</h3>
                    {yo?.mostrar_info_graficas ? (
                      <button onClick={() => setModalInfo("evolucionTir")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #cbd5e1", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
                    ) : null}
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 12 }}>
                    Tendencia del control glucémico registro a registro. Objetivo: TIR ≥ 70%.
                  </p>
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
                    <LineChart data={chartData} margin={{ top: 8, right: isMobile ? 4 : 24, left: isMobile ? -16 : -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => `${Number(v).toFixed(1)}%`} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="4 4"
                        label={{ value: "Meta TIR 70%", fontSize: 10, fill: "#16a34a", position: "insideTopRight" }} />
                      <Line type="monotone" dataKey="TIR" name="TIR %" stroke={C_OBJETIVO} strokeWidth={2.5}
                        dot={{ r: 5, fill: C_OBJETIVO }} activeDot={{ r: 7 }} />
                      <Line type="monotone" dataKey="TAR" name="TAR %" stroke={C_MUY_ALTO} strokeWidth={1.5}
                        strokeDasharray="4 4" dot={{ r: 3, fill: C_MUY_ALTO }} />
                      <Line type="monotone" dataKey="TBR" name="TBR %" stroke={C_BAJO} strokeWidth={1.5}
                        strokeDasharray="4 4" dot={{ r: 3, fill: C_BAJO }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Gráficas: Hipoglucemia y GMI vs HbA1c ───────────────── */}
                <div className="dashboard-row" style={{ marginBottom: 16 }}>
                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <h3 style={{ margin: 0 }}>⚡ Eventos de Hipoglucemia</h3>
                      {yo?.mostrar_info_graficas ? (
                        <button onClick={() => setModalInfo("hipoglucemia")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #cbd5e1", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
                      ) : null}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>
                      Episodios registrados y duración promedio por análisis
                    </p>
                    {chartData.some(d => d.eventos_hip != null && d.eventos_hip > 0) ? (
                      <ResponsiveContainer width="100%" height={isMobile ? 165 : 200}>
                        <LineChart data={chartData} margin={{ top: 5, right: isMobile ? 4 : 20, left: isMobile ? -18 : -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="ev" tick={{ fontSize: 11 }}
                            label={{ value: "eventos", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis yAxisId="dur" orientation="right" tick={{ fontSize: 11 }}
                            label={{ value: "min", angle: 90, position: "insideRight", fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip
                            contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: "#94a3b8" }}
                            itemStyle={{ color: "#fff" }}
                            formatter={(v, name) => [
                              v != null ? v : "—",
                              name === "eventos_hip" ? "Nº eventos" : "Duración (min)",
                            ]}
                          />
                          <Legend formatter={n => n === "eventos_hip" ? "Nº eventos" : "Duración (min)"} wrapperStyle={{ fontSize: 12 }} />
                          <Line yAxisId="ev" type="monotone" dataKey="eventos_hip" name="eventos_hip"
                            stroke="#dc2626" strokeWidth={2} dot={{ r: 4, fill: "#dc2626" }} activeDot={{ r: 6 }} connectNulls />
                          <Line yAxisId="dur" type="monotone" dataKey="duracion_hip" name="duracion_hip"
                            stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 3, fill: "#f97316" }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                        Sin datos de hipoglucemia registrados
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <h3 style={{ margin: 0 }}>🔬 GMI vs HbA1c post MCG</h3>
                      {yo?.mostrar_info_graficas ? (
                        <button onClick={() => setModalInfo("gmiHba1c")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #cbd5e1", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
                      ) : null}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>
                      HbA1c estimada por sensor (GMI) vs real por laboratorio
                    </p>
                    {chartData.some(d => d.hba1c_post != null && d.hba1c_post > 0) ? (
                      <ResponsiveContainer width="100%" height={isMobile ? 165 : 200}>
                        <BarChart data={chartData} margin={{ top: 5, right: isMobile ? 4 : 20, left: isMobile ? -18 : -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 16]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={v => v != null ? `${Number(v).toFixed(1)}%` : "—"} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <ReferenceLine y={7} stroke="#c27803" strokeDasharray="4 4"
                            label={{ value: "7%", fontSize: 10, fill: "#c27803" }} />
                          <Bar dataKey="GMI" name="GMI (estimado)" fill="#c27803" radius={[4,4,0,0]} />
                          <Bar dataKey="hba1c_post" name="HbA1c real" fill="#6366f1" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                        Sin HbA1c post MCG registrado aún
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Historial de análisis */}
            <div className="card" style={{ marginTop: chartData.length > 0 ? 16 : 0 }}>
              <h3>Historial de Análisis ({historial.length})</h3>
              <div className="table-wrapper">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th className="hide-tablet">Nº MCG</th>
                      <th>Fecha</th>
                      <th>TIR</th>
                      <th className="hide-mobile">TAR</th>
                      <th className="hide-mobile">TBR</th>
                      <th className="hide-mobile">GMI</th>
                      <th className="hide-tablet">CV</th>
                      <th className="hide-tablet">T. Activo</th>
                      <th className="hide-tablet">G. Promedio</th>
                      <th>Estado</th>
                      <th className="hide-tablet">PDF</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((a) => (
                      <tr key={a.id}>
                        <td className="hide-tablet" style={{ textAlign: "center", fontWeight: 600, color: "#3b82f6" }}>
                          {a.numero_registro ?? "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{a.fecha ? new Date(a.fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}</td>
                        <td><span className={`badge-tir ${a.tir >= 70 ? "ok" : a.tir >= 50 ? "warn" : "bad"}`}>{a.tir}%</span></td>
                        <td className="hide-mobile">{a.tar}%</td>
                        <td className="hide-mobile">{a.tbr}%</td>
                        <td className="hide-mobile">{a.gmi}%</td>
                        <td className="hide-tablet">{a.cv}%</td>
                        <td className="hide-tablet">{a.tiempo_activo}%</td>
                        <td className="hide-tablet">{a.glucosa_promedio} mg/dL</td>
                        <td><ClasificacionBadge valor={a.clasificacion} /></td>
                        <td className="hide-tablet">
                          {a.archivo_pdf && (
                            <a
                              href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/uploads/pdfs/${a.archivo_pdf}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-small"
                            >
                              Ver PDF
                            </a>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}>
                            <button onClick={() => setModalVer(a)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0ea5e9", padding: "3px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Ver detalle"><FiEye size={15} /></button>
                            <button onClick={() => abrirEditar(a)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", padding: "3px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Editar análisis"><FiEdit2 size={15} /></button>
                            <button onClick={() => setModalEliminar({ id: a.id, fecha: a.fecha })} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "3px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Eliminar análisis"><FiTrash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {historial.length === 0 && (
                      <tr>
                        <td colSpan={11} className="empty-cell">
                          No hay análisis aún.{" "}
                          <Link to={`/analisis/subir?paciente=${id}`}>Subir primer PDF →</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── TAB: INSULINA ─────────────────────────────────────────────── */}
        {tabActiva === "insulina" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ─── SECCIÓN ICR ─────────────────────────────────────────── */}
            {relacionIC.filter(r => r.icr != null).length > 0 && (
              <div className="card">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                    <FiActivity size={18} color="#6366f1" /> Relación Insulina : Carbohidratos (ICR)
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                    Gramos de carbohidratos cubiertos por cada unidad de insulina rápida
                  </p>
                </div>

                {/* Tarjetas resumen */}
                {(() => {
                  const validos = relacionIC.filter(r => r.icr != null);
                  const ultimo  = validos[validos.length - 1];
                  const prom    = validos.reduce((s, r) => s + Number(r.icr), 0) / validos.length;
                  const minVal  = Math.min(...validos.map(r => Number(r.icr)));
                  const maxVal  = Math.max(...validos.map(r => Number(r.icr)));
                  const cards   = [
                    { label: "ICR actual",  value: ultimo ? `${ultimo.icr} g/UI` : "—",  color: "#6366f1", bg: "#ede9fe" },
                    { label: "Promedio",    value: `${prom.toFixed(1)} g/UI`,              color: "#0ea5e9", bg: "#f0f9ff" },
                    { label: "Mínimo",      value: `${minVal} g/UI`,                       color: "#dc2626", bg: "#fef2f2" },
                    { label: "Máximo",      value: `${maxVal} g/UI`,                       color: "#16a34a", bg: "#f0fdf4" },
                  ];
                  return (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                      {cards.map(c => (
                        <div key={c.label} style={{ flex: "1 1 120px", background: c.bg, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c.color }}>{c.value}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{c.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Tarjeta interpretación clínica */}
                <div style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
                  padding: "14px 18px", marginBottom: 4, fontSize: "0.82rem", color: "#374151",
                }}>
                  <div style={{ fontWeight: 700, color: "#4338ca", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    📋 Interpretación clínica del ICR
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 6, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>ICR ↑</span>
                      <span>Ej. 20→25 g/UI → el paciente necesita <strong>menos insulina</strong> por gramo de CHO (<strong>mayor sensibilidad</strong>)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>ICR ↓</span>
                      <span>Ej. 20→15 g/UI → necesita <strong>más insulina</strong> por gramo de CHO (<strong>menor sensibilidad</strong> o carbohidratos aumentados)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ background: "#fef9c3", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>Ref.</span>
                      <span>La línea de referencia en <strong>10 g/UI</strong> es un valor orientativo común en adultos con DM1, aunque varía según cada paciente.</span>
                    </div>
                  </div>
                </div>

                {/* Gráfica evolución ICR */}
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={relacionIC.filter(r => r.icr != null).map(r => ({
                      fecha:    String(r.fecha).substring(0, 10),
                      icr:      Number(r.icr),
                      cho:      r.carbohidratos_g != null ? Number(r.carbohidratos_g) : null,
                      insulina: r.dosis_corta_u  != null ? Number(r.dosis_corta_u)   : null,
                    }))}
                    margin={{ top: 8, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="icr" domain={[0, "auto"]} tick={{ fontSize: 11 }} label={{ value: "g CHO/UI", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis yAxisId="cho" orientation="right" tick={{ fontSize: 11 }} label={{ value: "g / UI", angle: 90, position: "insideRight", fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#94a3b8" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(v, name) => [
                        name === "icr"     ? `${v} g/UI` :
                        name === "cho"     ? `${v} g`    : `${v} UI`,
                        name === "icr"     ? "ICR" :
                        name === "cho"     ? "CHO/día (g)" : "Dosis corta (UI)",
                      ]}
                    />
                    <Legend formatter={n =>
                      n === "icr"     ? "ICR (g CHO / UI)" :
                      n === "cho"     ? "Carbohidratos totales (g)" : "Dosis insulina corta (UI)"
                    } />
                    <ReferenceLine yAxisId="icr" y={10} stroke="#f59e0b" strokeDasharray="4 4"
                      label={{ value: "10 g/UI ref.", fontSize: 10, fill: "#f59e0b", position: "insideTopRight" }} />
                    <Line yAxisId="icr" type="monotone" dataKey="icr"      stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                    <Line yAxisId="cho" type="monotone" dataKey="cho"      stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 3, fill: "#10b981" }} />
                    <Line yAxisId="icr" type="monotone" dataKey="insulina" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 3, fill: "#0ea5e9" }} />
                  </LineChart>
                </ResponsiveContainer>

                {/* Tabla detalle ICR */}
                <div className="table-wrapper" style={{ marginTop: 16 }}>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Insulina corta</th>
                        <th>Dosis (UI)</th>
                        <th>CHO/día (g)</th>
                        <th>Cal/día</th>
                        <th style={{ color: "#6366f1", fontWeight: 700 }}>ICR (g/UI)</th>
                        <th className="hide-mobile">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relacionIC.filter(r => r.icr != null).map(r => (
                        <tr key={r.id}>
                          <td>{String(r.fecha).substring(0, 10)}</td>
                          <td>{r.insulina_corta || "—"}</td>
                          <td>{r.dosis_corta_u  ?? "—"}</td>
                          <td>{r.carbohidratos_g ?? "—"}</td>
                          <td>{r.calorias_dia    ?? "—"}</td>
                          <td style={{ fontWeight: 700, color: "#6366f1" }}>{r.icr}</td>
                          <td className="hide-mobile" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.motivo_cambio || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── HISTORIAL DE INSULINA ───────────────────────────────── */}
            <div className="card">
              <div className="card-header-row">
                <div>
                  <h3 style={{ margin: 0 }}>💉 a</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Inicio: <strong>{paciente.tipo_insulina || "—"}</strong> (prolongada) · <strong>{paciente.tipo_insulina_2 || "—"}</strong> (corta)
                  </p>
                </div>
                <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={abrirNuevaInsulina}>
                <FiPlus size={15} /> Nuevo registro
              </button>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="hide-tablet">Insulina prolongada</th>
                    <th>D. Prol.</th>
                    <th className="hide-tablet">Insulina corta</th>
                    <th>D. Corta</th>
                    <th className="hide-mobile">Vía</th>
                    <th className="hide-tablet">Motivo cambio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {insulina.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{r.fecha ? new Date(String(r.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}</td>
                      <td className="hide-tablet">{r.insulina_prolongada || "—"}</td>
                      <td>{r.dosis_prolongada || "—"}</td>
                      <td className="hide-tablet">{r.insulina_corta || "—"}</td>
                      <td>{r.dosis_corta || "—"}</td>
                      <td className="hide-mobile">{r.via_administracion || "—"}</td>
                      <td className="hide-tablet" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.motivo_cambio || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => abrirEditarInsulina(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Editar"><FiEdit2 size={15} /></button>
                          <button onClick={() => setEliminarInsulina(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Eliminar"><FiTrash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {insulina.length === 0 && (
                    <tr><td colSpan={8} className="empty-cell">Sin registros de insulina. Añade el primero →</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          </div>
        )}

        {/* ── TAB: ALIMENTACIÓN ─────────────────────────────────────────── */}
        {tabActiva === "anticuerpos" && (
          <div className="card">
            <div className="card-header-row">
              <h3 style={{ margin: 0 }}>🔬 Historial de Anticuerpos</h3>
              <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={abrirNuevoAnticuerpos}>
                <FiPlus size={15} /> Nuevo registro
              </button>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>IAA</th>
                    <th className="hide-mobile">Anti-GAD65</th>
                    <th className="hide-mobile">Anti-IA2</th>
                    <th className="hide-tablet">ZnT8</th>
                    <th className="hide-tablet">ICA</th>
                    <th className="hide-tablet">Elaborado por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {anticuerpos.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{r.fecha ? new Date(String(r.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}</td>
                      <td>{r.iaa || "—"}</td>
                      <td className="hide-mobile">{r.anti_gad65 || "—"}</td>
                      <td className="hide-mobile">{r.anti_ia2 || "—"}</td>
                      <td className="hide-tablet">{r.znt8 || "—"}</td>
                      <td className="hide-tablet">{r.ica || "—"}</td>
                      <td className="hide-tablet">{r.elaborado_por || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => abrirEditarAnticuerpos(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Editar"><FiEdit2 size={15} /></button>
                          <button onClick={() => setEliminarAnticuerpos(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Eliminar"><FiTrash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {anticuerpos.length === 0 && (
                    <tr><td colSpan={8} className="empty-cell">Sin registros de anticuerpos. Añade el primero →</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tabActiva === "alimentacion" && (
          <div className="card">
            <div className="card-header-row">
              <h3 style={{ margin: 0 }}>🥗 Planes de Alimentación</h3>
              <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={abrirNuevaAlimentacion}>
                <FiPlus size={15} /> Nuevo plan
              </button>
            </div>
            {alimentacion.length === 0 ? (
              <div className="empty-cell" style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8" }}>
                Sin planes de alimentación registrados. Añade el primero →
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alimentacion.map(p => (
                  <div key={p.id} style={{
                    border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px",
                    background: "#f8fafc",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                          {p.tipo_dieta || "Plan sin nombre"} · {p.fecha ? new Date(String(p.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                        </div>
                        {p.elaborado_por && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Elaborado por: {p.elaborado_por}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => abrirEditarAlimentacion(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", padding: "4px 6px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Editar"><FiEdit2 size={15} /></button>
                        <button onClick={() => setEliminarAlimentacion(p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "4px 6px", borderRadius: 4, display: "flex", alignItems: "center" }} title="Eliminar"><FiTrash2 size={15} /></button>
                      </div>
                    </div>

                    {/* Macros chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {p.calorias_dia   && <span style={chipStyle("#fef3c7","#92400e")}>🔥 {p.calorias_dia} kcal/día</span>}
                      {p.carbohidratos_g && <span style={chipStyle("#dbeafe","#1e40af")}>🌾 CH: {p.carbohidratos_g}g</span>}
                      {p.proteinas_g    && <span style={chipStyle("#dcfce7","#166534")}>🥩 Prot: {p.proteinas_g}g</span>}
                      {p.grasas_g       && <span style={chipStyle("#fce7f3","#9d174d")}>🫒 Grasas: {p.grasas_g}g</span>}
                      {p.fibra_g        && <span style={chipStyle("#f3e8ff","#6b21a8")}>🌿 Fibra: {p.fibra_g}g</span>}
                    </div>

                    {p.distribucion  && <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: 8 }}><strong>Distribución:</strong> {p.distribucion}</div>}
                    {p.restricciones && <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: 4 }}><strong>Restricciones:</strong> {p.restricciones}</div>}
                    {p.observaciones && <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: 4, fontStyle: "italic" }}>{p.observaciones}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal editar análisis */}
      {modalEditar && editForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          overflowY: "auto", padding: "24px 16px",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "28px 28px",
            maxWidth: 680, width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <FiEdit2 size={20} color="#3b82f6" /> Editar Análisis
              </h3>
              <button
                onClick={() => { setModalEditar(null); setEditForm(null); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Identificación */}
            <div className="form-grid">
              <div className="form-group">
                <label>Nº de monitor (registro)</label>
                <input type="number" name="numero_registro" value={editForm.numero_registro ?? ""} onChange={cambiarEditForm} min={1} max={10} />
              </div>
              <div className="form-group">
                <label>Fecha análisis *</label>
                <input type="date" name="fecha" value={editForm.fecha?.split("T")[0] || editForm.fecha || ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>Fecha colocación MCG</label>
                <input type="date" name="fecha_colocacion" value={editForm.fecha_colocacion?.split("T")[0] || editForm.fecha_colocacion || ""} onChange={cambiarEditForm} />
              </div>
            </div>

            {/* Métricas principales */}
            <h4 style={{ margin: "16px 0 10px", color: "#334155", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Métricas MCG</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>TIR (%)</label>
                <input type="number" step="0.1" name="tir" value={editForm.tir ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>TAR Total (%)</label>
                <input type="number" step="0.1" name="tar" value={editForm.tar ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>TAR Muy alto &gt;250 (%)</label>
                <input type="number" step="0.1" name="tar_muy_alto" value={editForm.tar_muy_alto ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>TAR Alto 181-250 (%)</label>
                <input type="number" step="0.1" name="tar_alto" value={editForm.tar_alto ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>TBR Total (%)</label>
                <input type="number" step="0.1" name="tbr" value={editForm.tbr ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>TBR Bajo 54-69 (%)</label>
                <input type="number" step="0.1" name="tbr_bajo" value={editForm.tbr_bajo ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>TBR Muy bajo &lt;54 (%)</label>
                <input type="number" step="0.1" name="tbr_muy_bajo" value={editForm.tbr_muy_bajo ?? ""} onChange={cambiarEditForm} min={0} max={100} />
              </div>
              <div className="form-group">
                <label>GMI (%)</label>
                <input type="number" step="0.01" name="gmi" value={editForm.gmi ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>CV (%)</label>
                <input type="number" step="0.1" name="cv" value={editForm.cv ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>Tiempo Activo (%)</label>
                <input type="number" step="0.1" name="tiempo_activo" value={editForm.tiempo_activo ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>Glucosa Promedio (mg/dL)</label>
                <input type="number" step="0.1" name="glucosa_promedio" value={editForm.glucosa_promedio ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>GRI</label>
                <input type="number" step="0.1" name="gri" value={editForm.gri ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>Eventos hipoglucemia</label>
                <input type="number" name="eventos_hipoglucemia" value={editForm.eventos_hipoglucemia ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>Duración hipoglucemia (min)</label>
                <input type="number" name="duracion_hipoglucemia" value={editForm.duracion_hipoglucemia ?? ""} onChange={cambiarEditForm} />
              </div>
            </div>

            {/* Insulina */}
            <h4 style={{ margin: "16px 0 10px", color: "#334155", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Insulina y seguimiento</h4>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Dosis de insulina (durante MCG)</label>
                <input name="dosis_insulina_post" value={editForm.dosis_insulina_post ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>Se modificó dosis</label>
                <input type="checkbox" name="se_modifico_dosis" checked={!!editForm.se_modifico_dosis} onChange={cambiarEditForm} style={{ width: "auto" }} />
              </div>
              <div className="form-group">
                <label>Dosis modificada</label>
                <input name="dosis_modificada" value={editForm.dosis_modificada ?? ""} onChange={cambiarEditForm} />
              </div>
              <div className="form-group">
                <label>HbA1c post MCG (%)</label>
                <input type="number" step="0.1" name="hba1c_post_mcg" value={editForm.hba1c_post_mcg ?? ""} onChange={cambiarEditForm} />
              </div>
            </div>

            {/* Limitaciones */}
            <h4 style={{ margin: "16px 0 10px", color: "#334155", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Limitaciones y calidad de vida</h4>
            <div className="form-grid">
              <div className="form-group">
                <label><input type="checkbox" name="limitacion_internet" checked={!!editForm.limitacion_internet} onChange={cambiarEditForm} style={{ width: "auto", marginRight: 6 }} />Internet</label>
              </div>
              <div className="form-group">
                <label><input type="checkbox" name="limitacion_alergias" checked={!!editForm.limitacion_alergias} onChange={cambiarEditForm} style={{ width: "auto", marginRight: 6 }} />Alergias</label>
              </div>
              <div className="form-group">
                <label><input type="checkbox" name="limitacion_economica" checked={!!editForm.limitacion_economica} onChange={cambiarEditForm} style={{ width: "auto", marginRight: 6 }} />Económicas</label>
              </div>
              <div className="form-group">
                <label>Valoración calidad de vida</label>
                <select name="calidad_vida" value={editForm.calidad_vida ?? ""} onChange={cambiarEditForm}>
                  <option value="">-- Sin registrar --</option>
                  <option value="Buena">Buena</option>
                  <option value="Mala">Mala</option>
                  <option value="Igual">Igual</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Comentarios</label>
                <textarea name="comentarios" value={editForm.comentarios ?? ""} onChange={cambiarEditForm} rows={3} style={{ width: "100%", resize: "vertical" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                className="btn btn-outline"
                onClick={() => { setModalEditar(null); setEditForm(null); }}
                disabled={guardandoEdicion}
              >Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={guardarEdicion}
                disabled={guardandoEdicion}
              >{guardandoEdicion ? "Guardando..." : "✔ Guardar cambios"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver detalle análisis */}
      {modalVer && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          overflowY: "auto", padding: "24px 16px",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "28px 28px",
            maxWidth: 860, width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <FiEye size={20} color="#0ea5e9" /> Detalle del Análisis
              </h3>
              <button
                onClick={() => setModalVer(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}
              >✕</button>
            </div>

            <div className="detalle-modal-cols">

              {/* COLUMNA IZQUIERDA */}
              <div>
                {/* Identificación */}
                <h4 style={{ margin: "0 0 8px", color: "#334155", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Identificación</h4>
                <table className="info-tabla" style={{ marginBottom: 16 }}>
                  <tbody>
                    <InfoFila label="Nº de monitor" valor={modalVer.numero_registro ?? "—"} />
                    <InfoFila label="Fecha análisis" valor={modalVer.fecha ? new Date(modalVer.fecha).toLocaleString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} />
                    <InfoFila label="Fecha colocación MCG" valor={modalVer.fecha_colocacion ? new Date(modalVer.fecha_colocacion).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"} />
                    <InfoFila label="Clasificación" valor={<ClasificacionBadge valor={modalVer.clasificacion} />} />
                  </tbody>
                </table>

                {/* Métricas MCG */}
                <h4 style={{ margin: "0 0 8px", color: "#334155", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Métricas MCG</h4>
                <table className="info-tabla" style={{ marginBottom: 16 }}>
                  <tbody>
                    <InfoFila label="TIR (%)" valor={modalVer.tir != null ? `${modalVer.tir}%` : "—"} />
                    <InfoFila label="TAR Total (%)" valor={modalVer.tar != null ? `${modalVer.tar}%` : "—"} />
                    <InfoFila label="TAR Muy alto >250 (%)" valor={modalVer.tar_muy_alto != null ? `${modalVer.tar_muy_alto}%` : "—"} />
                    <InfoFila label="TAR Alto 181-250 (%)" valor={modalVer.tar_alto != null ? `${modalVer.tar_alto}%` : "—"} />
                    <InfoFila label="TBR Total (%)" valor={modalVer.tbr != null ? `${modalVer.tbr}%` : "—"} />
                    <InfoFila label="TBR Bajo 54-69 (%)" valor={modalVer.tbr_bajo != null ? `${modalVer.tbr_bajo}%` : "—"} />
                    <InfoFila label="TBR Muy bajo <54 (%)" valor={modalVer.tbr_muy_bajo != null ? `${modalVer.tbr_muy_bajo}%` : "—"} />
                    <InfoFila label="GMI (%)" valor={modalVer.gmi != null ? `${modalVer.gmi}%` : "—"} />
                    <InfoFila label="CV (%)" valor={modalVer.cv != null ? `${modalVer.cv}%` : "—"} />
                    <InfoFila label="Tiempo Activo (%)" valor={modalVer.tiempo_activo != null ? `${modalVer.tiempo_activo}%` : "—"} />
                    <InfoFila label="Glucosa Promedio" valor={modalVer.glucosa_promedio != null ? `${modalVer.glucosa_promedio} mg/dL` : "—"} />
                    <InfoFila label="GRI" valor={modalVer.gri ?? "—"} />
                    <InfoFila label="Eventos hipoglucemia" valor={modalVer.eventos_hipoglucemia ?? "—"} />
                    <InfoFila label="Duración hipoglucemia" valor={modalVer.duracion_hipoglucemia != null ? `${modalVer.duracion_hipoglucemia} min` : "—"} />
                  </tbody>
                </table>
              </div>

              {/* COLUMNA DERECHA */}
              <div>
                {/* Insulina */}
                <h4 style={{ margin: "0 0 8px", color: "#334155", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Insulina y seguimiento</h4>
                <table className="info-tabla" style={{ marginBottom: 16 }}>
                  <tbody>
                    <InfoFila label="Dosis insulina (durante MCG)" valor={modalVer.dosis_insulina_post || "—"} />
                    <InfoFila label="Se modificó dosis" valor={modalVer.se_modifico_dosis ? "Sí" : "No"} />
                    {modalVer.se_modifico_dosis && <InfoFila label="Dosis modificada" valor={modalVer.dosis_modificada || "—"} />}
                    <InfoFila label="HbA1c post MCG" valor={modalVer.hba1c_post_mcg != null ? `${modalVer.hba1c_post_mcg}%` : "—"} />
                  </tbody>
                </table>

                {/* Limitaciones */}
                <h4 style={{ margin: "0 0 8px", color: "#334155", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Limitaciones y calidad de vida</h4>
                <table className="info-tabla" style={{ marginBottom: 16 }}>
                  <tbody>
                    <InfoFila label="Limitación internet" valor={modalVer.limitacion_internet ? "Sí" : "No"} />
                    <InfoFila label="Limitación alergias" valor={modalVer.limitacion_alergias ? "Sí" : "No"} />
                    <InfoFila label="Limitación económica" valor={modalVer.limitacion_economica ? "Sí" : "No"} />
                    <InfoFila label="Calidad de vida" valor={modalVer.calidad_vida || "—"} />
                    <InfoFila label="Comentarios" valor={modalVer.comentarios || "—"} />
                  </tbody>
                </table>
              </div>

            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setModalVer(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal información de gráficas ─────────────────────────────── */}
      {modalInfo && INFO_GRAFICAS[modalInfo] && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}
          onClick={() => setModalInfo(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 14, padding: "28px 28px", maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem", lineHeight: 1.4 }}>
                {INFO_GRAFICAS[modalInfo].titulo}
              </h3>
              <button onClick={() => setModalInfo(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1, marginLeft: 12, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {INFO_GRAFICAS[modalInfo].items.map((item, i) => (
                <div key={i} style={{ borderLeft: "3px solid #6366f1", paddingLeft: 14 }}>
                  <div style={{ fontWeight: 700, color: "#3730a3", fontSize: "0.88rem", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: "#374151", fontSize: "0.84rem", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button className="btn btn-outline" onClick={() => setModalInfo(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {modalEliminar && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: "32px 28px",
            maxWidth: 420, width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <FiTrash2 size={40} color="#dc2626" />
            </div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", color: "#0f172a" }}>Eliminar análisis</h3>
            <p style={{ textAlign: "center", color: "#64748b", marginBottom: 24, fontSize: 14 }}>
              ¿Estás seguro de que deseas eliminar el análisis del{" "}
              <strong>{modalEliminar.fecha?.split("T")[0] || modalEliminar.fecha}</strong>?<br />
              <span style={{ color: "#dc2626", fontSize: 13 }}>Esta acción no se puede deshacer.</span>
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-outline"
                onClick={() => setModalEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                onClick={eliminarAnalisis}
                disabled={eliminando}
                style={{
                  background: eliminando ? "#fca5a5" : "#dc2626",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 20px", fontWeight: 600, cursor: eliminando ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal insulina (crear / editar) ─────────────────────────────── */}
      {modalInsulina && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px", maxWidth: 600, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <FiDroplet size={20} color="#3b82f6" /> {editInsulina ? "Editar registro" : "Nuevo registro de insulina"}
              </h3>
              <button onClick={() => setModalInsulina(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={formInsulina.fecha || ""} onChange={e => setFormInsulina(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Vía de administración</label>
                <select value={formInsulina.via_administracion || "Subcutánea"} onChange={e => setFormInsulina(f => ({ ...f, via_administracion: e.target.value }))}>
                  <option>Subcutánea</option>
                  <option>Bomba de insulina</option>
                  <option>Inhalatoria</option>
                </select>
              </div>
              <div className="form-group">
                <label>Insulina acción prolongada</label>
                <input value={formInsulina.insulina_prolongada || ""} onChange={e => setFormInsulina(f => ({ ...f, insulina_prolongada: e.target.value }))} placeholder="Ej: Glargina, Detemir…" />
              </div>
              <div className="form-group">
                <label>Dosis prolongada</label>
                <input value={formInsulina.dosis_prolongada || ""} onChange={e => setFormInsulina(f => ({ ...f, dosis_prolongada: e.target.value }))} placeholder="Ej: 10 UI nocturna" />
              </div>
              <div className="form-group">
                <label>Insulina acción corta</label>
                <input value={formInsulina.insulina_corta || ""} onChange={e => setFormInsulina(f => ({ ...f, insulina_corta: e.target.value }))} placeholder="Ej: Lispro, Aspart…" />
              </div>
              <div className="form-group">
                <label>Dosis corta (texto)</label>
                <input value={formInsulina.dosis_corta || ""} onChange={e => setFormInsulina(f => ({ ...f, dosis_corta: e.target.value }))} placeholder="Ej: 1 UI / 10g CH" />
              </div>
              <div className="form-group">
                <label>Dosis prolongada (UI numérico)</label>
                <input type="number" min="0" step="0.1" value={formInsulina.dosis_prolongada_u ?? ""} onChange={e => setFormInsulina(f => ({ ...f, dosis_prolongada_u: e.target.value }))} placeholder="Ej: 10" />
              </div>
              <div className="form-group">
                <label>Dosis corta (UI numérico)</label>
                <input type="number" min="0" step="0.1" value={formInsulina.dosis_corta_u ?? ""} onChange={e => setFormInsulina(f => ({ ...f, dosis_corta_u: e.target.value }))} placeholder="Ej: 8" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Motivo del cambio</label>
                <input value={formInsulina.motivo_cambio || ""} onChange={e => setFormInsulina(f => ({ ...f, motivo_cambio: e.target.value }))} placeholder="Ej: Hiperglucemias persistentes, ajuste por MCG…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Observaciones</label>
                <textarea value={formInsulina.observaciones || ""} onChange={e => setFormInsulina(f => ({ ...f, observaciones: e.target.value }))} rows={2} style={{ width: "100%", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setModalInsulina(false)} disabled={guardandoInsulina}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarInsulina} disabled={guardandoInsulina}>
                {guardandoInsulina ? "Guardando..." : "✔ Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar insulina ────────────────────────────── */}
      {eliminarInsulina && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "32px 28px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <FiTrash2 size={36} color="#dc2626" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px" }}>Eliminar registro</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>¿Eliminar el registro de insulina del <strong>{eliminarInsulina.fecha}</strong>?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setEliminarInsulina(null)} disabled={eliminandoInsulina}>Cancelar</button>
              <button onClick={confirmarEliminarInsulina} disabled={eliminandoInsulina} style={{ background: eliminandoInsulina ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: "pointer" }}>
                {eliminandoInsulina ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal alimentación (crear / editar) ─────────────────────────── */}
      {modalAlimentacion && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px", maxWidth: 680, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <FiBookOpen size={20} color="#16a34a" /> {editAlimentacion ? "Editar plan" : "Nuevo plan de alimentación"}
              </h3>
              <button onClick={() => setModalAlimentacion(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={formAlimentacion.fecha || ""} onChange={e => setFormAlimentacion(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Tipo de dieta</label>
                <input value={formAlimentacion.tipo_dieta || ""} onChange={e => setFormAlimentacion(f => ({ ...f, tipo_dieta: e.target.value }))} placeholder="Ej: Baja en carbohidratos, Mediterránea…" />
              </div>
              <div className="form-group">
                <label>Calorías / día (kcal)</label>
                <input type="number" value={formAlimentacion.calorias_dia || ""} onChange={e => setFormAlimentacion(f => ({ ...f, calorias_dia: e.target.value }))} min={0} />
              </div>
              <div className="form-group">
                <label>Elaborado por</label>
                <input value={formAlimentacion.elaborado_por || ""} onChange={e => setFormAlimentacion(f => ({ ...f, elaborado_por: e.target.value }))} placeholder="Nutricionista, médico…" />
              </div>
            </div>

            <h4 style={{ margin: "16px 0 10px", color: "#334155", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Macronutrientes (gramos / día)</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>🌾 Carbohidratos (g)</label>
                <input type="number" step="0.1" value={formAlimentacion.carbohidratos_g || ""} onChange={e => setFormAlimentacion(f => ({ ...f, carbohidratos_g: e.target.value }))} min={0} />
              </div>
              <div className="form-group">
                <label>🥩 Proteínas (g)</label>
                <input type="number" step="0.1" value={formAlimentacion.proteinas_g || ""} onChange={e => setFormAlimentacion(f => ({ ...f, proteinas_g: e.target.value }))} min={0} />
              </div>
              <div className="form-group">
                <label>🫒 Grasas (g)</label>
                <input type="number" step="0.1" value={formAlimentacion.grasas_g || ""} onChange={e => setFormAlimentacion(f => ({ ...f, grasas_g: e.target.value }))} min={0} />
              </div>
              <div className="form-group">
                <label>🌿 Fibra (g)</label>
                <input type="number" step="0.1" value={formAlimentacion.fibra_g || ""} onChange={e => setFormAlimentacion(f => ({ ...f, fibra_g: e.target.value }))} min={0} />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Distribución de comidas</label>
                <input value={formAlimentacion.distribucion || ""} onChange={e => setFormAlimentacion(f => ({ ...f, distribucion: e.target.value }))} placeholder="Ej: 3 comidas + 2 colaciones, 50/20/30 desayuno/almuerzo/cena…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Restricciones / alergias</label>
                <input value={formAlimentacion.restricciones || ""} onChange={e => setFormAlimentacion(f => ({ ...f, restricciones: e.target.value }))} placeholder="Ej: Sin gluten, sin lactosa…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Observaciones</label>
                <textarea value={formAlimentacion.observaciones || ""} onChange={e => setFormAlimentacion(f => ({ ...f, observaciones: e.target.value }))} rows={3} style={{ width: "100%", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setModalAlimentacion(false)} disabled={guardandoAlimentacion}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarAlimentacion} disabled={guardandoAlimentacion}>
                {guardandoAlimentacion ? "Guardando..." : "✔ Guardar plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar alimentación ───────────────────────── */}
      {eliminarAlimentacion && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "32px 28px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <FiTrash2 size={36} color="#dc2626" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px" }}>Eliminar plan</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>¿Eliminar el plan del <strong>{eliminarAlimentacion.fecha}</strong>?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setEliminarAlimentacion(null)} disabled={eliminandoAlimentacion}>Cancelar</button>
              <button onClick={confirmarEliminarAlimentacion} disabled={eliminandoAlimentacion} style={{ background: eliminandoAlimentacion ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: "pointer" }}>
                {eliminandoAlimentacion ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal anticuerpos (crear / editar) ──────────────────────────── */}
      {modalAnticuerpos && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px", maxWidth: 640, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                🔬 {editAnticuerpos ? "Editar registro" : "Nuevo registro de anticuerpos"}
              </h3>
              <button onClick={() => setModalAnticuerpos(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 16 }}>
              Ingrese el resultado de cada anticuerpo: <em>Positivo</em>, <em>Negativo</em>, valor numérico (ej. 45 U/mL) o déjelo vacío si no se realizó.
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={formAnticuerpos.fecha || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Elaborado por</label>
                <input value={formAnticuerpos.elaborado_por || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, elaborado_por: e.target.value }))} placeholder="Médico, laboratorio…" />
              </div>
            </div>
            <h4 style={{ margin: "16px 0 10px", color: "#334155", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resultados por anticuerpo</h4>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Anti-insulina (IAA)</label>
                <input value={formAnticuerpos.iaa || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, iaa: e.target.value }))} placeholder="Positivo / Negativo / 45 U/mL…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Ácido glutámico descarboxilasa (Anti-GAD65)</label>
                <input value={formAnticuerpos.anti_gad65 || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, anti_gad65: e.target.value }))} placeholder="Positivo / Negativo / valor…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Anti-IA2 (Tirosina Fosfatasa 2 de los islotes)</label>
                <input value={formAnticuerpos.anti_ia2 || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, anti_ia2: e.target.value }))} placeholder="Positivo / Negativo / valor…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Anticuerpo transportador de Zinc 8 (ZnT8)</label>
                <input value={formAnticuerpos.znt8 || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, znt8: e.target.value }))} placeholder="Positivo / Negativo / valor…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Anticuerpos de células de islotes (ICA)</label>
                <input value={formAnticuerpos.ica || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, ica: e.target.value }))} placeholder="Positivo / Negativo / valor…" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Observaciones</label>
                <textarea value={formAnticuerpos.observaciones || ""} onChange={e => setFormAnticuerpos(f => ({ ...f, observaciones: e.target.value }))} rows={3} style={{ width: "100%", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setModalAnticuerpos(false)} disabled={guardandoAnticuerpos}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarAnticuerpos} disabled={guardandoAnticuerpos}>
                {guardandoAnticuerpos ? "Guardando..." : "✔ Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar anticuerpos ─────────────────────────── */}
      {eliminarAnticuerpos && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "32px 28px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <FiTrash2 size={36} color="#dc2626" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px" }}>Eliminar registro</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>¿Eliminar el registro de anticuerpos del <strong>{eliminarAnticuerpos.fecha}</strong>?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setEliminarAnticuerpos(null)} disabled={eliminandoAnticuerpos}>Cancelar</button>
              <button onClick={confirmarEliminarAnticuerpos} disabled={eliminandoAnticuerpos} style={{ background: eliminandoAnticuerpos ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: "pointer" }}>
                {eliminandoAnticuerpos ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function chipStyle(bg, color) {
  return {
    background: bg, color, borderRadius: 20,
    padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4,
  };
}

function InfoFila({ label, valor }) {
  return (
    <tr>
      <td className="info-label">{label}</td>
      <td className="info-valor">{valor}</td>
    </tr>
  );
}

function SeccionFila({ children }) {
  return (
    <tr>
      <td colSpan={2} style={{
        paddingTop: 14, paddingBottom: 4,
        fontSize: "0.72rem", fontWeight: 700, color: "#475569",
        textTransform: "uppercase", letterSpacing: "0.08em",
        borderTop: "1px solid #f1f5f9",
      }}>
        {children}
      </td>
    </tr>
  );
}

function ClasificacionBadge({ valor }) {
  const map = {
    OPTIMO:      { label: "Óptimo",      cls: "badge-ok" },
    MODERADO:    { label: "Moderado",    cls: "badge-warn" },
    ALTO_RIESGO: { label: "Alto Riesgo", cls: "badge-bad" },
  };
  const b = map[valor] || { label: valor, cls: "" };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}
