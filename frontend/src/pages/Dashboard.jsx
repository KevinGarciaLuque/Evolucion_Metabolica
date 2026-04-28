import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import ReactApexChart from "react-apexcharts";
import { motion } from "framer-motion";
import _LottieLib from "lottie-react";
import solData from "../assets/lottie/sol.json";
import tardeData from "../assets/lottie/tarde.json";
import lunaData from "../assets/lottie/luna.json";


/* ── CountUp propio (compatible con React 19 + Vite) ──────────────────── */
function CountUp({ end, duration = 1.4, decimals = 0, suffix = "" }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const total = duration * 1000;
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / total, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(end * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);
  return <>{Number(value).toFixed(decimals)}{suffix}</>;
}
import api from "../api/axios";
import Layout from "../components/Layout";
import SemaforoISPAD from "../components/SemaforoISPAD";
import DiagramaISPAD from "../components/DiagramaISPAD";
import { useAuth } from "../context/AuthContext";

// Fix interop Vite: lottie-react bundle exporta el módulo como default en vez del componente
const Lottie = typeof _LottieLib === "function" ? _LottieLib : _LottieLib.default;

/* ── Saludo según hora ────────────────────────────────────── */
function useSaludo() {
  const hora = new Date().getHours();
  if (hora >= 5  && hora < 12) return { texto: "Buenos días",   lottie: solData,   color: "#f59e0b", emoji: "☀️" };
  if (hora >= 12 && hora < 19) return { texto: "Buenas tardes", lottie: tardeData, color: "#f97316", emoji: "⛅" };
  return                              { texto: "Buenas noches", lottie: lunaData,  color: "#6366f1", emoji: "🌙" };
}

const MENSAJES = [
  "Cada dato registrado hoy puede cambiar la vida de un niño mañana.",
  "El control metabólico es un esfuerzo de equipo. Gracias por ser parte.",
  "La constancia en el monitoreo es la mejor medicina preventiva.",
  "Pequeños ajustes hoy, grandes mejoras en la calidad de vida.",
  "Su dedicación hace la diferencia en el bienestar de cada paciente.",
  "El seguimiento continuo es la base de un tratamiento exitoso.",
  "Cada consulta registrada es un paso hacia un mejor control glucémico.",
];

function useFechaYMensaje() {
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString("es-HN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  // Capitalizar primera letra
  const fechaFormateada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  // Mensaje del día (basado en el día del año para que rote pero sea estable)
  const diaSemana = hoy.getDay(); // 0-6
  const diaAno = Math.floor((hoy - new Date(hoy.getFullYear(), 0, 0)) / 86400000);
  const mensaje = MENSAJES[diaAno % MENSAJES.length];
  return { fechaFormateada, mensaje };
}

/* ── Paleta profesional ─────────────────────────────────────────────────── */
const PALETTE = {
  blue:   "#3b82f6",
  indigo: "#6366f1",
  green:  "#22c55e",
  amber:  "#f59e0b",
  red:    "#ef4444",
  purple: "#a855f7",
  slate:  "#64748b",
};
const COLORS_GLUCOSA = [
  { key: "muy_alto", label: "Muy Alto >250",       color: "#FEBF01" },
  { key: "alto",     label: "Alto 181-250",        color: "#FDD94F" },
  { key: "objetivo", label: "Objetivo 70-180",     color: "#76B250" },
  { key: "bajo",     label: "Bajo 54-69",          color: "#FB0D0A" },
  { key: "muy_bajo", label: "Muy Bajo <54",        color: "#86270C" },
];

/* ── Tooltip personalizado ──────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b",
      borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e2e8f0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      {label && <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: 12 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.color || PALETTE.blue }}>
          <span style={{ color: "#94a3b8" }}>{p.name}: </span>
          <strong>{p.value}{suffix}</strong>
        </p>
      ))}
    </div>
  );
}

/* ── Tooltip TIR por Departamento (con clasificación) ──────────────────── */
function TooltipDeptoD({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const tir = d.tir_promedio;
  const { label, color } = tir >= 70
    ? { label: "Óptimo", color: "#76B250" }
    : tir >= 50
    ? { label: "Moderado", color: "#FEBF01" }
    : { label: "Alto Riesgo", color: "#FB0D0A" };
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b",
      borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e2e8f0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 220,
    }}>
      <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: 12 }}>{d.departamento}</p>
      <p style={{ margin: "2px 0", color }}>
        <span style={{ color: "#94a3b8" }}>TIR %: </span>
        <strong>{tir}%</strong>
      </p>
      <p style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
        <span style={{ color, fontWeight: 600, fontSize: 12 }}>{label}</span>
      </p>
    </div>
  );
}

/* ── Variantes globales de animación ────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function Dashboard() {
  const { usuario } = useAuth();
  const saludo = useSaludo();
  const { fechaFormateada, mensaje } = useFechaYMensaje();
  const colorGenero = usuario?.sexo === "F" ? "#f472b6"
                   : usuario?.sexo === "M" ? "#10b981"
                   : saludo.color;
  const [stats, setStats]         = useState(null);
  const [deptos, setDeptos]       = useState([]);
  const [tendencias, setTend]     = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [genero, setGenero]       = useState([]);
  const [glucosaRangos, setGlucosaRangos] = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);
  const [institucion, setInstitucion] = useState("HMEP");
  const [modalInfo, setModalInfo]     = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setCargando(true);
    const q = `?institucion=${institucion}`;
    Promise.all([
      api.get(`/dashboard/stats${q}`),
      api.get(`/dashboard/por-departamento${q}`),
      api.get(`/dashboard/tendencias${q}`),
      api.get(`/dashboard/recientes${q}`),
      api.get(`/dashboard/por-genero${q}`),
      api.get(`/dashboard/distribucion-glucosa${q}`),
    ])
      .then(([s, d, t, r, g, gl]) => {
        setStats(s.data);
        setDeptos(d.data);
        setTend(t.data);
        setRecientes(r.data);
        setGenero(g.data);
        setGlucosaRangos(gl.data);
      })
      .finally(() => setCargando(false));
  }, [institucion]);

  // ── Información explicativa de cada gráfica del Dashboard ──────────────
  const INFO_DASHBOARD = {
    ispad: {
      titulo: "Objetivos de Control ISPAD",
      items: [
        { label: "TIR — Tiempo en Rango", desc: "Porcentaje de tiempo que la glucosa estuvo entre 70–180 mg/dL. Objetivo ISPAD: ≥ 70%. Es el indicador principal del control glucémico en MCG." },
        { label: "TAR — Sobre el Rango", desc: "Tiempo con glucosa > 180 mg/dL. Objetivo: < 25% total. Se divide en TAR Alto (181–250 mg/dL) y TAR Muy Alto (> 250 mg/dL)." },
        { label: "TBR — Bajo el Rango", desc: "Tiempo con glucosa < 70 mg/dL. Objetivo: < 4% total. Se divide en TBR Bajo (54–69 mg/dL) y TBR Muy Bajo (< 54 mg/dL). Es clínicamente prioritario reducirlo." },
        { label: "Clasificación ISPAD", desc: "Óptimo: TIR ≥ 70% y TBR < 4%. Moderado: TIR 50–69%. Alto Riesgo: TIR < 50%. Basado en consenso ISPAD 2022 para población pediátrica." },
      ],
    },
    distribucionControl: {
      titulo: "Distribución de Control ISPAD",
      items: [
        { label: "¿Qué muestra?", desc: "Proporción del total de análisis MCG clasificados según el nivel de control ISPAD. Permite ver de un vistazo cuántos pacientes están en cada zona de control." },
        { label: "Zona Objetivo (verde)", desc: "Representa el porcentaje de lecturas en rango 70–180 mg/dL (TIR). Es el segmento más importante; idealmente debe ser ≥ 70% del total." },
        { label: "Cómo usar el gráfico", desc: "Hacer clic en un segmento o en la leyenda lo resalta para ver su valor exacto. El centro muestra el valor del segmento seleccionado o el TIR objetivo si no hay selección." },
      ],
    },
    tirDepto: {
      titulo: "TIR Promedio por Departamento",
      items: [
        { label: "¿Qué muestra?", desc: "Promedio del Tiempo en Rango (TIR) de todos los análisis MCG agrupados por departamento del paciente. Permite identificar qué regiones tienen mejor o peor control glucémico." },
        { label: "Colores", desc: "Verde ≥ 70%: control óptimo. Amarillo 50–69%: moderado. Rojo < 50%: alto riesgo. La meta institucional es que todos los departamentos estén en verde." },
        { label: "Consideración", desc: "Departamentos con pocos pacientes pueden mostrar promedios extremos. Complementar con el Consolidado Poblacional para una vista más detallada por departamento." },
      ],
    },
    tendencia: {
      titulo: "Tendencia Mensual TIR",
      items: [
        { label: "TIR mensual", desc: "Promedio del Tiempo en Rango del mes, calculado a partir de todos los análisis MCG con fecha en ese mes. Muestra si el control glucémico poblacional mejora o empeora con el tiempo." },
        { label: "GMI mensual", desc: "Promedio del Glucose Management Indicator del mes. Valores cercanos a 7% se corresponden con un buen control. Si GMI y TIR se mueven en dirección contraria, puede indicar cambios en la composición del grupo." },
        { label: "Cómo interpretarla", desc: "Una tendencia ascendente en TIR indica mejora global del programa. Caidas bruscas pueden coincidir con períodos vacacionales, cambios de tratamiento o incorporación de nuevos pacientes de alto riesgo." },
      ],
    },
    genero: {
      titulo: "Comparativa por Género",
      items: [
        { label: "¿Qué muestra?", desc: "TIR promedio separado por sexo (niños vs niñas). Permite detectar brechas de control que requieran intervención diferenciada." },
        { label: "Interpretación", desc: "Las diferencias pueden estar relacionadas con factores hormonales, adherencia al tratamiento, actividad física o nivel de supervisión parental. Una diferencia > 5% es clínicamente relevante y amerita análisis adicional." },
      ],
    },
    recientes: {
      titulo: "Análisis Recientes",
      items: [
        { label: "¿Qué muestra?", desc: "Los últimos análisis MCG registrados en el sistema, ordenados por fecha descendente. Permite hacer un seguimiento rápido de los pacientes que más recientemente tuvieron una consulta." },
        { label: "Estado (badge de color)", desc: "Óptimo (verde): TIR ≥ 70%. Moderado (amarillo): TIR 50–69%. Alto Riesgo (rojo): TIR < 50%. El color del TIR también refleja este criterio." },
        { label: "Acción recomendada", desc: "Los pacientes en Alto Riesgo que aparecen en esta tabla deben ser priorizados para seguimiento. Hacer clic en 'Ver todos' lleva al listado completo de pacientes." },
      ],
    },
  };

  if (cargando) return <Layout><div className="loading">Cargando dashboard...</div></Layout>;

  const pieData = glucosaRangos
    ? COLORS_GLUCOSA.map(({ key, label }) => ({
        name:  label,
        value: Number(glucosaRangos[key] ?? 0),
      })).filter(d => d.value > 0)
    : [];

  return (
    <Layout>
      {/* Header */}
      <motion.div
        className="page-header"
        style={{ marginTop: 20 }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1>Dashboard Global</h1>
          <p className="page-subtitle">Resumen clínico del programa de monitoreo continuo</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-end", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>Institución:</span>
          <div
            className={`toggle-pill ${institucion === "IHSS" ? "is-ihss" : ""}`}
            onClick={() => setInstitucion(institucion === "HMEP" ? "IHSS" : "HMEP")}
            role="switch"
            aria-checked={institucion === "HMEP"}
            title={`Cambiar a ${institucion === "HMEP" ? "IHSS" : "HMEP"}`}
          >
            <span className="toggle-label">{institucion}</span>
            <span className="toggle-thumb" />
          </div>
        </div>
      </motion.div>

      {/* Bienvenida */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        style={{
          background: `linear-gradient(135deg, ${colorGenero}18 0%, ${colorGenero}08 100%)`,
          border: `1px solid ${colorGenero}44`,
          borderRadius: 16,
          padding: isMobile ? "16px 16px" : "24px 28px",
          marginBottom: 20,
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 12 : 18,
          boxShadow: `0 2px 16px ${colorGenero}18`,
        }}
      >
        {/* Ícono animado clima */}
        <motion.span
          animate={{ rotate: saludo.emoji === "☀️" ? [0, 15, -15, 0] : saludo.emoji === "🌙" ? [0, -10, 10, 0] : [0, -5, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: isMobile ? 48 : 64, lineHeight: 1, flexShrink: 0, display: "block" }}
        >
          {saludo.emoji}
        </motion.span>

        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Saludo + nombre */}
          <div style={{ display: "flex", alignItems: "baseline", gap: isMobile ? 4 : 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: isMobile ? 13 : 17, fontWeight: 600, letterSpacing: 0.5,
              color: colorGenero, textTransform: "uppercase",
            }}>
              {saludo.texto},
            </span>
            <span style={{
              fontSize: isMobile ? 22 : 32, fontWeight: 900, lineHeight: 1,
              background: `linear-gradient(100deg, #1e293b 20%, ${colorGenero} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              wordBreak: "break-word",
            }}>
              {usuario?.nombre ?? "Doctor/a"}
            </span>
          </div>

          {/* Fecha */}
          <p style={{ margin: "5px 0 0", fontSize: isMobile ? 12 : 14, fontWeight: 600, color: colorGenero, opacity: 0.85, letterSpacing: 0.3 }}>
            📅 {fechaFormateada}
          </p>

          {/* Línea separadora */}
          <div style={{ height: 1, margin: "8px 0", background: `linear-gradient(90deg, ${colorGenero}55, transparent)` }} />

          {/* Mensaje motivacional */}
          <p style={{ margin: 0, fontSize: isMobile ? 13 : 15, lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
              background: `${colorGenero}1a`, border: `1.5px solid ${colorGenero}66`, fontSize: 11,
              color: colorGenero,
            }}>✦</span>
            <span>
              <strong style={{ color: colorGenero, fontWeight: 800, fontSize: isMobile ? 13 : 15.5 }}>
                {usuario?.sexo === "M" ? "Listo" : usuario?.sexo === "F" ? "Lista" : "Listo/a"} para hacer la diferencia hoy.
              </strong>{" "}
              {!isMobile && (
                <span style={{ color: "var(--text-muted, #94a3b8)", fontStyle: "italic", fontSize: 14 }}>{mensaje}</span>
              )}
            </span>
          </p>
          {/* Mensaje en móvil va en línea separada para no colapsar */}
          {isMobile && (
            <p style={{ margin: "4px 0 0 30px", fontSize: 12, color: "var(--text-muted, #94a3b8)", fontStyle: "italic", lineHeight: 1.5 }}>
              {mensaje}
            </p>
          )}
        </div>
      </motion.div>

      {/* Tarjetas de resumen */}
      <motion.div className="stats-grid" variants={stagger} initial="hidden" animate="show">
        <StatCard icon="👥" label="Total Pacientes"  value={stats?.total_pacientes ?? 0}  rawValue={stats?.total_pacientes ?? 0}  color="blue"   suffix="" />
        <StatCard icon="📊" label="TIR Promedio"     value={stats?.tir_promedio ?? 0}     rawValue={stats?.tir_promedio ?? 0}     color={stats?.tir_promedio >= 70 ? "green" : "orange"} suffix="%" />
        <StatCard icon="🟢" label="En Control"       value={stats?.en_control ?? 0}       rawValue={stats?.en_control ?? 0}       color="green"  suffix="" />
        <StatCard icon="🔴" label="Alto Riesgo"      value={stats?.alto_riesgo ?? 0}      rawValue={stats?.alto_riesgo ?? 0}      color="red"    suffix="" />
        <StatCard icon="🩸" label="Glucosa Promedio" value={stats?.glucosa_promedio ?? 0} rawValue={stats?.glucosa_promedio ?? 0} color="purple" suffix=" mg/dL" />
        <StatCard icon="📋" label="Total Análisis"   value={stats?.total_analisis ?? 0}   rawValue={stats?.total_analisis ?? 0}   color="blue"   suffix="" />
      </motion.div>

      {/* Diagrama ISPAD + Distribución de control */}
      <motion.div className="dashboard-row" variants={stagger} initial="hidden" animate="show">
        <motion.div className="card" variants={fadeUp} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Objetivos de Control ISPAD</h3>
            {usuario?.mostrar_info_graficas ? (
              <button onClick={() => setModalInfo("ispad")} title="¿Cómo se interpreta?" style={{ background: "none", border: "1.5px solid #334155", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
            ) : null}
          </div>
          <p className="text-muted" style={{ alignSelf: "flex-start", marginBottom: 16, fontSize: 12 }}>
            Metas internacionales de monitoreo continuo de glucosa
          </p>
          <DiagramaISPAD />
        </motion.div>

        <motion.div className="card" variants={fadeUp} style={{ paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>Distribución de Control ISPAD</h3>
            {usuario?.mostrar_info_graficas ? (
              <button onClick={() => setModalInfo("distribucionControl")} title="¿Cómo se interpreta?" style={{ background: "none", border: "1.5px solid #334155", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
            ) : null}
          </div>
          <Pie3DChart data={pieData} isMobile={isMobile} />
        </motion.div>
      </motion.div>

      <motion.div className="dashboard-row" variants={stagger} initial="hidden" animate="show">
        {/* TIR por departamento */}
        <motion.div className="card" variants={fadeUp}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>TIR Promedio por Departamento</h3>
            {usuario?.mostrar_info_graficas ? (
              <button onClick={() => setModalInfo("tirDepto")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #334155", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#76B250", display: "inline-block" }} />
              TIR Óptimo ≥ 70%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#FEBF01", display: "inline-block" }} />
              Moderado 50–69%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#FB0D0A", display: "inline-block" }} />
              Alto Riesgo &lt; 50%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 190 : 230}>
            <BarChart data={deptos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradDBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8fce5a" />
                  <stop offset="100%" stopColor="#76B250" />
                </linearGradient>
                <linearGradient id="gradDAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffe033" />
                  <stop offset="100%" stopColor="#FEBF01" />
                </linearGradient>
                <linearGradient id="gradDRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4d4a" />
                  <stop offset="100%" stopColor="#FB0D0A" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="departamento" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip content={<TooltipDeptoD />} />
              <Bar dataKey="tir_promedio" radius={[5, 5, 0, 0]} name="TIR %">
                {deptos.map((d) => (
                  <Cell
                    key={d.departamento}
                    fill={
                      d.tir_promedio >= 70
                        ? "url(#gradDBar)"
                        : d.tir_promedio >= 50
                        ? "url(#gradDAmber)"
                        : "url(#gradDRed)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      <motion.div className="dashboard-row" variants={stagger} initial="hidden" animate="show">
        {/* Tendencia mensual */}
        <motion.div className="card card-wide" variants={fadeUp}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Tendencia Mensual TIR</h3>
            {usuario?.mostrar_info_graficas ? (
              <button onClick={() => setModalInfo("tendencia")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #334155", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
            ) : null}
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 175 : 210}>
            <LineChart data={tendencias} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradLineTir" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={PALETTE.blue} />
                  <stop offset="100%" stopColor={PALETTE.indigo} />
                </linearGradient>
                <linearGradient id="gradLineGmi" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={PALETTE.amber} />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
              <Line type="monotone" dataKey="tir_promedio" stroke="url(#gradLineTir)" strokeWidth={2.5}
                dot={{ r: 4, fill: PALETTE.blue, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: PALETTE.blue }}
                name="TIR %" />
              <Line type="monotone" dataKey="gmi_promedio" stroke="url(#gradLineGmi)" strokeWidth={2.5}
                dot={{ r: 4, fill: PALETTE.amber, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: PALETTE.amber }}
                name="GMI %" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Comparativa por género */}
        <motion.div className="card" variants={fadeUp}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Comparativa por Género</h3>
            {usuario?.mostrar_info_graficas ? (
              <button onClick={() => setModalInfo("genero")} title="¿Cómo se calcula?" style={{ background: "none", border: "1.5px solid #334155", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
            ) : null}
          </div>
          <div className="genero-cards">
            {genero.map((g) => (
              <div key={g.sexo} className="genero-card">
                <div className="genero-icon">{g.sexo === "F" ? "👧" : "👦"}</div>
                <p className="genero-label">{g.sexo === "F" ? "Niñas" : "Niños"}</p>
                <p className="genero-valor">
                  <CountUp end={Number(g.tir_promedio)} duration={1.4} decimals={1} />%
                </p>
                <p className="genero-meta">TIR promedio</p>
                <p className="genero-n">{g.total_pacientes} pacientes</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Análisis recientes */}
      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="card-header-row">
          <h3 style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
            Análisis Recientes
            {usuario?.mostrar_info_graficas ? (
              <button onClick={() => setModalInfo("recientes")} title="¿Cómo se interpreta?" style={{ background: "none", border: "1.5px solid #334155", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6366f1", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>i</button>
            ) : null}
          </h3>
          <Link to="/pacientes" className="link-small">Ver todos</Link>
        </div>
        <div className="table-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th>Paciente</th>
                <th className="hide-mobile">Departamento</th>
                <th className="hide-xs">Fecha</th>
                <th>TIR</th>
                <th className="hide-mobile">GMI</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((r) => (
                <tr key={r.id}>
                  <td>{r.paciente_nombre}</td>
                  <td className="hide-mobile">{r.departamento}</td>
                  <td className="hide-xs">{r.fecha ? new Date(String(r.fecha).substring(0, 10) + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</td>
                  <td><span className={`badge-tir ${r.tir >= 70 ? "ok" : r.tir >= 50 ? "warn" : "bad"}`}>{r.tir}%</span></td>
                  <td className="hide-mobile">{r.gmi}%</td>
                  <td><ClasificacionBadge valor={r.clasificacion} /></td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr><td colSpan={6} className="empty-cell">No hay análisis registrados aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* ── Modal información de gráficas ────────────────────────────── */}
      {modalInfo && INFO_DASHBOARD[modalInfo] && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}
          onClick={() => setModalInfo(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 14, padding: "28px 28px", maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem", lineHeight: 1.4 }}>
                {INFO_DASHBOARD[modalInfo].titulo}
              </h3>
              <button onClick={() => setModalInfo(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1, marginLeft: 12, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {INFO_DASHBOARD[modalInfo].items.map((item, i) => (
                <div key={i} style={{ borderLeft: "3px solid #6366f1", paddingLeft: 14 }}>
                  <div style={{ fontWeight: 700, color: "#3730a3", fontSize: "0.88rem", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: "#374151", fontSize: "0.84rem", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button
                onClick={() => setModalInfo(null)}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1.5px solid #6366f1", background: "none", color: "#6366f1", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" }}
              >Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

/* ── Componentes auxiliares ─────────────────────────────────────────────── */

/* Convierte hex a rgba para efecto de opacidad */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* Gráfico de dona ApexCharts: clic en leyenda/segmento resalta el seleccionado */
function Pie3DChart({ data, isMobile }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  const series = data.map(d => d.value);
  const labels = data.map(d => d.name);
  const baseColors = data.map(d => COLORS_GLUCOSA.find(c => c.label === d.name)?.color ?? "#64748b");

  const colors = baseColors.map((color, i) =>
    selectedIdx === null || selectedIdx === i
      ? color
      : hexToRgba(color, 0.2)
  );

  const options = {
    chart: {
      type: "donut",
      background: "transparent",
      animations: { enabled: true, speed: 700, animateGradually: { enabled: true, delay: 100 } },
      dropShadow: { enabled: true, top: 6, left: 0, blur: 14, color: "#000", opacity: 0.28 },
      events: {
        legendClick: (_chart, seriesIndex) => {
          setSelectedIdx(prev => prev === seriesIndex ? null : seriesIndex);
        },
        dataPointSelection: (_e, _ctx, config) => {
          setSelectedIdx(prev => prev === config.dataPointIndex ? null : config.dataPointIndex);
        },
      },
    },
    labels,
    colors,
    fill: { opacity: 1 },
    states: {
      normal: { filter: { type: "none" } },
      hover:  { filter: { type: "none" } },
      active: { filter: { type: "none" }, allowMultipleDataPointsSelection: false },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val.toFixed(1)}%`,
      style: { fontSize: "13px", fontWeight: 700, colors: ["#fff"] },
      dropShadow: { enabled: true, blur: 3, opacity: 0.5 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "58%",
          labels: {
            show: true,
            total: {
              show: true,
              label: selectedIdx !== null ? labels[selectedIdx] : "TIR Objetivo",
              color: "#1e293b",
              fontSize: "13px",
              fontWeight: 600,
              formatter: () => {
                if (selectedIdx !== null) return `${series[selectedIdx]}%`;
                const obj = data.find(d => d.name === "Objetivo 70-180");
                return obj ? `${obj.value}%` : "";
              },
            },
            value: { color: "#0f172a", fontSize: "22px", fontWeight: 700 },
            name: { color: "#334155", fontSize: "14px", fontWeight: 600 },
          },
        },
        expandOnClick: true,
        offsetY: 0,
      },
    },
    stroke: {
      width: 2,
      colors: baseColors.map((_, i) =>
        selectedIdx === null || selectedIdx === i
          ? "#1e293b"
          : "rgba(30,41,59,0.15)"
      ),
    },
    legend: {
      position: "bottom",
      labels: { colors: "#94a3b8", useSeriesColors: false },
      fontSize: isMobile ? "10px" : "12px",
      itemMargin: { horizontal: isMobile ? 4 : 8, vertical: isMobile ? 4 : 4 },
      markers: { width: isMobile ? 8 : 12, height: isMobile ? 8 : 12 },
      offsetY: isMobile ? 8 : 0,
      onItemClick: { toggleDataSeries: false },
      onItemHover: { highlightDataSeries: false },
    },
    tooltip: {
      theme: "dark",
      y: { formatter: (v) => `${v}%` },
    },
    theme: { mode: "dark" },
  };

  return (
    <ReactApexChart
      type="donut"
      series={series}
      options={options}
      height={isMobile ? Math.min(window.innerHeight * 0.52, 460) : 400}
    />
  );
}

function StatCard({ icon, label, rawValue, color, suffix }) {
  const isFloat = !Number.isInteger(Number(rawValue));
  return (
    <motion.div className={`stat-card stat-card-${color}`} variants={fadeUp}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-value">
          <CountUp
            end={Number(rawValue) || 0}
            duration={1.4}
            decimals={isFloat ? 1 : 0}
            suffix={suffix}
          />
        </p>
        <p className="stat-label">{label}</p>
      </div>
    </motion.div>
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
