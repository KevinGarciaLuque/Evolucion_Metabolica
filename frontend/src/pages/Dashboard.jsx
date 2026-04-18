import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import ReactApexChart from "react-apexcharts";
import { motion } from "framer-motion";

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
  const [stats, setStats]         = useState(null);
  const [deptos, setDeptos]       = useState([]);
  const [tendencias, setTend]     = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [genero, setGenero]       = useState([]);
  const [glucosaRangos, setGlucosaRangos] = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);
  const [institucion, setInstitucion] = useState("HMEP");

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
          <h3 style={{ alignSelf: "flex-start", marginBottom: 8 }}>Objetivos de Control ISPAD</h3>
          <p className="text-muted" style={{ alignSelf: "flex-start", marginBottom: 16, fontSize: 12 }}>
            Metas internacionales de monitoreo continuo de glucosa
          </p>
          <DiagramaISPAD />
        </motion.div>

        <motion.div className="card" variants={fadeUp}>
          <h3>Distribución de Control ISPAD</h3>
          <Pie3DChart data={pieData} isMobile={isMobile} />
        </motion.div>
      </motion.div>

      <motion.div className="dashboard-row" variants={stagger} initial="hidden" animate="show">
        {/* TIR por departamento */}
        <motion.div className="card" variants={fadeUp}>
          <h3>TIR Promedio por Departamento</h3>
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
          <h3>Tendencia Mensual TIR</h3>
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
          <h3>Comparativa por Género</h3>
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
          <h3>Análisis Recientes</h3>
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
                  <td className="hide-xs">{r.fecha}</td>
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
      itemMargin: { horizontal: isMobile ? 4 : 8, vertical: isMobile ? 2 : 4 },
      markers: { width: isMobile ? 8 : 12, height: isMobile ? 8 : 12 },
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
      height={isMobile ? 420 : 400}
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
