import { useEffect, useState, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { FiTrash2, FiEdit2, FiEye, FiArrowLeft, FiUpload, FiEdit3, FiPlus, FiActivity, FiDroplet, FiBookOpen, FiUser, FiBarChart2, FiSun, FiZap, FiClipboard, FiPrinter } from "react-icons/fi";
import { IoLogoWhatsapp } from "react-icons/io";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import ConsultaPrintModal from "../Consultas/ConsultaPrintModal";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import SemaforoISPAD from "../../components/SemaforoISPAD";
import { useAuth } from "../../context/AuthContext";
import { calcularZScores, calcularEdadMeses } from "../../utils/who_zscore";

// ─── Fecha local (evita desfase UTC) ────────────────────────────────────────
function fechaHoy() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; }

// ─── Colores por clasificación ──────────────────────────────────────────────
const COLORS_CLASIF = { OPTIMO: "#16a34a", MODERADO: "#d97706", ALTO_RIESGO: "#dc2626" };

// ─── Badges tipo consulta ────────────────────────────────────────────────────
const TIPO_BADGE = {
  Presencial:   "badge-green",
  Telemedicina: "badge-blue",
  Control:      "badge-yellow",
  Urgencia:     "badge-red",
  Otro:         "badge-gray",
};

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

  // ── Consultas ─────────────────────────────────────────────────────────────
  const [consultas, setConsultas] = useState([]);
  const [printConsultaId, setPrintConsultaId] = useState(null);

  // ── Crecimiento ───────────────────────────────────────────────────────────
  const [crecimiento, setCrecimiento] = useState([]);
  const [modalCrecimiento, setModalCrecimiento] = useState(false);
  const [editCrecimiento, setEditCrecimiento] = useState(null);
  const [formCrec, setFormCrec] = useState({});
  const [guardandoCrec, setGuardandoCrec] = useState(false);
  const [eliminarCrec, setEliminarCrec] = useState(null);
  const [eliminandoCrec, setEliminandoCrec] = useState(false);
  const [tabGraficaCrec, setTabGraficaCrec] = useState("peso_edad");
  // Referencia OMS a mostrar: "0_5" (0-5 años) o "5_19" (5-19 años)
  const [refOMS, setRefOMS] = useState("0_5");

  // ── WhatsApp individual ───────────────────────────────────────────────────
  const [modalWhatsApp, setModalWhatsApp]   = useState(false);
  const [msgWhatsApp,   setMsgWhatsApp]     = useState("");
  const [enviandoWA,    setEnviandoWA]      = useState(false);
  const [resultadoWA,   setResultadoWA]     = useState(null);

  function generarMensajeWA(clasificacion) {
    const trato    = paciente.sexo === "F" ? "Estimada" : "Estimado";
    const hospital = paciente.institucion === "HMEP"
      ? "Hospital María de Especialidades Pediátricas"
      : paciente.institucion === "IHSS"
        ? "Instituto Hondureño de Seguridad Social"
        : paciente.institucion || "la institución";

    if (clasificacion === "ALTO_RIESGO") {
      return `🏥 *${hospital}*\n_Consulta de Diabetes · Endocrinología_\n\n━━━━━━━━━━━━━━━━━━━━\n\n${trato} *${paciente.nombre}*, 👋\n\nHemos revisado las métricas de tu monitor de glucosa y hemos detectado ⚠️ *alertas con niveles elevados* que requieren tu atención.\n\nPor favor, revisa los siguientes puntos:\n\n1️⃣ 🥗 *Plan de alimentación* — Verifica que estés siguiendo las indicaciones nutricionales.\n2️⃣ 🏃 *Cumplimiento de ejercicio* — El ejercicio regular ayuda a estabilizar la glucosa.\n3️⃣ 💉 *Dosis de insulina* — Asegúrate de que las dosis sean las indicadas por tu médico.\n\n📌 Si los niveles persisten elevados, por favor comunícate con tu médico tratante para coordinar tu próxima cita.\n\n¡Tu salud es nuestra prioridad! 💙\n\n━━━━━━━━━━━━━━━━━━━━\n_Este mensaje es informativo. En caso de emergencia, acude a tu doctor._`;
    } else if (clasificacion === "MODERADO") {
      return `🏥 *${hospital}*\n_Consulta de Diabetes · Endocrinología_\n\n━━━━━━━━━━━━━━━━━━━━\n\n${trato} *${paciente.nombre}*, 👋\n\nHemos revisado las métricas de tu monitor de glucosa y observamos que tu control se encuentra en un nivel 🟡 *MODERADO*.\n\nTe recomendamos prestar atención a:\n\n1️⃣ 🥗 *Plan de alimentación* — Mantén una dieta equilibrada según tus indicaciones.\n2️⃣ 🏃 *Cumplimiento de ejercicio* — El ejercicio regular es clave para un buen control.\n3️⃣ 💉 *Dosis de insulina* — Verifica que estés administrando las dosis correctas.\n\n📅 Por favor, comunícate con tu médico tratante para dar seguimiento y mejorar tu control glucémico.\n\n¡Pequeños cambios hacen grandes diferencias! 💛\n\n━━━━━━━━━━━━━━━━━━━━\n_Este mensaje es informativo. En caso de emergencia, acude a tu doctor._`;
    } else if (clasificacion === "OPTIMO") {
      return `🏥 *${hospital}*\n_Consulta de Diabetes · Endocrinología_\n\n━━━━━━━━━━━━━━━━━━━━\n\n${trato} *${paciente.nombre}*, 👋\n\n¡Tenemos excelentes noticias! 🎉 Las métricas de tu monitor de glucosa muestran un control ✅ *ÓPTIMO*.\n\n🌟 *¡Felicitaciones por tu esfuerzo y dedicación!* Seguir así marca una gran diferencia en tu salud a largo plazo.\n\nRecuerda continuar con:\n\n✔️ Tu plan de alimentación\n✔️ Tu rutina de ejercicio\n✔️ La administración correcta de insulina\n📅 Tus citas de seguimiento programadas\n\n¡Sigue adelante, vas por el camino correcto! 💚\n\n━━━━━━━━━━━━━━━━━━━━\n_Este mensaje es informativo. En caso de emergencia, acude a tu doctor._`;
    }
    return `🏥 *${hospital}*\n_Consulta de Diabetes · Endocrinología_\n\n${trato} *${paciente.nombre}*, 👋\n\nPor favor comunícate con tu médico tratante para coordinar tu próxima cita. 📅\n\n¡Tu salud es nuestra prioridad! 💙`;
  }

  async function enviarWhatsAppIndividual() {
    if (!msgWhatsApp.trim()) return;
    setEnviandoWA(true);
    setResultadoWA(null);
    try {
      await api.post(`/mensajes/enviar/${id}`, { mensaje: msgWhatsApp.trim() });
      setResultadoWA({ ok: true });
      setMsgWhatsApp("");
    } catch (err) {
      setResultadoWA({ ok: false, error: err.response?.data?.error || "Error al enviar" });
    } finally {
      setEnviandoWA(false);
    }
  }

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
      fecha: fechaHoy(),
      insulina_prolongada: paciente.tipo_insulina  || "",
      insulina_corta:      paciente.tipo_insulina_2 || "",
      dosis_prolongada: "", dosis_corta: "",
      dosis_prolongada_u: "", dosis_corta_u: "", dosis_total_u: "",
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
  // Recalcula dosis_total_u cada vez que cambian los valores numéricos
  function actualizarDosisInsulina(campo, valor) {
    setFormInsulina(f => {
      const next = { ...f, [campo]: valor };
      const dp = parseFloat(next.dosis_prolongada_u) || 0;
      const dc = parseFloat(next.dosis_corta_u)      || 0;
      next.dosis_total_u = (dp + dc) > 0 ? parseFloat((dp + dc).toFixed(2)) : "";
      return next;
    });
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
      fecha: fechaHoy(),
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

  // ── Crecimiento helpers ───────────────────────────────────────────────────
  function abrirNuevoCrec() {
    const edadMeses = calcularEdadMeses(paciente?.fecha_nacimiento, null);
    setFormCrec({
      fecha: fechaHoy(),
      peso_kg: "", talla_cm: "", pc_cm: "",
      edad_meses: edadMeses ?? "",
      observaciones: "",
    });
    setEditCrecimiento(null);
    setModalCrecimiento(true);
  }
  function abrirEditarCrec(reg) {
    setFormCrec({ ...reg, fecha: reg.fecha?.split("T")[0] || reg.fecha });
    setEditCrecimiento(reg);
    setModalCrecimiento(true);
  }
  function cambiarFormCrec(e) {
    const { name, value } = e.target;
    setFormCrec(f => {
      const next = { ...f, [name]: value };
      // Recalcular edad_meses cuando cambia la fecha
      if (name === "fecha" && paciente?.fecha_nacimiento) {
        next.edad_meses = calcularEdadMeses(paciente.fecha_nacimiento, value) ?? "";
      }
      return next;
    });
  }
  // Z-scores calculados en tiempo real para previsualización
  const zPreview = (() => {
    if (!formCrec.peso_kg && !formCrec.talla_cm && !formCrec.pc_cm) return null;
    return calcularZScores({
      peso_kg:    formCrec.peso_kg   || null,
      talla_cm:   formCrec.talla_cm  || null,
      pc_cm:      formCrec.pc_cm     || null,
      edad_meses: formCrec.edad_meses,
    }, paciente?.sexo || "M");
  })();

  async function guardarCrec() {
    setGuardandoCrec(true);
    try {
      // Calcular z-scores antes de guardar
      const zs = calcularZScores({
        peso_kg:    formCrec.peso_kg   || null,
        talla_cm:   formCrec.talla_cm  || null,
        pc_cm:      formCrec.pc_cm     || null,
        edad_meses: formCrec.edad_meses,
      }, paciente?.sexo || "M");
      const payload = { ...formCrec, ...zs };
      if (editCrecimiento) {
        const { data } = await api.put(`/pacientes/${id}/crecimiento/${editCrecimiento.id}`, payload);
        setCrecimiento(list => list.map(r => r.id === editCrecimiento.id ? { ...r, ...payload, ...data } : r));
      } else {
        const { data } = await api.post(`/pacientes/${id}/crecimiento`, payload);
        setCrecimiento(list => [{ ...payload, id: data.id, ...data }, ...list]);
      }
      setModalCrecimiento(false);
    } catch {
      alert("Error al guardar el registro de crecimiento.");
    } finally {
      setGuardandoCrec(false);
    }
  }
  async function confirmarEliminarCrec() {
    setEliminandoCrec(true);
    try {
      await api.delete(`/pacientes/${id}/crecimiento/${eliminarCrec.id}`);
      setCrecimiento(list => list.filter(r => r.id !== eliminarCrec.id));
      setEliminarCrec(null);
    } catch {
      alert("Error al eliminar el registro.");
    } finally {
      setEliminandoCrec(false);
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
      api.get(`/consultas?paciente_id=${id}`),
      api.get(`/pacientes/${id}/relacion-ic`),
      api.get(`/pacientes/${id}/crecimiento`),
    ]).then(([p, h, ins, ali, cons, ric, crec]) => {
      setPaciente(p.data);
      setHistorial(h.data);
      setInsulina(ins.data);
      setAlimentacion(ali.data);
      setConsultas(cons.data);
      setRelacionIC(ric.data);
      setCrecimiento(crec.data);
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
          <button
            onClick={() => { setMsgWhatsApp(generarMensajeWA(ultimoAnalisis?.clasificacion)); setResultadoWA(null); setModalWhatsApp(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#25d366", color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 14px", fontWeight: 600,
              fontSize: "0.875rem", cursor: "pointer",
            }}
            title="Enviar mensaje WhatsApp"
          >
            <IoLogoWhatsapp size={17} /> WhatsApp
          </button>
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
          { key: "info",         label: "Información",        icon: <FiUser size={14} /> },
          { key: "consultas",    label: "Consultas",          icon: <FiClipboard size={14} />, count: consultas.length },
          { key: "analisis",     label: "Análisis MCG",       icon: <FiBarChart2 size={14} />, count: historial.length },
          { key: "crecimiento",  label: "Curvas Crecimiento", icon: <FiActivity size={14} />, count: crecimiento.length },
          { key: "insulina",     label: "Insulina",           icon: <FiZap size={14} />,      count: insulina.length },
          { key: "alimentacion", label: "Alimentación",       icon: <FiSun size={14} />,      count: alimentacion.length },
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
                <div className="card-header-row" style={{ marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                      <FiActivity size={18} color="#6366f1" /> Relación Insulina : Carbohidratos (ICR)
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                      Gramos de carbohidratos cubiertos por cada unidad de insulina rápida
                    </p>
                  </div>
                  <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={abrirNuevaInsulina}>
                    <FiPlus size={15} /> Nuevo registro
                  </button>
                </div>

                {/* Tarjetas resumen */}
                {(() => {
                  const validos = relacionIC.filter(r => r.icr != null);
                  const ultimo  = validos[validos.length - 1];
                  const prom    = validos.reduce((s, r) => s + Number(r.icr), 0) / validos.length;
                  const minVal  = Math.min(...validos.map(r => Number(r.icr)));
                  const maxVal  = Math.max(...validos.map(r => Number(r.icr)));
                  const cards   = [
                    { label: "ICR actual",  value: ultimo ? `${Math.round(Number(ultimo.icr))} g/UI` : "—",  color: "#6366f1", bg: "#ede9fe" },
                    { label: "Promedio",    value: `${Math.round(prom)} g/UI`,              color: "#0ea5e9", bg: "#f0f9ff" },
                    { label: "Mínimo",      value: `${Math.round(minVal)} g/UI`,            color: "#dc2626", bg: "#fef2f2" },
                    { label: "Máximo",      value: `${Math.round(maxVal)} g/UI`,            color: "#16a34a", bg: "#f0fdf4" },
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
                      icr:      Math.round(Number(r.icr)),
                      cho:      r.carbohidratos_g != null ? Math.round(Number(r.carbohidratos_g)) : null,
                      insulina: r.dosis_corta_u  != null ? Math.round(Number(r.dosis_corta_u))   : null,
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

              </div>
            )}

            {/* ─── HISTORIAL DE INSULINA ───────────────────────────────── */}
            <div className="card">
              <div className="card-header-row">
                <div>
                  <h3 style={{ margin: 0 }}>💉 Historial de Insulina</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Inicio: <strong>{paciente.tipo_insulina || "—"}</strong> (prolongada) · <strong>{paciente.tipo_insulina_2 || "—"}</strong> (corta)
                  </p>
                </div>
              </div>
              <div className="table-wrapper" style={{ marginTop: 12 }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th className="hide-tablet">Insulina prolongada</th>
                      <th>D. Prol.</th>
                      <th className="hide-tablet">Insulina corta</th>
                      <th>D. Corta</th>
                      <th style={{ color: "#6366f1", fontWeight: 700 }}>DDT (UI)</th>
                      <th className="hide-mobile">FSI</th>
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
                        <td>{r.dosis_prolongada_u != null ? `${Math.round(Number(r.dosis_prolongada_u))} UI` : "—"}</td>
                        <td className="hide-tablet">{r.insulina_corta || "—"}</td>
                        <td>{r.dosis_corta_u != null ? `${Math.round(Number(r.dosis_corta_u))} UI` : "—"}</td>
                        <td style={{ fontWeight: 700, color: "#6366f1" }}>
                          {r.dosis_total_u != null
                            ? `${Math.round(Number(r.dosis_total_u))} UI`
                            : (r.dosis_prolongada_u != null || r.dosis_corta_u != null)
                              ? `${Math.round((r.dosis_prolongada_u ?? 0) + (r.dosis_corta_u ?? 0))} UI`
                              : "—"}
                        </td>
                        <td className="hide-mobile" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {r.dosis_total_u > 0
                            ? `${Math.round(1700 / r.dosis_total_u)} mg/dL/UI`
                            : (r.dosis_prolongada_u != null || r.dosis_corta_u != null)
                              ? (() => { const t = (r.dosis_prolongada_u ?? 0) + (r.dosis_corta_u ?? 0); return t > 0 ? `${Math.round(1700 / t)} mg/dL/UI` : "—"; })()
                              : "—"}
                        </td>
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
                      <tr><td colSpan={10} className="empty-cell">Sin registros de insulina. Añade el primero →</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB: ALIMENTACIÓN ─────────────────────────────────────────── */}
        {tabActiva === "consultas" && (
          <div className="card">
            {printConsultaId && (
              <ConsultaPrintModal consultaId={printConsultaId} onClose={() => setPrintConsultaId(null)} />
            )}
            <div className="card-header-row">
              <h3 style={{ margin: 0 }}>📋 Historial de Consultas ({consultas.length})</h3>
              <Link
                to={`/consultas/nueva?paciente_id=${id}`}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <FiPlus size={15} /> Nueva consulta
              </Link>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th className="hide-mobile">Glucosa ayunas</th>
                    <th className="hide-mobile">HbA1c</th>
                    <th className="hide-mobile">Peso</th>
                    <th className="hide-mobile">Próxima cita</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map(c => (
                    <tr key={c.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{c.fecha?.split("T")[0]}</td>
                      <td><span className={`badge ${TIPO_BADGE[c.tipo_consulta] || "badge-gray"}`}>{c.tipo_consulta}</span></td>
                      <td className="hide-mobile">{c.glucosa_ayunas != null ? `${c.glucosa_ayunas} mg/dL` : "—"}</td>
                      <td className="hide-mobile">{c.hba1c != null ? `${c.hba1c}%` : "—"}</td>
                      <td className="hide-mobile">{c.peso != null ? `${c.peso} kg` : "—"}</td>
                      <td className="hide-mobile">{c.proxima_cita?.split("T")[0] || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => setPrintConsultaId(c.id)}
                            className="btn btn-sm btn-outline"
                            title="Imprimir consulta"
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <FiPrinter size={13} />
                          </button>
                          <button
                            onClick={() => navigate(`/consultas/${c.id}/editar`)}
                            className="btn btn-sm btn-outline"
                          >Editar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {consultas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        Sin consultas registradas. <Link to={`/consultas/nueva?paciente_id=${id}`}>Añadir primera →</Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: CURVAS DE CRECIMIENTO ─────────────────────────────── */}
        {tabActiva === "crecimiento" && (
          <TabCrecimiento
            paciente={paciente}
            crecimiento={crecimiento}
            isMobile={isMobile}
            isTablet={isTablet}
            tabGrafica={tabGraficaCrec}
            setTabGrafica={setTabGraficaCrec}
            refOMS={refOMS}
            setRefOMS={setRefOMS}
            onNuevo={abrirNuevoCrec}
            onEditar={abrirEditarCrec}
            onEliminar={setEliminarCrec}
          />
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

      {/* ── Modal crecimiento: crear / editar ──────────────────────── */}
      {modalCrecimiento && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: isMobile ? "20px 16px" : "28px 28px", maxWidth: 560, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", marginTop: isMobile ? 8 : 24 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>📏</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>
                    {editCrecimiento ? "Editar medición" : "Registrar medición"}
                  </h3>
                  {paciente?.fecha_nacimiento && formCrec.edad_meses !== "" && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>
                      Edad: {formCrec.edad_meses} {Number(formCrec.edad_meses) === 1 ? "mes" : "meses"}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setModalCrecimiento(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1, padding: "0 4px" }}>✕</button>
            </div>

            {/* Fila: Fecha */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>FECHA *</label>
              <input type="date" name="fecha" value={formCrec.fecha || ""} onChange={cambiarFormCrec}
                style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem" }} />
            </div>

            {/* Fila: Peso + Talla + PC */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>PESO (KG)</label>
                <input type="number" step="0.001" name="peso_kg" value={formCrec.peso_kg ?? ""} onChange={cambiarFormCrec} min={0} placeholder="Ej: 7.5"
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>TALLA (CM)</label>
                <input type="number" step="0.1" name="talla_cm" value={formCrec.talla_cm ?? ""} onChange={cambiarFormCrec} min={0} placeholder="Ej: 68.5"
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem" }} />
              </div>
              <div style={isMobile ? { gridColumn: "span 2" } : {}}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>P. CEFÁLICO (CM)</label>
                <input type="number" step="0.1" name="pc_cm" value={formCrec.pc_cm ?? ""} onChange={cambiarFormCrec} min={0} placeholder="Ej: 43.2"
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.95rem" }} />
              </div>
            </div>

            {/* Preview Z-scores calculados automáticamente */}
            {zPreview && Object.keys(zPreview).some(k => k.startsWith("zscore")) && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", marginBottom: 8 }}>
                  📊 Z-SCORES OMS CALCULADOS AUTOMÁTICAMENTE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                  {[
                    { key: "zscore_peso_edad",  label: "Peso/Edad",   est: "estado_peso_edad" },
                    { key: "zscore_talla_edad", label: "Talla/Edad",  est: "estado_talla_edad" },
                    { key: "zscore_imc_edad",   label: "IMC/Edad",    est: "estado_imc_edad" },
                    { key: "zscore_pc_edad",    label: "P.C./Edad",   est: "estado_pc_edad" },
                  ].filter(c => zPreview[c.key] != null).map(c => {
                    const z = zPreview[c.key];
                    const est = zPreview[c.est];
                    const col = !est ? "#94a3b8" : est.includes("severa") || est.includes("Obesi") || est.includes("Micro") || est.includes("Macro") ? "#dc2626" : est.includes("oderad") || est.includes("riesgo") || est.includes("baja") || est.includes("Delga") ? "#d97706" : "#16a34a";
                    return (
                      <div key={c.key} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: `1.5px solid ${col}20` }}>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginBottom: 2 }}>{c.label}</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: col }}>{z}</div>
                        {est && <div style={{ fontSize: "0.62rem", color: col, fontWeight: 600, marginTop: 1, lineHeight: 1.2 }}>{est}</div>}
                      </div>
                    );
                  })}
                  {zPreview.imc != null && (
                    <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1.5px solid #6366f120" }}>
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginBottom: 2 }}>IMC</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#6366f1" }}>{zPreview.imc}</div>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>kg/m²</div>
                    </div>
                  )}
                </div>
                {Number(formCrec.edad_meses) > 60 && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "#f59e0b" }}>
                    ⚠️ Edad &gt; 60 meses — se aplican estándares OMS 0–5 años. Para 5–19 años usa tablas específicas.
                  </p>
                )}
              </div>
            )}

            {/* Notas */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>NOTAS</label>
              <textarea name="observaciones" value={formCrec.observaciones || ""} onChange={cambiarFormCrec} rows={2}
                placeholder="Observaciones opcionales..."
                style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.875rem", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setModalCrecimiento(false)} disabled={guardandoCrec}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarCrec} disabled={guardandoCrec || !formCrec.fecha}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {guardandoCrec ? "Guardando…" : <><span>💾</span> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar crecimiento ────────────────────── */}
      {eliminarCrec && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px", maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px" }}>¿Eliminar registro?</h3>
            <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 20 }}>
              Registro del {eliminarCrec.fecha?.split("T")[0] || eliminarCrec.fecha}. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setEliminarCrec(null)} disabled={eliminandoCrec}>Cancelar</button>
              <button onClick={confirmarEliminarCrec} disabled={eliminandoCrec} style={{ background: eliminandoCrec ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: "pointer" }}>
                {eliminandoCrec ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label>Dosis prolongada (UI)</label>
                <input type="number" min="0" step="0.1" value={formInsulina.dosis_prolongada_u ?? ""} onChange={e => actualizarDosisInsulina("dosis_prolongada_u", e.target.value)} placeholder="Ej: 10" />
              </div>
              <div className="form-group">
                <label>Insulina acción corta</label>
                <input value={formInsulina.insulina_corta || ""} onChange={e => setFormInsulina(f => ({ ...f, insulina_corta: e.target.value }))} placeholder="Ej: Lispro, Aspart…" />
              </div>
              <div className="form-group">
                <label>Dosis corta (UI)</label>
                <input type="number" min="0" step="0.1" value={formInsulina.dosis_corta_u ?? ""} onChange={e => actualizarDosisInsulina("dosis_corta_u", e.target.value)} placeholder="Ej: 8" />
              </div>
              <div className="form-group">
                <label style={{ color: "#6366f1", fontWeight: 700 }}>DDT — Dosis Diaria Total (UI)</label>
                <input
                  type="number" readOnly
                  value={formInsulina.dosis_total_u ?? ""}
                  style={{ background: "#f1f5f9", color: "#6366f1", fontWeight: 700, cursor: "not-allowed" }}
                  title="Calculado automáticamente: prolongada + corta"
                />
              </div>
              <div className="form-group">
                <label style={{ color: "#64748b" }}>FSI estimado (mg/dL/UI)</label>
                <input
                  type="text" readOnly
                  value={formInsulina.dosis_total_u > 0 ? `${Math.round(1700 / formInsulina.dosis_total_u)} mg/dL/UI` : "—"}
                  style={{ background: "#f1f5f9", color: "#64748b", cursor: "not-allowed", fontSize: "0.88rem" }}
                  title="Factor de Sensibilidad a la Insulina: 1700 / DDT"
                />
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
      {/* ── Modal WhatsApp individual ────────────────────────────────────── */}
      {modalWhatsApp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px", maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#0f172a" }}>
                <IoLogoWhatsapp size={22} color="#25d366" /> Enviar WhatsApp
              </h3>
              <button onClick={() => setModalWhatsApp(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            <p style={{ margin: "0 0 4px", fontSize: "0.82rem", color: "#64748b" }}>
              Destinatario: <strong style={{ color: "#0f172a" }}>{paciente.nombre}</strong>
            </p>
            <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#64748b" }}>
              Teléfono: <strong style={{ color: "#0f172a" }}>{paciente.telefono || paciente.telefono_tutor || "Sin teléfono registrado"}</strong>
            </p>

            {!paciente.telefono && !paciente.telefono_tutor ? (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem", color: "#dc2626" }}>
                Este paciente no tiene teléfono ni teléfono de tutor registrado. Edita el paciente para agregarlo.
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "#374151", marginBottom: "0.35rem" }}>
                  Mensaje *
                </label>
                <textarea
                  rows={5}
                  value={msgWhatsApp}
                  onChange={e => setMsgWhatsApp(e.target.value)}
                  placeholder="Escribe el mensaje aquí…"
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", resize: "vertical", fontFamily: "inherit", marginBottom: "1rem" }}
                />

                {resultadoWA?.ok && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "#16a34a", marginBottom: "0.75rem" }}>
                    ✅ Mensaje enviado correctamente
                  </div>
                )}
                {resultadoWA?.ok === false && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "#dc2626", marginBottom: "0.75rem" }}>
                    ❌ {resultadoWA.error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" onClick={() => setModalWhatsApp(false)} disabled={enviandoWA}>Cancelar</button>
                  <button
                    onClick={enviarWhatsAppIndividual}
                    disabled={enviandoWA || !msgWhatsApp.trim()}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: enviandoWA ? "#86efac" : "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: enviandoWA ? "not-allowed" : "pointer" }}
                  >
                    <IoLogoWhatsapp size={16} /> {enviandoWA ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CURVAS DE CRECIMIENTO
// ─────────────────────────────────────────────────────────────────────────────

// Curvas OMS simplificadas: percentiles 3, 15, 50, 85, 97 por edad en meses
// Datos representativos para las 5 gráficas (0-60 meses para niños y niñas mixto)
// Se usan como líneas de referencia en las gráficas de evolución del paciente

const OMS_CURVES = {
  // PESO/EDAD (kg) — 0-60 meses, promedio niño+niña
  peso_edad: {
    etiqueta: "Peso / Edad",
    unidad: "kg",
    campo: "peso_kg",
    xLabel: "Edad (meses)",
    yDomain: [0, 30],
    color: "#6366f1",
    refs: [
      { label: "Normal (±1 DE)", color: "#10b981" },
      { label: "Riesgo (±2 DE)",  color: "#f59e0b" },
      { label: "Alerta (±3 DE)",  color: "#ef4444" },
    ],
    // [edadMeses, p3, p15, p50, p85, p97]
    puntos: [
      [0, 2.5, 2.9, 3.3, 3.9, 4.3],
      [3, 4.9, 5.5, 6.2, 7.0, 7.7],
      [6, 6.1, 6.9, 7.9, 8.8, 9.7],
      [9, 7.2, 8.1, 9.2, 10.2, 11.1],
      [12, 7.8, 8.9, 10.2, 11.3, 12.3],
      [18, 8.8, 10.1, 11.5, 12.8, 13.9],
      [24, 9.7, 11.1, 12.7, 14.1, 15.3],
      [30, 10.5, 12.0, 13.8, 15.4, 16.8],
      [36, 11.2, 12.9, 14.9, 16.7, 18.3],
      [48, 12.7, 14.7, 17.0, 19.3, 21.2],
      [60, 14.1, 16.4, 19.2, 21.9, 24.2],
    ],
  },
  // TALLA/EDAD (cm)
  talla_edad: {
    etiqueta: "Talla / Edad",
    unidad: "cm",
    campo: "talla_cm",
    xLabel: "Edad (meses)",
    yDomain: [40, 130],
    color: "#0ea5e9",
    refs: [
      { label: "Normal (±1 DE)", color: "#10b981" },
      { label: "Riesgo (±2 DE)",  color: "#f59e0b" },
      { label: "Alerta (±3 DE)",  color: "#ef4444" },
    ],
    puntos: [
      [0, 45.5, 47.5, 49.9, 52.3, 54.0],
      [3, 56.7, 58.9, 61.4, 63.9, 65.8],
      [6, 63.0, 65.3, 67.6, 70.3, 72.0],
      [9, 68.0, 70.3, 72.7, 75.2, 77.1],
      [12, 71.8, 74.2, 76.8, 79.5, 81.5],
      [18, 78.3, 80.9, 83.6, 86.4, 88.3],
      [24, 82.5, 85.4, 88.3, 91.3, 93.4],
      [30, 86.6, 89.6, 92.9, 96.0, 98.3],
      [36, 89.7, 92.9, 96.4, 99.7, 102.2],
      [48, 95.8, 99.4, 103.3, 107.1, 109.8],
      [60, 101.4, 105.3, 109.4, 113.6, 116.5],
    ],
  },
  // IMC/EDAD (kg/m²)
  imc_edad: {
    etiqueta: "IMC / Edad",
    unidad: "kg/m²",
    campo: "imc",
    xLabel: "Edad (meses)",
    yDomain: [10, 24],
    color: "#8b5cf6",
    refs: [
      { label: "Normal (±1 DE)", color: "#10b981" },
      { label: "Riesgo (±2 DE)",  color: "#f59e0b" },
      { label: "Alerta (±3 DE)",  color: "#ef4444" },
    ],
    puntos: [
      [0, 11.1, 12.2, 13.4, 14.8, 15.7],
      [3, 13.0, 14.2, 15.7, 17.3, 18.4],
      [6, 14.0, 15.2, 16.6, 18.1, 19.3],
      [9, 14.2, 15.4, 16.7, 18.2, 19.2],
      [12, 14.1, 15.2, 16.6, 18.0, 19.0],
      [18, 13.9, 15.0, 16.4, 17.8, 18.8],
      [24, 13.8, 14.9, 16.3, 17.7, 18.8],
      [36, 13.5, 14.7, 16.0, 17.5, 18.7],
      [48, 13.2, 14.4, 15.7, 17.3, 18.7],
      [60, 13.0, 14.2, 15.5, 17.2, 18.7],
    ],
  },
  // PESO/TALLA (kg por cm)
  peso_talla: {
    etiqueta: "Peso / Talla",
    unidad: "kg",
    campo: "peso_kg",
    xLabel: "Talla (cm)",
    xCampo: "talla_cm",
    yDomain: [2, 30],
    color: "#f59e0b",
    refs: [
      { label: "Normal (±1 DE)", color: "#10b981" },
      { label: "Riesgo (±2 DE)",  color: "#f59e0b" },
      { label: "Alerta (±3 DE)",  color: "#ef4444" },
    ],
    // [tallaCm, p3, p15, p50, p85, p97]
    puntos: [
      [45, 1.9, 2.1, 2.4, 2.7, 3.0],
      [50, 2.7, 3.0, 3.4, 3.9, 4.2],
      [55, 3.6, 4.0, 4.5, 5.2, 5.7],
      [60, 5.0, 5.5, 6.2, 7.1, 7.8],
      [65, 6.1, 6.8, 7.6, 8.6, 9.4],
      [70, 7.1, 7.8, 8.7, 9.8, 10.6],
      [75, 8.0, 8.8, 9.9, 11.0, 12.0],
      [80, 8.9, 9.8, 11.0, 12.3, 13.4],
      [85, 9.8, 10.9, 12.2, 13.7, 15.0],
      [90, 10.8, 12.0, 13.5, 15.2, 16.7],
      [95, 11.8, 13.1, 14.8, 16.7, 18.5],
      [100, 12.9, 14.4, 16.3, 18.5, 20.5],
      [110, 15.4, 17.3, 19.7, 22.5, 25.2],
    ],
  },
  // PERÍMETRO CEFÁLICO/EDAD (cm)
  pc_edad: {
    etiqueta: "Per. Cefálico / Edad",
    unidad: "cm",
    campo: "pc_cm",
    xLabel: "Edad (meses)",
    yDomain: [28, 56],
    color: "#ec4899",
    refs: [
      { label: "Normal (±1 DE)", color: "#10b981" },
      { label: "Riesgo (±2 DE)",  color: "#f59e0b" },
      { label: "Alerta (±3 DE)",  color: "#ef4444" },
    ],
    puntos: [
      [0, 31.5, 32.7, 34.0, 35.4, 36.4],
      [3, 37.2, 38.4, 39.8, 41.2, 42.2],
      [6, 40.5, 41.7, 43.0, 44.4, 45.4],
      [9, 42.5, 43.7, 45.0, 46.3, 47.3],
      [12, 43.8, 45.0, 46.3, 47.6, 48.6],
      [18, 45.5, 46.7, 47.9, 49.2, 50.2],
      [24, 46.5, 47.7, 49.0, 50.2, 51.2],
      [36, 47.5, 48.7, 49.9, 51.2, 52.1],
      [48, 48.2, 49.4, 50.5, 51.8, 52.8],
      [60, 48.7, 49.9, 51.0, 52.3, 53.3],
    ],
  },
};

// ── WHO Growth Reference 2007 (5–19 años) ─────────────────────────────────
const OMS_CURVES_5_19 = {
  // PESO/EDAD (kg) — 5-10 años (WHO 2007 solo hasta 10a para peso)
  peso_edad: {
    etiqueta: "Peso / Edad",
    unidad: "kg",
    campo: "peso_kg",
    xLabel: "Edad",
    yDomain: [10, 80],
    color: "#6366f1",
    nota: "⚠️ Solo hasta 10a (OMS) · WHO Growth Ref. 2007",
    puntos: [
      [60, 13.9, 16.1, 18.9, 21.6, 24.0],
      [66, 14.8, 17.2, 20.2, 23.3, 26.0],
      [72, 15.7, 18.3, 21.7, 25.3, 28.4],
      [78, 16.6, 19.5, 23.3, 27.4, 31.1],
      [84, 17.6, 20.8, 25.0, 29.8, 34.3],
      [90, 18.6, 22.1, 26.8, 32.4, 37.9],
      [96, 19.7, 23.6, 28.8, 35.4, 42.4],
      [102, 20.8, 25.1, 31.0, 38.6, 47.3],
      [108, 22.0, 26.7, 33.3, 42.1, 52.8],
      [114, 23.3, 28.4, 35.8, 45.7, 58.9],
      [120, 24.7, 30.2, 38.5, 49.8, 65.5],
    ],
  },
  // TALLA/EDAD (cm) — 5-19 años (WHO 2007)
  talla_edad: {
    etiqueta: "Talla / Edad",
    unidad: "cm",
    campo: "talla_cm",
    xLabel: "Edad",
    yDomain: [95, 210],
    color: "#0ea5e9",
    nota: "📐 Estatura — WHO Growth Ref. 2007 (5–19 años)",
    puntos: [
      [60,  101.5, 105.4, 109.5, 113.7, 116.7],
      [72,  107.4, 111.5, 116.0, 120.4, 123.7],
      [84,  113.2, 117.6, 122.5, 127.2, 130.8],
      [96,  119.0, 123.8, 129.0, 134.0, 137.9],
      [108, 124.5, 129.8, 135.4, 140.7, 145.0],
      [120, 130.0, 135.9, 142.0, 147.7, 152.3],
      [132, 135.6, 142.0, 148.5, 154.9, 159.9],
      [144, 141.2, 148.2, 155.3, 162.3, 167.7],
      [156, 147.0, 154.5, 162.0, 169.6, 175.5],
      [168, 152.5, 160.6, 168.5, 176.6, 183.0],
      [180, 157.7, 166.1, 174.2, 182.7, 189.4],
      [192, 162.1, 170.8, 179.0, 187.8, 194.7],
      [204, 165.6, 174.3, 182.6, 191.5, 198.5],
      [216, 168.1, 176.9, 185.2, 194.2, 201.1],
      [228, 169.7, 178.6, 187.0, 196.0, 202.9],
    ],
  },
  // IMC/EDAD (kg/m²) — 5-19 años (WHO 2007)
  imc_edad: {
    etiqueta: "IMC / Edad",
    unidad: "kg/m²",
    campo: "imc",
    xLabel: "Edad",
    yDomain: [10, 40],
    color: "#8b5cf6",
    nota: "📐 IMC — WHO Growth Ref. 2007 (5–19 años)",
    puntos: [
      [60,  12.9, 14.2, 15.5, 17.3, 18.9],
      [72,  12.6, 13.9, 15.2, 17.1, 18.8],
      [84,  12.5, 13.8, 15.1, 17.1, 18.9],
      [96,  12.5, 13.8, 15.3, 17.4, 19.7],
      [108, 12.7, 14.0, 15.7, 18.0, 20.8],
      [120, 12.9, 14.3, 16.2, 18.9, 22.0],
      [132, 13.3, 14.7, 16.8, 19.9, 23.5],
      [144, 13.7, 15.3, 17.6, 21.1, 25.2],
      [156, 14.2, 15.9, 18.4, 22.3, 27.0],
      [168, 14.7, 16.6, 19.3, 23.6, 28.9],
      [180, 15.2, 17.2, 20.2, 24.8, 30.7],
      [192, 15.7, 17.8, 21.1, 25.9, 32.4],
      [204, 16.1, 18.4, 21.9, 27.0, 33.9],
      [216, 16.5, 18.9, 22.7, 28.0, 35.3],
      [228, 16.9, 19.4, 23.5, 29.0, 36.7],
    ],
  },
  // Peso/Talla y PC — reutiliza datos 0-5 (no hay referencia WHO 5-19 para estos)
  peso_talla: null,
  pc_edad:    null,
};

function colorEstado(estado) {
  if (!estado) return "#94a3b8";
  const s = estado.toLowerCase();
  if (s.includes("severa") || s.includes("muy alto") || s.includes("alto riesgo") || s.includes("obesi") || s.includes("macro") || s.includes("micro")) return "#dc2626";
  if (s.includes("moderada") || s.includes("riesgo") || s.includes("sobrepeso") || s.includes("baja") || s.includes("delgadez")) return "#d97706";
  if (s.includes("normal")) return "#16a34a";
  return "#6366f1";
}

function BadgeEstado({ estado }) {
  if (!estado) return <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Sin datos</span>;
  const color = colorEstado(estado);
  const bg = color === "#dc2626" ? "#fef2f2" : color === "#d97706" ? "#fffbeb" : color === "#16a34a" ? "#f0fdf4" : "#ede9fe";
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {estado.toUpperCase()}
    </span>
  );
}

function TabCrecimiento({ paciente, crecimiento, isMobile, isTablet, tabGrafica, setTabGrafica, refOMS, setRefOMS, onNuevo, onEditar, onEliminar }) {
  const tabs5 = [
    { key: "peso_edad",  label: isMobile ? "Peso" : "Peso / Edad" },
    { key: "talla_edad", label: isMobile ? "Talla" : "Talla / Edad" },
    { key: "peso_talla", label: isMobile ? "P/Talla" : "Peso / Talla" },
    { key: "imc_edad",   label: "IMC" },
    { key: "pc_edad",    label: isMobile ? "P.C." : "Per. Cefálico" },
  ];

  const [dropPrint, setDropPrint] = useState(false);
  const [dropDL,    setDropDL]    = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const chartRef = useRef(null);

  // Seleccionar dataset según referencia activa (fallback a 0-5 si no hay datos 5-19)
  const curva = (refOMS === "5_19" && OMS_CURVES_5_19[tabGrafica])
    ? OMS_CURVES_5_19[tabGrafica]
    : OMS_CURVES[tabGrafica];

  // Formateador de ticks x para 5-19 años (meses → "5a", "6a"…)
  const xTickFmt = refOMS === "5_19" ? (v => `${Math.floor(v / 12)}a`) : undefined;

  // Dominio fijo del eje X para que 5-19 siempre muestre el rango completo
  const xDomain = (() => {
    if (refOMS !== "5_19" || curva.xCampo) return ["dataMin", "dataMax"];
    // peso_edad WHO 2007 solo tiene datos hasta 120m (10a)
    const maxX = (OMS_CURVES_5_19[tabGrafica]?.puntos?.at(-1)?.[0]) ?? 228;
    return [60, maxX];
  })();
  const xTickCount = (() => {
    if (isMobile) return 5;
    if (refOMS !== "5_19" || curva.xCampo) return 9;
    const [xMin, xMax] = xDomain;
    return Math.floor((xMax - xMin) / 12) + 1;
  })();

  // ── Helpers z-score ──────────────────────────────────────────────────────
  const indicadorActivo = tabGrafica === "peso_edad" ? "zscore_peso_edad"
    : tabGrafica === "talla_edad" ? "zscore_talla_edad"
    : tabGrafica === "imc_edad"   ? "zscore_imc_edad"
    : tabGrafica === "pc_edad"    ? "zscore_pc_edad"
    : null;
  const estadoActivo = tabGrafica === "peso_edad" ? "estado_peso_edad"
    : tabGrafica === "talla_edad" ? "estado_talla_edad"
    : tabGrafica === "imc_edad"   ? "estado_imc_edad"
    : tabGrafica === "pc_edad"    ? "estado_pc_edad"
    : null;
  const percentilActivo = tabGrafica === "peso_edad" ? "percentil_peso_edad"
    : tabGrafica === "talla_edad" ? "percentil_talla_edad"
    : tabGrafica === "imc_edad"   ? "percentil_imc_edad"
    : tabGrafica === "pc_edad"    ? "percentil_pc_edad"
    : null;

  // ── Chart data builder ───────────────────────────────────────────────────
  const buildChartData = useCallback((curvaObj) => {
    const pts = [...crecimiento]
      .filter(r => r[curvaObj.campo] != null)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map(r => {
        const x = curvaObj.xCampo ? Number(r[curvaObj.xCampo]) : Number(r.edad_meses);
        return { x, y: Number(r[curvaObj.campo]), fecha: r.fecha?.split("T")[0] || r.fecha };
      })
      .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x >= 0);

    const [p3s, p15s, p50s, p85s, p97s] = [[], [], [], [], []];
    curvaObj.puntos.forEach(([xVal, p3, p15, p50, p85, p97]) => {
      p3s.push({ x: xVal, y: p3 }); p15s.push({ x: xVal, y: p15 });
      p50s.push({ x: xVal, y: p50 }); p85s.push({ x: xVal, y: p85 });
      p97s.push({ x: xVal, y: p97 });
    });
    const interp = (puntos, x) => {
      if (!puntos.length) return null;
      const a2 = puntos.filter(p => p.x <= x), b2 = puntos.filter(p => p.x >= x);
      if (!a2.length) return puntos[0].y;
      if (!b2.length) return puntos[puntos.length - 1].y;
      const p1 = a2[a2.length - 1], p2 = b2[0];
      if (p1.x === p2.x) return p1.y;
      return p1.y + (p2.y - p1.y) * (x - p1.x) / (p2.x - p1.x);
    };
    const allX = [...new Set([...curvaObj.puntos.map(p => p[0]), ...pts.map(p => p.x)])].sort((a, b) => a - b);
    return allX.map(x => {
      const pt = pts.find(p => p.x === x);
      return {
        x,
        p3:  parseFloat(interp(p3s, x)?.toFixed(2)),
        p15: parseFloat(interp(p15s, x)?.toFixed(2)),
        p50: parseFloat(interp(p50s, x)?.toFixed(2)),
        p85: parseFloat(interp(p85s, x)?.toFixed(2)),
        p97: parseFloat(interp(p97s, x)?.toFixed(2)),
        paciente: pt ? parseFloat(pt.y.toFixed(3)) : undefined,
        fecha: pt?.fecha,
      };
    });
  }, [crecimiento]);

  const puntosPaciente = [...crecimiento]
    .filter(r => r[curva.campo] != null)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .map(r => {
      const x = curva.xCampo ? Number(r[curva.xCampo]) : Number(r.edad_meses);
      const y = Number(r[curva.campo]);
      return { x, y, fecha: r.fecha?.split("T")[0] || r.fecha, id: r.id };
    })
    .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x >= 0);

  const chartData = buildChartData(curva);

  const chartHeight = isMobile ? 200 : isTablet ? 240 : 290;
  const chartLeft   = isMobile ? -24 : -10;
  const chartRight  = isMobile ? 4 : 12;

  // ── Generar HTML para impresión/PDF ──────────────────────────────────────
  function buildPrintHTML(titulo, chartImgBase64, curvaObj, modo) {
    const fecha = new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" });
    const sexoLabel = paciente.sexo === "F" ? "Femenino" : "Masculino";
    const edadLabel = (() => {
      if (!paciente.fecha_nacimiento) return "—";
      const n = new Date(paciente.fecha_nacimiento);
      const hoy = new Date();
      const y = hoy.getFullYear() - n.getFullYear();
      const m = hoy.getMonth() - n.getMonth();
      return m < 0 ? `${y - 1} años ${12 + m} meses` : `${y} años ${m} meses`;
    })();

    const tablaHistorial = [...crecimiento].reverse().map(r => {
      const fmtFecha = r.fecha ? new Date(String(r.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
      const edad = r.edad_meses != null ? (r.edad_meses < 24 ? `${r.edad_meses}m` : `${Math.floor(r.edad_meses / 12)}a ${r.edad_meses % 12}m`) : "—";
      const zCol = (campo, estado) => {
        const v = r[campo]; if (v == null) return "<td style='color:#cbd5e1'>—</td>";
        const col = colorEstadoStr(r[estado]);
        return `<td style="font-weight:700;color:${col}">${Number(v).toFixed(2)}</td>`;
      };
      return `<tr>
        <td>${fmtFecha}</td><td>${edad}</td>
        <td>${r.peso_kg != null ? Number(r.peso_kg).toFixed(2) : "—"}</td>
        <td>${r.talla_cm != null ? Number(r.talla_cm).toFixed(1) : "—"}</td>
        <td>${r.imc != null ? Number(r.imc).toFixed(1) : "—"}</td>
        <td>${r.pc_cm != null ? Number(r.pc_cm).toFixed(1) : "—"}</td>
        ${zCol("zscore_peso_edad","estado_peso_edad")}
        ${zCol("zscore_talla_edad","estado_talla_edad")}
        ${zCol("zscore_imc_edad","estado_imc_edad")}
        ${zCol("zscore_pc_edad","estado_pc_edad")}
      </tr>`;
    }).join("");

    return `<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>Curva de Crecimiento — ${paciente.nombre}</title>
      <style>
        @page { size: A4 landscape; margin: 15mm 15mm 20mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #6366f1; margin-bottom: 14px; }
        .header-left h1 { font-size: 18px; font-weight: 800; color: #4f46e5; margin-bottom: 2px; }
        .header-left p { font-size: 10px; color: #64748b; }
        .header-right { text-align: right; font-size: 9px; color: #64748b; }
        .header-right strong { display: block; font-size: 11px; color: #1e293b; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 700; }
        .badge-ok   { background: #dcfce7; color: #15803d; }
        .badge-warn { background: #fef9c3; color: #a16207; }
        .badge-bad  { background: #fee2e2; color: #b91c1c; }
        .info-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 14px; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
        .info-card .label { font-size: 8.5px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 3px; }
        .info-card .value { font-size: 13px; font-weight: 700; color: #0f172a; }
        .info-card .sub { font-size: 8px; color: #64748b; margin-top: 2px; }
        .chart-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; margin-bottom: 14px; }
        .chart-wrap img { width: 100%; display: block; }
        .leyenda { display: flex; gap: 14px; align-items: center; margin-bottom: 8px; font-size: 9px; }
        .leyenda span { display: flex; align-items: center; gap: 4px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        thead tr { background: #4f46e5; color: #fff; }
        thead th { padding: 6px 8px; text-align: left; font-weight: 700; font-size: 8.5px; letter-spacing: .03em; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 6px 15mm; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; background: #fff; }
        .section-title { font-size: 11px; font-weight: 700; color: #4f46e5; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1.5px solid #e2e8f0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>
      <div class="header">
        <div class="header-left">
          <h1>📏 Curvas de Crecimiento OMS</h1>
          <p>${titulo} · Referencia ${refOMS === "5_19" ? "WHO 2007 (5–19 años)" : "OMS 2006 (0–5 años)"}</p>
        </div>
        <div class="header-right">
          <strong>${paciente.nombre || "—"}</strong>
          Exp: ${paciente.numero_expediente || "—"} · ${paciente.institucion || "—"}<br>
          Impreso: ${fecha}
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card"><div class="label">Paciente</div><div class="value" style="font-size:11px">${paciente.nombre || "—"}</div><div class="sub">Sexo: ${sexoLabel}</div></div>
        <div class="info-card"><div class="label">Edad</div><div class="value">${edadLabel}</div><div class="sub">Nac: ${paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString("es-GT") : "—"}</div></div>
        <div class="info-card"><div class="label">Mediciones</div><div class="value">${crecimiento.length}</div><div class="sub">Total registros</div></div>
        <div class="info-card"><div class="label">Expediente</div><div class="value">${paciente.numero_expediente || "—"}</div><div class="sub">${paciente.institucion || "—"}</div></div>
      </div>

      ${Array.isArray(chartImgBase64) ? chartImgBase64.map(({ img, curvaObj: co }) => `
        <div style="page-break-inside:avoid;margin-bottom:18px">
          <div class="section-title">${co.etiqueta} — ${paciente.sexo === "F" ? "Niñas" : "Niños"}</div>
          <div class="leyenda">
            <span><span style="display:inline-block;width:20px;height:2px;background:#10b981;border-radius:2px"></span> Mediana (P50)</span>
            <span><span style="display:inline-block;width:20px;height:2px;background:#f59e0b;border-radius:2px;border-top:1px dashed #f59e0b"></span> ±2 DE (P15/P85)</span>
            <span><span style="display:inline-block;width:20px;height:2px;background:#ef4444;border-radius:2px;border-top:1px dashed #ef4444"></span> ±3 DE (P3/P97)</span>
            <span><span class="dot" style="background:${co.color}"></span> ${paciente.nombre?.split(" ")[0] || "Paciente"}</span>
          </div>
          <div class="chart-wrap"><img src="${img}" /></div>
        </div>
      `).join("") : chartImgBase64 ? `
      <div class="section-title">${curvaObj.etiqueta} — ${paciente.sexo === "F" ? "Niñas" : "Niños"}</div>
      <div class="leyenda">
        <span><span style="display:inline-block;width:20px;height:2px;background:#10b981;border-radius:2px"></span> Mediana (P50)</span>
        <span><span style="display:inline-block;width:20px;height:2px;background:#f59e0b;border-radius:2px;border-top:1px dashed #f59e0b"></span> ±2 DE (P15/P85)</span>
        <span><span style="display:inline-block;width:20px;height:2px;background:#ef4444;border-radius:2px;border-top:1px dashed #ef4444"></span> ±3 DE (P3/P97)</span>
        <span><span class="dot" style="background:${curvaObj.color}"></span> ${paciente.nombre?.split(" ")[0] || "Paciente"}</span>
      </div>
      <div class="chart-wrap"><img src="${chartImgBase64}" /></div>
      ` : ""}

      <div class="section-title">🗓️ Historial de Mediciones</div>
      <table>
        <thead><tr>
          <th>Fecha</th><th>Edad</th><th>Peso (kg)</th><th>Talla (cm)</th><th>IMC</th><th>P.C. (cm)</th>
          <th>Z Peso/Edad</th><th>Z Talla/Edad</th><th>Z IMC/Edad</th><th>Z P.C./Edad</th>
        </tr></thead>
        <tbody>${tablaHistorial || "<tr><td colspan='10' style='text-align:center;color:#94a3b8;padding:12px'>Sin mediciones</td></tr>"}</tbody>
      </table>

      <div class="footer">
        <span>Evolucion Metabólica · Curvas de Crecimiento OMS</span>
        <span>${paciente.nombre} · ${fecha}</span>
      </div>
    </body></html>`;
  }

  // ── Reporte consolidado (5 curvas + resumen + historial) ──────────────────
  function buildConsolidadoHTML(chartImgs) {
    const fecha = new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" });
    const sexoLabel = paciente.sexo === "F" ? "femenino" : "masculino";
    const u = crecimiento.length > 0 ? crecimiento[0] : null;
    const edadStr = (() => {
      if (!paciente.fecha_nacimiento) return "—";
      const n = new Date(paciente.fecha_nacimiento + "T00:00:00"), hoy = new Date();
      let y = hoy.getFullYear() - n.getFullYear(), m = hoy.getMonth() - n.getMonth();
      if (m < 0) { y--; m += 12; }
      if (hoy.getDate() < n.getDate()) { m--; if (m < 0) { y--; m += 11; } }
      return `${y} años, ${m} meses`;
    })();
    const fechaNacStr = paciente.fecha_nacimiento
      ? new Date(paciente.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const ultimaFechaStr = u?.fecha ? new Date(String(u.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT") : "—";
    const zPTu = (u && u.peso_kg && u.talla_cm) ? calcularZScores({ peso_kg: u.peso_kg, talla_cm: u.talla_cm, edad_meses: u.edad_meses }, paciente.sexo) : null;

    const colZ = (est) => {
      if (!est) return "#64748b";
      const s = est.toLowerCase();
      if (s.includes("severa") || s.includes("obesi")) return "#dc2626";
      if (s.includes("moderada") || s.includes("riesgo") || s.includes("sobrepeso") || s.includes("baja")) return "#d97706";
      if (s.includes("normal")) return "#16a34a";
      return "#6366f1";
    };
    const badgeEst = (est) => {
      if (!est) return "<span style='color:#94a3b8'>—</span>";
      const col = colZ(est);
      const bg  = col === "#dc2626" ? "#fef2f2" : col === "#d97706" ? "#fffbeb" : col === "#16a34a" ? "#f0fdf4" : "#ede9fe";
      return `<span style="background:${bg};color:${col};border:1.5px solid ${col}40;padding:2px 8px;border-radius:99px;font-size:8px;font-weight:700">${est.toUpperCase()}</span>`;
    };

    const summaryIndicators = u ? [
      { label: "Peso / Edad",          val: u.peso_kg  ? `${Number(u.peso_kg).toFixed(1)} kg`   : "—", z: u.zscore_peso_edad,       p: u.percentil_peso_edad,      est: u.estado_peso_edad },
      { label: "Talla / Edad",         val: u.talla_cm ? `${Number(u.talla_cm).toFixed(1)} cm`  : "—", z: u.zscore_talla_edad,      p: u.percentil_talla_edad,     est: u.estado_talla_edad },
      { label: "Peso / Talla",         val: u.peso_kg  ? `${Number(u.peso_kg).toFixed(1)} kg`   : "—", z: zPTu?.zscore_peso_talla,  p: zPTu?.percentil_peso_talla, est: zPTu?.estado_peso_talla },
      { label: "IMC / Edad",           val: u.imc      ? `${Number(u.imc).toFixed(1)} kg/m²`    : "—", z: u.zscore_imc_edad,        p: u.percentil_imc_edad,       est: u.estado_imc_edad },
      { label: "Per. Cefálico / Edad", val: u.pc_cm    ? `${Number(u.pc_cm).toFixed(1)} cm`     : "—", z: u.zscore_pc_edad,         p: u.percentil_pc_edad,        est: u.estado_pc_edad },
    ] : [];
    const summaryHTML = summaryIndicators.map(ind => `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="font-weight:600;padding:8px 12px;font-size:10px">${ind.label}</td>
        <td style="padding:8px 12px;font-size:10px">${ind.val}</td>
        <td style="padding:8px 12px;font-weight:700;color:${colZ(ind.est)};font-size:10px">${ind.z != null ? Number(ind.z).toFixed(2) : "—"}</td>
        <td style="padding:8px 12px;font-size:10px">${ind.p || "—"}</td>
        <td style="padding:8px 12px">${badgeEst(ind.est)}</td>
      </tr>`).join("");

    const chartLabelMap = { peso_edad: "P/E", talla_edad: "T/E", peso_talla: "P/T", imc_edad: "IMC/E", pc_edad: "PC/E" };
    const ninoLabel = paciente.sexo === "F" ? "Niñas" : "Niños";
    const chartBoxes = chartImgs.map(({ img, curvaObj: co, key }) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#fff">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="background:#f1f5f9;color:#64748b;font-size:7.5px;font-weight:700;padding:2px 5px;border-radius:3px">${chartLabelMap[key] || ""}</span>
          <span style="font-size:10px;font-weight:700;color:#0f172a">${co.etiqueta} — ${ninoLabel}</span>
        </div>
        <img src="${img}" style="width:100%;display:block;border-radius:4px" />
      </div>`);
    const chartGridRows = [];
    for (let i = 0; i < chartBoxes.length; i += 2) {
      chartGridRows.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;page-break-inside:avoid">${chartBoxes[i]}${chartBoxes[i + 1] || "<div></div>"}</div>`);
    }

    const histRows = [...crecimiento].reverse().map((r, idx) => {
      const zPTr = (r.peso_kg && r.talla_cm) ? calcularZScores({ peso_kg: r.peso_kg, talla_cm: r.talla_cm, edad_meses: r.edad_meses }, paciente.sexo) : null;
      const fmtF = r.fecha ? new Date(String(r.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT") : "—";
      const ed   = r.edad_meses != null ? (r.edad_meses < 24 ? `${r.edad_meses}m` : `${Math.floor(r.edad_meses / 12)}a ${r.edad_meses % 12}m`) : "—";
      const zc   = (v, est) => v != null ? `<td style="font-weight:700;color:${colZ(est)};padding:5px 7px">${Number(v).toFixed(2)}</td>` : `<td style="color:#cbd5e1;padding:5px 7px">—</td>`;
      const bg   = idx % 2 === 1 ? "background:#f8fafc" : "";
      return `<tr style="${bg}">
        <td style="padding:5px 7px;white-space:nowrap;font-size:8.5px">${fmtF}</td>
        <td style="padding:5px 7px;white-space:nowrap;font-size:8.5px">${ed}</td>
        <td style="padding:5px 7px;font-size:8.5px">${r.peso_kg  != null ? Number(r.peso_kg).toFixed(3)  : "—"}</td>
        <td style="padding:5px 7px;font-size:8.5px">${r.talla_cm != null ? Number(r.talla_cm).toFixed(2) : "—"}</td>
        <td style="padding:5px 7px;font-size:8.5px">${r.imc      != null ? Number(r.imc).toFixed(1)      : "—"}</td>
        <td style="padding:5px 7px;font-size:8.5px">${r.pc_cm    != null ? Number(r.pc_cm).toFixed(1)    : "—"}</td>
        ${zc(r.zscore_peso_edad, r.estado_peso_edad)}
        ${zc(r.zscore_talla_edad, r.estado_talla_edad)}
        ${zc(zPTr?.zscore_peso_talla, zPTr?.estado_peso_talla)}
        ${zc(r.zscore_imc_edad, r.estado_imc_edad)}
        ${zc(r.zscore_pc_edad, r.estado_pc_edad)}
        <td style="padding:5px 7px;font-size:8px;color:#64748b;font-style:italic;max-width:160px">${r.observaciones || ""}</td>
      </tr>`;
    }).join("");

    const sectionTitle = (txt) => `<div style="font-size:9.5px;font-weight:700;color:#4f46e5;letter-spacing:.04em;text-transform:uppercase;padding:6px 10px;background:#f8fafc;border-left:3px solid #6366f1;margin-bottom:10px">${txt}</div>`;

    return `<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>Reporte Consolidado — Curvas de Crecimiento OMS</title>
      <style>
        @page { size: A4; margin: 12mm 15mm 18mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; background: #fff; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:3px solid #6366f1;margin-bottom:14px">
        <div>
          <div style="font-size:17px;font-weight:800;color:#4f46e5">✏️ Reporte Consolidado — Curvas de Crecimiento OMS</div>
          <div style="font-size:9.5px;color:#64748b;margin-top:3px">Paciente ${sexoLabel} · ${crecimiento.length} medicion${crecimiento.length !== 1 ? "es" : ""} registradas</div>
        </div>
        <div style="text-align:right;font-size:9px;color:#64748b;line-height:1.7">
          <div style="font-size:11px;font-weight:700;color:#4f46e5">Generado: ${fecha}</div>
          <div>F. Nac: ${fechaNacStr}</div>
          <div>Edad actual: ${edadStr}</div>
        </div>
      </div>
      ${u ? `
        ${sectionTitle(`RESUMEN — ÚLTIMA MEDICIÓN (${ultimaFechaStr})`)}
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead><tr>
            <th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid #e2e8f0">INDICADOR</th>
            <th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid #e2e8f0">VALOR</th>
            <th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid #e2e8f0">Z-SCORE</th>
            <th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid #e2e8f0">PERCENTIL</th>
            <th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid #e2e8f0">ESTADO</th>
          </tr></thead>
          <tbody>${summaryHTML}</tbody>
        </table>` : ""}
      ${sectionTitle("CURVAS DE CRECIMIENTO — ESTÁNDARES OMS")}
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px;font-size:8.5px;flex-wrap:wrap">
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:18px;height:2px;background:#10b981"></span> Normal (±1 DE)</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:18px;height:2px;background:#f59e0b"></span> Riesgo (±2 DE)</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:18px;height:2px;background:#ef4444"></span> Alerta (±3 DE)</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:8px;height:8px;background:#6366f1;border-radius:50%"></span> Paciente</span>
      </div>
      ${chartGridRows.join("")}
      ${sectionTitle("HISTORIAL COMPLETO DE MEDICIONES")}
      <table style="width:100%;border-collapse:collapse;font-size:8.5px">
        <thead><tr style="background:#4f46e5;color:#fff">
          <th style="padding:6px 8px;text-align:left;font-size:8px">FECHA</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">EDAD</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">PESO(KG)</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">TALLA(CM)</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">IMC</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">P.C.(CM)</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">Z P/E</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">Z T/E</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">Z P/T</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">Z IMC</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">Z PC</th>
          <th style="padding:6px 8px;text-align:left;font-size:8px">NOTAS</th>
        </tr></thead>
        <tbody>${histRows}</tbody>
      </table>
      <div style="position:fixed;bottom:0;left:0;right:0;padding:5px 15mm;font-size:8px;color:#94a3b8;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;background:#fff">
        <span>Estándares de Crecimiento OMS — Organización Mundial de la Salud</span>
        <span>Generado el ${fecha}</span>
      </div>
    </body></html>`;
  }

  function colorEstadoStr(estado) {
    if (!estado) return "#94a3b8";
    const s = estado.toLowerCase();
    if (s.includes("severa") || s.includes("muy alto") || s.includes("obesi")) return "#dc2626";
    if (s.includes("moderada") || s.includes("riesgo") || s.includes("sobrepeso") || s.includes("baja")) return "#d97706";
    if (s.includes("normal")) return "#16a34a";
    return "#6366f1";
  }

  // ── Capturar gráfica actual (SVG → Canvas para recharts) ───────────────────
  async function capturarGrafica() {
    if (!chartRef.current) return null;
    try {
      const svgEl = chartRef.current.querySelector("svg");
      if (svgEl) {
        const { width, height } = svgEl.getBoundingClientRect();
        if (width > 0 && height > 0) {
          return await new Promise((resolve) => {
            const canvas = document.createElement("canvas");
            canvas.width  = Math.round(width  * 2);
            canvas.height = Math.round(height * 2);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const serialized = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
            const url  = URL.createObjectURL(blob);
            const img  = new Image();
            img.onload  = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/png")); };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
          });
        }
      }
      // Fallback a html2canvas
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true, allowTaint: true });
      return canvas.toDataURL("image/png");
    } catch { return null; }
  }

  // Captura las 5 curvas ciclando los tabs
  async function capturarTodasLasGraficas() {
    const keys = ["peso_edad", "talla_edad", "peso_talla", "imc_edad", "pc_edad"];
    const tabOriginal = tabGrafica;
    const resultado = [];
    for (const key of keys) {
      const co = (refOMS === "5_19" && OMS_CURVES_5_19[key]) ? OMS_CURVES_5_19[key] : OMS_CURVES[key];
      if (!co) continue;
      setTabGrafica(key);
      await new Promise(r => setTimeout(r, 1000));
      const img = await capturarGrafica();
      if (img) resultado.push({ img, curvaObj: co, key });
    }
    setTabGrafica(tabOriginal);
    await new Promise(r => setTimeout(r, 600));
    return resultado;
  }

  // ── Imprimir ─────────────────────────────────────────────────────────────
  async function imprimir(modo) {
    setDropPrint(false);
    setGenerandoPDF(true);
    // Abrir la ventana ANTES del await para evitar que el popup blocker la bloquee
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) { alert("El navegador bloqueó la ventana emergente. Permite popups para este sitio."); setGenerandoPDF(false); return; }
    win.document.write("<html><body><p style='font-family:sans-serif;padding:40px;color:#64748b'>⏳ Generando reporte, por favor espera...</p></body></html>");
    try {
      let imgBase64 = null;
      if (modo === "curva") {
        imgBase64 = await capturarGrafica();
      } else if (modo === "consolidado") {
        imgBase64 = await capturarTodasLasGraficas();
      }
      const titulo = modo === "curva" ? curva.etiqueta : "Consolidado — Todas las curvas";
      const html = modo === "consolidado"
        ? buildConsolidadoHTML(imgBase64 || [])
        : buildPrintHTML(titulo, imgBase64, curva, modo);
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 1200);
    } catch (err) {
      win.close();
      console.error(err);
    } finally { setGenerandoPDF(false); }
  }

  // ── Descargar PDF ─────────────────────────────────────────────────────────
  async function descargarPDF(modo) {
    setDropDL(false);
    setGenerandoPDF(true);
    try {
      let imgBase64 = null;
      if (modo === "curva") {
        imgBase64 = await capturarGrafica();
      } else if (modo === "consolidado") {
        imgBase64 = await capturarTodasLasGraficas();
      }
      const titulo = modo === "curva" ? curva.etiqueta : "Consolidado";
      const html = modo === "consolidado"
        ? buildConsolidadoHTML(imgBase64 || [])
        : buildPrintHTML(titulo, imgBase64, curva, modo);

      const isPortrait = modo === "consolidado";
      const ifrW = isPortrait ? 900 : 1200;
      const ifrm = document.createElement("iframe");
      ifrm.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${ifrW}px;height:10000px;border:none;visibility:hidden;`;
      document.body.appendChild(ifrm);
      ifrm.contentDocument.write(html);
      ifrm.contentDocument.close();

      await new Promise(r => setTimeout(r, 1500));
      const fullH = ifrm.contentDocument.body.scrollHeight || 1400;
      ifrm.style.height = fullH + "px";
      await new Promise(r => setTimeout(r, 300));

      const canvasPDF = await html2canvas(ifrm.contentDocument.body, {
        scale: 1.6, backgroundColor: "#ffffff", logging: false,
        width: ifrW, height: fullH, windowWidth: ifrW, windowHeight: fullH,
      });
      document.body.removeChild(ifrm);

      const imgData = canvasPDF.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: isPortrait ? "portrait" : "landscape", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const ratio = canvasPDF.width / canvasPDF.height;
      const h = pW / ratio;

      if (h <= pH) {
        pdf.addImage(imgData, "PNG", 0, 0, pW, h);
      } else {
        // Múltiples páginas si el contenido es largo
        let y = 0;
        const srcH = canvasPDF.height;
        const sliceH = Math.floor(canvasPDF.width * (pH / pW));
        while (y < srcH) {
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvasPDF.width;
          sliceCanvas.height = Math.min(sliceH, srcH - y);
          const ctx = sliceCanvas.getContext("2d");
          ctx.drawImage(canvasPDF, 0, -y);
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, pW, pH);
          y += sliceH;
          if (y < srcH) pdf.addPage();
        }
      }

      const nombre = (paciente.nombre || "paciente").replace(/\s+/g, "_");
      pdf.save(`crecimiento_${modo === "curva" ? tabGrafica : "consolidado"}_${nombre}.pdf`);
    } catch (err) {
      alert("Error al generar el PDF. Intenta de nuevo.");
      console.error(err);
    } finally { setGenerandoPDF(false); }
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  function descargarCSV() {
    const enc = ["Fecha","Edad_meses","Peso_kg","Talla_cm","IMC","PC_cm",
      "Z_Peso_Edad","Z_Talla_Edad","Z_IMC_Edad","Z_PC_Edad",
      "Estado_Peso","Estado_Talla","Estado_IMC","Estado_PC"];
    const filas = [...crecimiento].reverse().map(r => [
      r.fecha?.split("T")[0] ?? "", r.edad_meses ?? "",
      r.peso_kg ?? "", r.talla_cm ?? "", r.imc ?? "", r.pc_cm ?? "",
      r.zscore_peso_edad ?? "", r.zscore_talla_edad ?? "",
      r.zscore_imc_edad ?? "", r.zscore_pc_edad ?? "",
      r.estado_peso_edad ?? "", r.estado_talla_edad ?? "",
      r.estado_imc_edad ?? "", r.estado_pc_edad ?? "",
    ]);
    const csv = [enc, ...filas].map(f => f.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `crecimiento_${(paciente.nombre || "paciente").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDropDL(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: isMobile ? "14px 14px" : "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: "0 0 2px", fontSize: isMobile ? "0.95rem" : "1.05rem" }}>
              📏 Curvas de Crecimiento OMS
            </h3>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
              Estándares OMS · {crecimiento.length} {crecimiento.length === 1 ? "medición" : "mediciones"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Toggle referencia OMS */}
            <div style={{ display: "flex", border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {[{ k: "0_5", label: "0-5 años" }, { k: "5_19", label: "5-19 años" }].map(r => (
                <button key={r.k} onClick={() => setRefOMS(r.k)} style={{
                  padding: isMobile ? "4px 8px" : "5px 12px",
                  fontSize: isMobile ? "0.7rem" : "0.78rem",
                  fontWeight: refOMS === r.k ? 700 : 500,
                  background: refOMS === r.k ? "#6366f1" : "#fff",
                  color: refOMS === r.k ? "#fff" : "#64748b",
                  border: "none", cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  {isMobile ? r.label.replace(" años", "a") : `REF. OMS: ${r.label}`}
                </button>
              ))}
            </div>

            {/* Imprimir */}
            <div style={{ position: "relative" }}>
              <button
                disabled={generandoPDF}
                onClick={() => { setDropPrint(v => !v); setDropDL(false); }}
                style={{ display: "flex", alignItems: "center", gap: 5, border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: generandoPDF ? "wait" : "pointer", padding: isMobile ? "4px 8px" : "5px 12px", fontSize: isMobile ? "0.7rem" : "0.78rem", color: "#374151", fontWeight: 500, whiteSpace: "nowrap", opacity: generandoPDF ? 0.6 : 1 }}
              >
                🖨️ {!isMobile && "Imprimir"} <span style={{ fontSize: "0.6rem", color: "#94a3b8", marginLeft: 2 }}>▾</span>
              </button>
              {dropPrint && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 220 }}>
                  <div style={{ padding: "6px 14px 4px", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Imprimir</div>
                  <button onClick={() => imprimir("curva")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "0.82rem", color: "#374151" }}>
                    📈 Curva seleccionada ({curva.etiqueta})
                  </button>
                  <button onClick={() => imprimir("consolidado")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "0.82rem", color: "#374151", borderTop: "1px solid #f1f5f9" }}>
                    📋 Consolidado (todas las curvas)
                  </button>
                </div>
              )}
            </div>

            {/* Descargar */}
            <div style={{ position: "relative" }}>
              <button
                disabled={generandoPDF}
                onClick={() => { setDropDL(v => !v); setDropPrint(false); }}
                style={{ display: "flex", alignItems: "center", gap: 5, border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: generandoPDF ? "wait" : "pointer", padding: isMobile ? "4px 8px" : "5px 12px", fontSize: isMobile ? "0.7rem" : "0.78rem", color: "#374151", fontWeight: 500, whiteSpace: "nowrap", opacity: generandoPDF ? 0.6 : 1 }}
              >
                {generandoPDF ? "⏳" : "⬇️"} {!isMobile && (generandoPDF ? "Generando..." : "Descargar")} <span style={{ fontSize: "0.6rem", color: "#94a3b8", marginLeft: 2 }}>▾</span>
              </button>
              {dropDL && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 240 }}>
                  <div style={{ padding: "6px 14px 4px", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descargar PDF</div>
                  <button onClick={() => descargarPDF("curva")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "0.82rem", color: "#374151" }}>
                    📈 Curva seleccionada ({curva.etiqueta})
                  </button>
                  <button onClick={() => descargarPDF("consolidado")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "0.82rem", color: "#374151", borderTop: "1px solid #f1f5f9" }}>
                    📋 Consolidado (todas las curvas)
                  </button>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: isMobile ? "6px 12px" : "7px 16px", fontSize: isMobile ? "0.8rem" : "0.85rem" }}
              onClick={onNuevo}
            >
              <FiPlus size={14} /> {isMobile ? "Nueva" : "Nueva medición"}
            </button>
          </div>
        </div>

        {/* Nota referencia 5-19 */}
        {refOMS === "5_19" && curva?.nota && (
          <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600 }}>
            {curva.nota}
          </p>
        )}

        {/* Tarjetas resumen última medición */}
        {crecimiento.length > 0 && (() => {
          const u = crecimiento[0];
          const zPT = (u.peso_kg && u.talla_cm)
            ? calcularZScores({ peso_kg: u.peso_kg, talla_cm: u.talla_cm, edad_meses: u.edad_meses }, paciente.sexo)
            : null;
          const cards = [
            { label: "PESO/EDAD",  val: u.peso_kg  ? `${Number(u.peso_kg).toFixed(1)} kg`   : "—", z: u.zscore_peso_edad,  est: u.estado_peso_edad,  p: u.percentil_peso_edad },
            { label: "TALLA/EDAD", val: u.talla_cm ? `${Number(u.talla_cm).toFixed(1)} cm`  : "—", z: u.zscore_talla_edad, est: u.estado_talla_edad, p: u.percentil_talla_edad },
            { label: "PESO/TALLA", val: u.peso_kg  ? `${Number(u.peso_kg).toFixed(1)} kg`   : "—", z: zPT?.zscore_peso_talla, est: zPT?.estado_peso_talla, p: zPT?.percentil_peso_talla },
            { label: "IMC/EDAD",   val: u.imc      ? `${Number(u.imc).toFixed(1)} kg/m²`    : "—", z: u.zscore_imc_edad,   est: u.estado_imc_edad,   p: u.percentil_imc_edad },
            { label: "P.C./EDAD",  val: u.pc_cm    ? `${Number(u.pc_cm).toFixed(1)} cm`     : "—", z: u.zscore_pc_edad,    est: u.estado_pc_edad,    p: u.percentil_pc_edad },
          ];
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginTop: 14 }}>
              {cards.map(c => {
                const col = colorEstado(c.est);
                const bg  = col === "#dc2626" ? "#fef2f2" : col === "#d97706" ? "#fffbeb" : col === "#16a34a" ? "#f0fdf4" : "#ede9fe";
                return (
                  <div key={c.label} style={{ border: `2px solid ${col}30`, borderRadius: 10, padding: "9px 12px", background: bg }}>
                    <div style={{ fontSize: "0.64rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 3 }}>{c.label}</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{c.val}</div>
                    {c.z != null && (
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>
                        Z: <strong style={{ color: col }}>{Number(c.z).toFixed(2)}</strong>
                        {c.p && <> · <strong>{c.p}</strong></>}
                      </div>
                    )}
                    {c.est && (
                      <div style={{ fontSize: "0.62rem", color: col, fontWeight: 700, marginTop: 3, textTransform: "uppercase" }}>
                        {c.est}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── Gráfica ─────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Sub-tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #f1f5f9", overflowX: "auto", scrollbarWidth: "none" }}>
          {tabs5.map(t => (
            <button key={t.key} onClick={() => setTabGrafica(t.key)} style={{
              flex: isMobile ? "0 0 auto" : "1",
              padding: isMobile ? "9px 12px" : "10px 14px",
              border: "none", background: "none", cursor: "pointer",
              borderBottom: tabGrafica === t.key ? "2.5px solid #6366f1" : "2.5px solid transparent",
              color: tabGrafica === t.key ? "#4f46e5" : "#94a3b8",
              fontWeight: tabGrafica === t.key ? 700 : 500,
              fontSize: isMobile ? "0.75rem" : "0.82rem",
              whiteSpace: "nowrap", marginBottom: -2,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: isMobile ? "14px 10px 10px" : "16px 18px 12px" }}>
          {/* Leyenda */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: isMobile ? "0.85rem" : "0.95rem", color: "#1e293b" }}>
                {curva.etiqueta} — {paciente.sexo === "F" ? "Niñas" : "Niños"} {refOMS === "5_19" ? `(5–${xDomain[1] != null ? Math.floor(xDomain[1] / 12) : 19} años)` : "(0–60 meses)"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                Estándares OMS · {puntosPaciente.length} {puntosPaciente.length === 1 ? "punto" : "puntos"} del paciente
              </div>
            </div>
            <div style={{ display: "flex", gap: isMobile ? 6 : 12, fontSize: "0.7rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span style={{ color: "#10b981", fontWeight: 600 }}>— Mediana</span>
              <span style={{ color: "#f59e0b" }}>-- ±2 DE</span>
              <span style={{ color: "#ef4444" }}>-- ±3 DE</span>
              {puntosPaciente.length > 0 && <span style={{ color: curva.color, fontWeight: 700 }}>● Paciente</span>}
            </div>
          </div>

          {chartData.length < 2 ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📊</div>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>
                {crecimiento.length === 0
                  ? "Sin mediciones. Presiona \"Nueva medición\" para comenzar."
                  : "Sin datos suficientes para esta gráfica."}
              </p>
            </div>
          ) : (
            <div ref={chartRef}>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={chartData} margin={{ top: 8, right: chartRight, left: chartLeft, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="x" type="number" scale="linear"
                  domain={xDomain}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#94a3b8" }}
                  label={{ value: refOMS === "5_19" ? "Edad" : curva.xLabel, position: "insideBottom", offset: -10, fontSize: 11, fill: "#94a3b8" }}
                  tickCount={xTickCount}
                  tickFormatter={xTickFmt}
                />
                <YAxis
                  domain={curva.yDomain}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#94a3b8" }}
                  width={isMobile ? 28 : 36}
                  tickFormatter={v => isMobile && v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                  labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
                  itemStyle={{ color: "#fff", padding: "1px 0" }}
                  formatter={(v, name) => [
                    v != null ? `${Number(v).toFixed(2)} ${curva.unidad}` : "—",
                    name === "paciente" ? `● ${paciente.nombre?.split(" ")[0] || "Paciente"}` :
                    name === "p3" ? "P3 (−3 DE)" : name === "p15" ? "P15 (−2 DE)" :
                    name === "p50" ? "P50 mediana" :
                    name === "p85" ? "P85 (+2 DE)" : "P97 (+3 DE)",
                  ]}
                  labelFormatter={v => refOMS === "5_19" ? `Edad: ${Math.floor(v / 12)}a${v % 12 > 0 ? ` ${v % 12}m` : ""}` : `${curva.xLabel.split(" ")[0]}: ${v}`}
                />
                {/* Banda ±3 DE (alerta) */}
                <Line type="monotone" dataKey="p3"  stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls legendType="none" />
                <Line type="monotone" dataKey="p97" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls legendType="none" />
                {/* Banda ±2 DE (riesgo) */}
                <Line type="monotone" dataKey="p15" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />
                <Line type="monotone" dataKey="p85" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls legendType="none" />
                {/* Mediana */}
                <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} connectNulls legendType="none" />
                {/* Puntos del paciente */}
                {puntosPaciente.length > 0 && (
                  <Line
                    type="monotone" dataKey="paciente"
                    stroke={curva.color} strokeWidth={2.5}
                    dot={{ r: isMobile ? 4 : 5, fill: curva.color, stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: isMobile ? 6 : 7, stroke: curva.color, strokeWidth: 2 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Historial ───────────────────────────────────────────────── */}
      <div className="card" style={{ padding: isMobile ? "14px 14px" : "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? "0.9rem" : "1rem" }}>
            🗓️ Historial ({crecimiento.length})
          </h3>
          {crecimiento.length > 0 && (
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Mostrando z-scores de: <strong style={{ color: "#6366f1" }}>{tabs5.find(t => t.key === tabGrafica)?.label}</strong>
            </span>
          )}
        </div>

        {crecimiento.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
            Sin mediciones registradas.
          </div>
        ) : isMobile ? (
          /* ── Vista tarjetas (móvil) ──────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {crecimiento.map(r => {
              const z   = indicadorActivo ? r[indicadorActivo] : r.zscore_peso_edad;
              const est = estadoActivo    ? r[estadoActivo]    : r.estado_peso_edad;
              const pct = percentilActivo ? r[percentilActivo] : r.percentil_peso_edad;
              const col = colorEstado(est);
              const bg  = col === "#dc2626" ? "#fef2f2" : col === "#d97706" ? "#fffbeb" : col === "#16a34a" ? "#f0fdf4" : "#f8f8ff";
              const fecha = r.fecha ? new Date(String(r.fecha).substring(0,10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
              const edad  = r.edad_meses != null ? (r.edad_meses < 24 ? `${r.edad_meses}m` : `${Math.floor(r.edad_meses/12)}a ${r.edad_meses%12}m`) : "—";
              return (
                <div key={r.id} style={{ border: `1.5px solid ${col}30`, borderRadius: 10, background: bg, padding: "11px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>{fecha}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Edad: {edad}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => onEditar(r)} style={{ background: "#dbeafe", border: "none", cursor: "pointer", color: "#2563eb", padding: "5px 8px", borderRadius: 6 }} title="Editar"><FiEdit2 size={14} /></button>
                      <button onClick={() => onEliminar(r)} style={{ background: "#fee2e2", border: "none", cursor: "pointer", color: "#dc2626", padding: "5px 8px", borderRadius: 6 }} title="Eliminar"><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                  {/* Medidas */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginBottom: 8 }}>
                    {r.peso_kg  != null && <span style={{ fontSize: "0.78rem", color: "#475569" }}>⚖️ <strong>{Number(r.peso_kg).toFixed(1)} kg</strong></span>}
                    {r.talla_cm != null && <span style={{ fontSize: "0.78rem", color: "#475569" }}>📏 <strong>{Number(r.talla_cm).toFixed(1)} cm</strong></span>}
                    {r.imc      != null && <span style={{ fontSize: "0.78rem", color: "#475569" }}>IMC <strong>{Number(r.imc).toFixed(1)}</strong></span>}
                    {r.pc_cm    != null && <span style={{ fontSize: "0.78rem", color: "#475569" }}>PC <strong>{Number(r.pc_cm).toFixed(1)} cm</strong></span>}
                  </div>
                  {/* Z-score + estado */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {z != null && (
                      <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        Z: <strong style={{ color: col, fontSize: "0.95rem" }}>{Number(z).toFixed(2)}</strong>
                      </span>
                    )}
                    {pct && (
                      <span style={{ background: "#f0f9ff", color: "#0369a1", borderRadius: 20, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700 }}>{pct}</span>
                    )}
                    <BadgeEstado estado={est} />
                  </div>
                  {r.observaciones && (
                    <div style={{ marginTop: 6, fontSize: "0.72rem", color: "#64748b", fontStyle: "italic" }}>💬 {r.observaciones}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vista tabla (tablet / desktop) ─────────────────────── */
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isTablet ? 520 : 640 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Fecha", "Edad", "Peso (kg)", "Talla (cm)", "IMC", !isTablet && "P.C. (cm)", "Z-score", "Percentil", "Estado", ""].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: "8px 10px", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textAlign: "left", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crecimiento.map(r => {
                  const z   = indicadorActivo ? r[indicadorActivo] : r.zscore_peso_edad;
                  const est = estadoActivo    ? r[estadoActivo]    : r.estado_peso_edad;
                  const pct = percentilActivo ? r[percentilActivo] : r.percentil_peso_edad;
                  const col = colorEstado(est);
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "9px 10px", fontSize: "0.82rem", whiteSpace: "nowrap", color: "#374151" }}>
                        {r.fecha ? new Date(String(r.fecha).substring(0,10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: "0.82rem", color: "#64748b", whiteSpace: "nowrap" }}>
                        {r.edad_meses != null ? (r.edad_meses < 24 ? `${r.edad_meses}m` : `${Math.floor(r.edad_meses/12)}a ${r.edad_meses%12}m`) : "—"}
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                        {r.peso_kg != null ? Number(r.peso_kg).toFixed(2) : "—"}
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: "0.85rem", color: "#1e293b" }}>
                        {r.talla_cm != null ? Number(r.talla_cm).toFixed(1) : "—"}
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: "0.82rem", color: "#64748b" }}>
                        {r.imc != null ? Number(r.imc).toFixed(1) : "—"}
                      </td>
                      {!isTablet && (
                        <td style={{ padding: "9px 10px", fontSize: "0.82rem", color: "#64748b" }}>
                          {r.pc_cm != null ? Number(r.pc_cm).toFixed(1) : "—"}
                        </td>
                      )}
                      <td style={{ padding: "9px 10px", fontWeight: 700, color: z != null ? col : "#94a3b8", fontSize: "0.92rem" }}>
                        {z != null ? Number(z).toFixed(2) : "—"}
                      </td>
                      <td style={{ padding: "9px 10px" }}>
                        {pct ? (
                          <span style={{ background: "#f0f9ff", color: "#0369a1", borderRadius: 20, padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700 }}>{pct}</span>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "9px 10px" }}><BadgeEstado estado={est} /></td>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => onEditar(r)} style={{ background: "#dbeafe", border: "none", cursor: "pointer", color: "#2563eb", padding: "4px 7px", borderRadius: 6, display: "flex", alignItems: "center" }} title="Editar"><FiEdit2 size={13} /></button>
                          <button onClick={() => onEliminar(r)} style={{ background: "#fee2e2", border: "none", cursor: "pointer", color: "#dc2626", padding: "4px 7px", borderRadius: 6, display: "flex", alignItems: "center" }} title="Eliminar"><FiTrash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
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
