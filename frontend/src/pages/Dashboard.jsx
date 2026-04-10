import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import api from "../api/axios";
import Layout from "../components/Layout";
import SemaforoISPAD from "../components/SemaforoISPAD";

const COLORS_PIE = ["#057a55", "#c27803", "#c81e1e"];

export default function Dashboard() {
  const [stats, setStats]       = useState(null);
  const [deptos, setDeptos]     = useState([]);
  const [tendencias, setTend]   = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [genero, setGenero]     = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
      <div className="page-header">
        <div>
          <h1>Dashboard Global</h1>
          <p className="page-subtitle">Resumen clínico del programa de monitoreo continuo</p>
        </div>
        <Link to="/analisis/subir" className="btn btn-primary">+ Subir PDF</Link>
      </div>

      {/* Tarjetas de resumen */}
      <div className="stats-grid">
        <StatCard icon="👥" label="Total Pacientes"  value={stats?.total_pacientes ?? 0}     color="blue" />
        <StatCard icon="📊" label="TIR Promedio"     value={`${stats?.tir_promedio ?? 0}%`}  color={stats?.tir_promedio >= 70 ? "green" : "orange"} />
        <StatCard icon="🟢" label="En Control"       value={stats?.en_control ?? 0}           color="green" />
        <StatCard icon="🔴" label="Alto Riesgo"      value={stats?.alto_riesgo ?? 0}          color="red" />
        <StatCard icon="🩸" label="Glucosa Promedio" value={`${stats?.glucosa_promedio ?? "—"} mg/dL`} color="purple" />
        <StatCard icon="📋" label="Total Análisis"   value={stats?.total_analisis ?? 0}       color="blue" />
      </div>

      <div className="dashboard-row">
        {/* Distribución de control */}
        <div className="card">
          <h3>Distribución de Control ISPAD</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 65 : 80}
                dataKey="value"
                label={isMobile ? null : ({ name, value }) => `${name}: ${value}`}
                labelLine={!isMobile}
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i]} />)}
              </Pie>
              <Legend />
              <Tooltip formatter={(v, name) => [`${v}`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* TIR por departamento */}
        <div className="card">
          <h3>TIR Promedio por Departamento</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 190 : 220}>
            <BarChart data={deptos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="departamento" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="tir_promedio" fill="#1d4ed8" radius={[4,4,0,0]} name="TIR %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-row">
        {/* Tendencia mensual */}
        <div className="card card-wide">
          <h3>Tendencia Mensual TIR</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 175 : 200}>
            <LineChart data={tendencias} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="tir_promedio" stroke="#1d4ed8" strokeWidth={2} dot name="TIR %" />
              <Line type="monotone" dataKey="gmi_promedio" stroke="#c27803" strokeWidth={2} dot name="GMI %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparativa por género */}
        <div className="card">
          <h3>Comparativa por Género</h3>
          <div className="genero-cards">
            {genero.map((g) => (
              <div key={g.sexo} className="genero-card">
                <div className="genero-icon">{g.sexo === "F" ? "👧" : "👦"}</div>
                <p className="genero-label">{g.sexo === "F" ? "Niñas" : "Niños"}</p>
                <p className="genero-valor">{g.tir_promedio}%</p>
                <p className="genero-meta">TIR promedio</p>
                <p className="genero-n">{g.total_pacientes} pacientes</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Análisis recientes */}
      <div className="card">
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
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
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
