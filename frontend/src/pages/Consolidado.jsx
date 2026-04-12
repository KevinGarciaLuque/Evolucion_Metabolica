import { useEffect, useState, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { motion } from "framer-motion";

/* ── CountUp propio (compatible con React 19 + Vite) ──────────────────── */
function CountUp({ end, duration = 1.2, decimals = 0, suffix = "" }) {
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

const COLORS = ["#3b82f6", "#ec4899"];

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
        <p key={i} style={{ margin: "2px 0", color: p.fill || p.color || "#3b82f6" }}>
          <span style={{ color: "#94a3b8" }}>{p.name}: </span>
          <strong>{p.value}{suffix}</strong>
        </p>
      ))}
    </div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function Consolidado() {
  const [deptos, setDeptos]   = useState([]);
  const [genero, setGenero]   = useState([]);
  const [edades, setEdades]   = useState([]);
  const [todos, setTodos]     = useState([]);
  const [filtros, setFiltros] = useState({ departamento: "", sexo: "", edad_min: "", edad_max: "" });
  const [listaDeptos, setListaDeptos] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get("/pacientes/departamentos").then((r) => setListaDeptos(r.data));
    Promise.all([
      api.get("/dashboard/por-departamento"),
      api.get("/dashboard/por-genero"),
      api.get("/dashboard/por-edad"),
      api.get("/analisis"),
    ]).then(([d, g, e, a]) => {
      setDeptos(d.data);
      setGenero(g.data);
      setEdades(e.data);
      setTodos(a.data);
    }).finally(() => setCargando(false));
  }, []);

  function cambiar(e) { setFiltros({ ...filtros, [e.target.name]: e.target.value }); }

  const filtrados = todos.filter((a) => {
    if (filtros.departamento && a.departamento !== filtros.departamento) return false;
    if (filtros.sexo && a.sexo !== filtros.sexo) return false;
    if (filtros.edad_min && a.edad < Number(filtros.edad_min)) return false;
    if (filtros.edad_max && a.edad > Number(filtros.edad_max)) return false;
    return true;
  });

  const promedioTIR = filtrados.length
    ? (filtrados.reduce((s, a) => s + Number(a.tir || 0), 0) / filtrados.length).toFixed(1)
    : "—";
  const promedioGMI = filtrados.length
    ? (filtrados.reduce((s, a) => s + Number(a.gmi || 0), 0) / filtrados.length).toFixed(2)
    : "—";

  // Etiqueta corta para el eje X en móvil
  const deptosTick = deptos.map((d) => ({
    ...d,
    etiqueta: isMobile
      ? d.departamento.split(",")[0].slice(0, 12)
      : d.departamento.length > 22 ? d.departamento.slice(0, 22) + "…" : d.departamento,
  }));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Consolidado Poblacional</h1>
          <p className="page-subtitle">Análisis comparativo por departamento, género y grupo etario</p>
        </div>
      </div>

      {/* Filtros colapsables */}
      <div className="card filtros-card">
        <div className="filtros-topbar">
          <div className="form-group" style={{ flex: 1 }}>
            <select name="departamento" value={filtros.departamento} onChange={cambiar}>
              <option value="">Todos los departamentos</option>
              {listaDeptos.map((d) => <option key={d} value={d}>{d.length > 34 ? d.slice(0, 34) + "…" : d}</option>)}
            </select>
          </div>
          <button
            className={`btn btn-outline btn-sm filtros-toggle ${mostrarFiltros ? "activo" : ""}`}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            type="button"
          >
            ⋮ Más{(filtros.sexo || filtros.edad_min || filtros.edad_max) ? " ●" : ""}
          </button>
        </div>
        <div className={`filtros-extra ${mostrarFiltros ? "abierto" : ""}`}>
          <div className="filtros-grid-extra">
            <div className="form-group">
              <label>Género</label>
              <select name="sexo" value={filtros.sexo} onChange={cambiar}>
                <option value="">Todos</option>
                <option value="F">👧 Niñas</option>
                <option value="M">👦 Niños</option>
              </select>
            </div>
            <div className="form-group">
              <label>Edad mínima</label>
              <input type="number" name="edad_min" value={filtros.edad_min} onChange={cambiar} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Edad máxima</label>
              <input type="number" name="edad_max" value={filtros.edad_max} onChange={cambiar} placeholder="18" />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas del grupo filtrado */}
      <motion.div className="stats-grid" style={{ marginBottom: 24 }} variants={stagger} initial="hidden" animate="show">
        <motion.div className="stat-card stat-card-blue" variants={fadeUp}>
          <div className="stat-icon">📋</div>
          <div>
            <p className="stat-value"><CountUp end={filtrados.length} duration={1.2} /></p>
            <p className="stat-label">Análisis seleccionados</p>
          </div>
        </motion.div>
        <motion.div className="stat-card stat-card-green" variants={fadeUp}>
          <div className="stat-icon">📊</div>
          <div>
            <p className="stat-value">
              {promedioTIR !== "—"
                ? <><CountUp end={Number(promedioTIR)} duration={1.2} decimals={1} />%</>
                : "—"}
            </p>
            <p className="stat-label">TIR Promedio grupo</p>
          </div>
        </motion.div>
        <motion.div className="stat-card stat-card-orange" variants={fadeUp}>
          <div className="stat-icon">🔬</div>
          <div>
            <p className="stat-value">
              {promedioGMI !== "—"
                ? <><CountUp end={Number(promedioGMI)} duration={1.2} decimals={2} />%</>
                : "—"}
            </p>
            <p className="stat-label">GMI Promedio grupo</p>
          </div>
        </motion.div>
        <motion.div className="stat-card stat-card-green" variants={fadeUp}>
          <div className="stat-icon">✅</div>
          <div>
            <p className="stat-value">
              <CountUp end={filtrados.filter((a) => a.clasificacion === "OPTIMO").length} duration={1.2} />
            </p>
            <p className="stat-label">En control óptimo</p>
          </div>
        </motion.div>
        <motion.div className="stat-card stat-card-red" variants={fadeUp}>
          <div className="stat-icon">⚠️</div>
          <div>
            <p className="stat-value">
              <CountUp end={filtrados.filter((a) => a.clasificacion === "ALTO_RIESGO").length} duration={1.2} />
            </p>
            <p className="stat-label">Alto riesgo</p>
          </div>
        </motion.div>
      </motion.div>

      {cargando ? <div className="loading">Cargando datos...</div> : (
        <>
          {/* TIR por departamento — ancho completo */}
          <motion.div className="card" style={{ marginBottom: 20 }} initial="hidden" animate="show" variants={fadeUp}>
            <h3>TIR Promedio por Departamento</h3>
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
              <BarChart
                data={deptosTick}
                margin={{ top: 8, right: 16, left: -10, bottom: isMobile ? 60 : 70 }}
              >
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                  <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#64748b" }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  content={<CustomTooltip suffix="%" />}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.departamento || ""}
                />
                <Bar dataKey="tir_promedio" name="TIR %" radius={[5, 5, 0, 0]}>
                  {deptosTick.map((d) => (
                    <Cell
                      key={d.departamento}
                      fill={
                        d.tir_promedio >= 70
                          ? "url(#gradGreen)"
                          : d.tir_promedio >= 50
                          ? "url(#gradAmber)"
                          : "url(#gradRed)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Género y grupo etario en fila */}
          <motion.div className="dashboard-row" variants={stagger} initial="hidden" animate="show">
            <motion.div className="card" variants={fadeUp}>
              <h3>Comparativa por Género</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart data={genero} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradBlueH" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="gradPinkH" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis dataKey="sexo" type="category" tickFormatter={(v) => v === "F" ? "👧 Niñas" : "👦 Niños"} width={80} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Bar dataKey="tir_promedio" radius={[0, 5, 5, 0]} name="TIR %">
                    {genero.map((g, i) => (
                      <Cell key={i} fill={i === 0 ? "url(#gradBlueH)" : "url(#gradPinkH)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div className="card card-wide" variants={fadeUp}>
              <h3>TIR Promedio por Grupo Etario</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart data={edades} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <linearGradient id="gradAmber2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="grupo" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
                  <Bar dataKey="tir_promedio" fill="url(#gradPurple)" radius={[5, 5, 0, 0]} name="TIR %" />
                  <Bar dataKey="gmi_promedio" fill="url(#gradAmber2)" radius={[5, 5, 0, 0]} name="GMI %" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          {/* Tabla detallada */}
          <div className="card">
            <h3>Detalle por Departamento</h3>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th className="hide-mobile">Pacientes</th>
                    <th>TIR</th>
                    <th className="hide-mobile">GMI</th>
                    <th className="hide-mobile">CV</th>
                    <th>Control</th>
                    <th>Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {deptos.map((d) => (
                    <tr key={d.departamento}>
                      <td title={d.departamento}>
                        {isMobile && d.departamento.length > 22
                          ? d.departamento.slice(0, 22) + "…"
                          : d.departamento}
                      </td>
                      <td className="hide-mobile">{d.total_pacientes}</td>
                      <td><span className={`badge-tir ${d.tir_promedio >= 70 ? "ok" : d.tir_promedio >= 50 ? "warn" : "bad"}`}>{d.tir_promedio}%</span></td>
                      <td className="hide-mobile">{d.gmi_promedio}%</td>
                      <td className="hide-mobile">{d.cv_promedio}%</td>
                      <td><span className="badge badge-ok">{d.en_control}</span></td>
                      <td><span className="badge badge-bad">{d.alto_riesgo}</span></td>
                    </tr>
                  ))}
                  {deptos.length === 0 && (
                    <tr><td colSpan={7} className="empty-cell">Sin datos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
