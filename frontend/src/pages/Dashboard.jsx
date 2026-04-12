import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
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
const COLORS_PIE = [PALETTE.green, PALETTE.amber, PALETTE.red];

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

/* ── Variantes globales de animación ────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function Dashboard() {
  const [stats, setStats]         = useState(null);
  const [deptos, setDeptos]       = useState([]);
  const [tendencias, setTend]     = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [genero, setGenero]       = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/dashboard/por-departamento"),
      api.get("/dashboard/tendencias"),
      api.get("/dashboard/recientes"),
      api.get("/dashboard/por-genero"),
    ])
      .then(([s, d, t, r, g]) => {
        setStats(s.data);
        setDeptos(d.data);
        setTend(t.data);
        setRecientes(r.data);
        setGenero(g.data);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Layout><div className="loading">Cargando dashboard...</div></Layout>;

  const pieData = stats
    ? [
        { name: "Óptimo",      value: Number(stats.en_control) },
        { name: "Moderado",    value: Number(stats.moderado) },
        { name: "Alto Riesgo", value: Number(stats.alto_riesgo) },
      ]
    : [];

  return (
    <Layout>
      {/* Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1>Dashboard Global</h1>
          <p className="page-subtitle">Resumen clínico del programa de monitoreo continuo</p>
        </div>
        <Link to="/analisis/subir" className="btn btn-primary">+ Subir PDF</Link>
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

      <motion.div className="dashboard-row" variants={stagger} initial="hidden" animate="show">
        {/* Distribución de control */}
        <motion.div className="card" variants={fadeUp}>
          <h3>Distribución de Control ISPAD</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 230}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 35 : 45}
                outerRadius={isMobile ? 70 : 88}
                dataKey="value"
                paddingAngle={3}
                label={isMobile ? null : ({ name, value }) => `${name}: ${value}`}
                labelLine={!isMobile}
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i]} />)}
              </Pie>
              <Legend
                formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>}
              />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* TIR por departamento */}
        <motion.div className="card" variants={fadeUp}>
          <h3>TIR Promedio por Departamento</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 190 : 230}>
            <BarChart data={deptos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.blue} />
                  <stop offset="100%" stopColor={PALETTE.indigo} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="departamento" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Bar dataKey="tir_promedio" fill="url(#gradBar)" radius={[5, 5, 0, 0]} name="TIR %" />
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
