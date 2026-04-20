import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LabelList,
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

/* ── Tooltip TIR por Departamento (con clasificación) ───────────────────── */
function TooltipDepto({ active, payload }) {
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

/* ── Tooltip TIR por Grupo Etario (con clasificación) ──────────────────── */
function TooltipGrupoEtario({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const tirEntry = payload.find(p => p.dataKey === "tir_promedio");
  const gmiEntry = payload.find(p => p.dataKey === "gmi_promedio");
  const tir = tirEntry?.value;
  const { clasi, color } = tir >= 70
    ? { clasi: "Óptimo", color: "#76B250" }
    : tir >= 50
    ? { clasi: "Moderado", color: "#FEBF01" }
    : { clasi: "Alto Riesgo", color: "#FB0D0A" };
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b",
      borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e2e8f0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 200,
    }}>
      <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: 12 }}>{label}</p>
      {tir != null && (
        <>
          <p style={{ margin: "2px 0", color }}>
            <span style={{ color: "#94a3b8" }}>TIR %: </span>
            <strong>{tir}%</strong>
          </p>
          <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
            <span style={{ color, fontWeight: 600, fontSize: 12 }}>{clasi}</span>
          </p>
        </>
      )}
      {gmiEntry?.value != null && (
        <p style={{ margin: "2px 0", color: "#c27803" }}>
          <span style={{ color: "#94a3b8" }}>GMI %: </span>
          <strong>{gmiEntry.value}%</strong>
        </p>
      )}
    </div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const GRUPOS_ORDER = ["0-5 años", "6-9 años", "10-12 años", "13-17 años", "18+ años"];
function grupoEtario(edad) {
  if (edad <= 5)  return "0-5 años";
  if (edad <= 9)  return "6-9 años";
  if (edad <= 12) return "10-12 años";
  if (edad <= 17) return "13-17 años";
  return "18+ años";
}

export default function Consolidado() {
  const [todos, setTodos]     = useState([]);
  const [filtros, setFiltros] = useState({ departamento: "", sexo: "", edad_min: "", edad_max: "" });
  const [listaDeptos, setListaDeptos] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768);
  const [modalDepto, setModalDepto]   = useState(null); // { departamento, pacientes[] }
  const [clsVis, setClsVis] = useState({ OPTIMO: true, MODERADO: true, ALTO_RIESGO: true });
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get("/pacientes/departamentos").then((r) => setListaDeptos(r.data));
    api.get("/analisis").then((r) => setTodos(r.data)).finally(() => setCargando(false));
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

  // ── Computar todos los datos de gráficos desde filtrados ──────────────
  const deptos = (() => {
    const map = {};
    for (const a of filtrados) {
      const dep = a.departamento || "Sin departamento";
      if (!map[dep]) map[dep] = { tir_sum: 0, gmi_sum: 0, cv_sum: 0, n: 0, n_gmi: 0, n_cv: 0, pacientes: new Set(), en_control: 0, alto_riesgo: 0 };
      map[dep].tir_sum += Number(a.tir || 0);
      map[dep].n++;
      if (a.gmi != null && a.gmi !== "") { map[dep].gmi_sum += Number(a.gmi); map[dep].n_gmi++; }
      if (a.cv != null && a.cv !== "")   { map[dep].cv_sum  += Number(a.cv);  map[dep].n_cv++; }
      map[dep].pacientes.add(a.paciente_id);
      if (a.clasificacion === "OPTIMO")      map[dep].en_control++;
      if (a.clasificacion === "ALTO_RIESGO") map[dep].alto_riesgo++;
    }
    return Object.entries(map)
      .map(([departamento, v]) => ({
        departamento,
        total_pacientes: v.pacientes.size,
        tir_promedio:  v.n     ? +(v.tir_sum  / v.n).toFixed(1)     : 0,
        gmi_promedio:  v.n_gmi ? +(v.gmi_sum  / v.n_gmi).toFixed(2) : null,
        cv_promedio:   v.n_cv  ? +(v.cv_sum   / v.n_cv).toFixed(1)  : null,
        en_control:    v.en_control,
        alto_riesgo:   v.alto_riesgo,
      }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento));
  })();

  const genero = (() => {
    const map = {};
    for (const a of filtrados) {
      const s = a.sexo || "?";
      if (!map[s]) map[s] = { tir_sum: 0, n: 0 };
      map[s].tir_sum += Number(a.tir || 0);
      map[s].n++;
    }
    return Object.entries(map).map(([sexo, v]) => ({
      sexo,
      tir_promedio: v.n ? +(v.tir_sum / v.n).toFixed(1) : 0,
    }));
  })();

  const edades = (() => {
    const map = {};
    for (const a of filtrados) {
      const grupo = grupoEtario(Number(a.edad || 0));
      if (!map[grupo]) map[grupo] = { tir_sum: 0, gmi_sum: 0, n: 0, n_gmi: 0 };
      map[grupo].tir_sum += Number(a.tir || 0);
      map[grupo].n++;
      if (a.gmi != null && a.gmi !== "") { map[grupo].gmi_sum += Number(a.gmi); map[grupo].n_gmi++; }
    }
    return GRUPOS_ORDER
      .filter((g) => map[g])
      .map((g) => ({
        grupo: g,
        tir_promedio: map[g].n     ? +(map[g].tir_sum / map[g].n).toFixed(1)     : 0,
        gmi_promedio: map[g].n_gmi ? +(map[g].gmi_sum / map[g].n_gmi).toFixed(2) : 0,
      }));
  })();

  // GMI vs HbA1c por clasificación ISPAD (desde filtrados)
  const gmiHbA1cData = (() => {
    const order = ["OPTIMO", "MODERADO", "ALTO_RIESGO"];
    const labelMap = { OPTIMO: "Óptimo", MODERADO: "Moderado", ALTO_RIESGO: "Alto Riesgo" };
    const grupos = {};
    for (const a of filtrados) {
      const key = a.clasificacion;
      if (!key || !order.includes(key)) continue;
      if (!grupos[key]) grupos[key] = { gmi_sum: 0, hba1c_sum: 0, n_gmi: 0, n_hba1c: 0 };
      if (a.gmi != null && a.gmi !== "") { grupos[key].gmi_sum += Number(a.gmi); grupos[key].n_gmi++; }
      if (a.hba1c_post_mcg != null && a.hba1c_post_mcg !== "") {
        grupos[key].hba1c_sum += Number(a.hba1c_post_mcg); grupos[key].n_hba1c++;
      }
    }
    return order
      .filter((k) => grupos[k])
      .map((k) => ({
        clasificacion: labelMap[k],
        gmi_promedio:   grupos[k].n_gmi   ? +(grupos[k].gmi_sum   / grupos[k].n_gmi).toFixed(2)   : 0,
        hba1c_promedio: grupos[k].n_hba1c ? +(grupos[k].hba1c_sum / grupos[k].n_hba1c).toFixed(2) : 0,
      }));
  })();

  // Etiqueta corta para el eje X en móvil
  const deptosTick = deptos.map((d) => ({
    ...d,
    etiqueta: isMobile
      ? d.departamento.split(",")[0].slice(0, 12)
      : d.departamento.length > 22 ? d.departamento.slice(0, 22) + "…" : d.departamento,
  }));

  // ── Modal: pacientes de un departamento ───────────────────────────────
  function abrirModalDepto(departamento) {
    const pacientesMap = {};
    filtrados
      .filter((a) => a.departamento === departamento)
      .forEach((a) => {
        if (!pacientesMap[a.paciente_id]) {
          pacientesMap[a.paciente_id] = {
            id: a.paciente_id,
            nombre: a.paciente_nombre,
            sexo: a.sexo,
            edad: a.edad,
            clasificacion: a.clasificacion,
            tir_vals: [],
            gmi_vals: [],
          };
        }
        pacientesMap[a.paciente_id].tir_vals.push(Number(a.tir || 0));
        if (a.gmi != null && a.gmi !== "") pacientesMap[a.paciente_id].gmi_vals.push(Number(a.gmi));
      });
    const pacientes = Object.values(pacientesMap).map((p) => ({
      ...p,
      tir: p.tir_vals.length ? +(p.tir_vals.reduce((s, v) => s + v, 0) / p.tir_vals.length).toFixed(1) : null,
      gmi: p.gmi_vals.length ? +(p.gmi_vals.reduce((s, v) => s + v, 0) / p.gmi_vals.length).toFixed(2) : null,
      analisis: p.tir_vals.length,
    }));
    setModalDepto({ departamento, pacientes });
  }

  return (
    <Layout>
      {/* ── Modal pacientes por departamento ─────────────────────────────── */}
      {modalDepto && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setModalDepto(null)}
        >
          <div
            style={{
              background: "#0f172a", border: "1px solid #1e293b",
              borderRadius: 14, padding: 24, width: "100%", maxWidth: 620,
              maxHeight: "80vh", overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 16 }}>Pacientes — {modalDepto.departamento}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
                  {modalDepto.pacientes.length} paciente{modalDepto.pacientes.length !== 1 ? "s" : ""} en este departamento
                </p>
              </div>
              <button
                onClick={() => setModalDepto(null)}
                style={{
                  background: "none", border: "1px solid #334155", color: "#94a3b8",
                  borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 16,
                }}
              >✕</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>Nombre</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>Sexo</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>Edad</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>TIR prom.</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>GMI prom.</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>Análisis</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", color: "#64748b", fontWeight: 600 }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {modalDepto.pacientes.map((p) => {
                  const tirColor = p.tir >= 70 ? "#76B250" : p.tir >= 50 ? "#FEBF01" : "#FB0D0A";
                  const clsLabel = p.clasificacion === "OPTIMO" ? "Óptimo" : p.clasificacion === "MODERADO" ? "Moderado" : "Alto Riesgo";
                  const clsColor = p.clasificacion === "OPTIMO" ? "#76B250" : p.clasificacion === "MODERADO" ? "#FEBF01" : "#FB0D0A";
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                      style={{ borderBottom: "1px solid #1e293b", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#1e293b"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "8px 8px", color: "#3b82f6", fontWeight: 600, textDecoration: "underline" }}>{p.nombre}</td>
                      <td style={{ padding: "8px 8px", textAlign: "center", color: "#94a3b8" }}>{p.sexo === "F" ? "👧" : "👦"}</td>
                      <td style={{ padding: "8px 8px", textAlign: "center", color: "#94a3b8" }}>{p.edad} años</td>
                      <td style={{ padding: "8px 8px", textAlign: "center", color: tirColor, fontWeight: 700 }}>
                        {p.tir != null ? `${p.tir}%` : "—"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "center", color: "#c27803" }}>
                        {p.gmi != null ? `${p.gmi}%` : "—"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "center", color: "#94a3b8" }}>{p.analisis}</td>
                      <td style={{ padding: "8px 8px", textAlign: "center", color: clsColor, fontSize: 12, fontWeight: 600 }}>{clsLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
              <BarChart
                data={deptosTick}
                margin={{ top: 8, right: 16, left: -10, bottom: isMobile ? 60 : 70 }}
              >
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8fce5a" />
                    <stop offset="100%" stopColor="#76B250" />
                  </linearGradient>
                  <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffe033" />
                    <stop offset="100%" stopColor="#FEBF01" />
                  </linearGradient>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4d4a" />
                    <stop offset="100%" stopColor="#FB0D0A" />
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
                  content={<TooltipDepto />}
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
              <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
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
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#c27803", display: "inline-block" }} />
                  GMI
                </span>
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart data={edades} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8fce5a" />
                      <stop offset="100%" stopColor="#76B250" />
                    </linearGradient>
                    <linearGradient id="gradTirMod" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffe033" />
                      <stop offset="100%" stopColor="#FEBF01" />
                    </linearGradient>
                    <linearGradient id="gradTirBad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4d4a" />
                      <stop offset="100%" stopColor="#FB0D0A" />
                    </linearGradient>
                    <linearGradient id="gradAmber2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e0960a" />
                      <stop offset="100%" stopColor="#c27803" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="grupo" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<TooltipGrupoEtario />} />
                  <Bar dataKey="tir_promedio" radius={[5, 5, 0, 0]} name="TIR %">
                    {edades.map((e, i) => (
                      <Cell
                        key={i}
                        fill={
                          e.tir_promedio >= 70
                            ? "url(#gradPurple)"
                            : e.tir_promedio >= 50
                            ? "url(#gradTirMod)"
                            : "url(#gradTirBad)"
                        }
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="gmi_promedio" fill="url(#gradAmber2)" radius={[5, 5, 0, 0]} name="GMI %" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          {/* GMI vs HbA1c por clasificación */}
          <motion.div className="card" style={{ marginBottom: 20 }} initial="hidden" animate="show" variants={fadeUp}>
            <h3>Comparación GMI vs HbA1c por Clasificación ISPAD</h3>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              Promedio de GMI estimado (%) y HbA1c post-MCG (%) agrupados por nivel de control
            </p>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
              <BarChart data={gmiHbA1cData} margin={{ top: 8, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradGMI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0960a" />
                    <stop offset="100%" stopColor="#c27803" />
                  </linearGradient>
                  <linearGradient id="gradHbA1c" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="clasificacion" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, "auto"]} />
                <Tooltip content={<CustomTooltip suffix="%" />} />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
                <Bar dataKey="gmi_promedio" name="GMI %" fill="url(#gradGMI)" radius={[5, 5, 0, 0]}>
                  <LabelList dataKey="gmi_promedio" position="top" formatter={(v) => v ? `${v}%` : ""} style={{ fill: "#c27803", fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="hba1c_promedio" name="HbA1c %" fill="url(#gradHbA1c)" radius={[5, 5, 0, 0]}>
                  <LabelList dataKey="hba1c_promedio" position="top" formatter={(v) => v ? `${v}%` : ""} style={{ fill: "#2563eb", fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Tabla detallada */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Detalle por Departamento</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { key: "OPTIMO",      label: "TIR Óptimo",  color: "#76B250" },
                  { key: "MODERADO",    label: "Moderado",    color: "#FEBF01" },
                  { key: "ALTO_RIESGO", label: "Alto Riesgo", color: "#FB0D0A" },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setClsVis((v) => ({ ...v, [key]: !v[key] }))}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                      border: `1.5px solid ${color}`,
                      background: clsVis[key] ? color + "22" : "transparent",
                      color: clsVis[key] ? color : "#64748b",
                    }}
                  >
                    <span style={{
                      width: 28, height: 16, borderRadius: 8, position: "relative",
                      background: clsVis[key] ? color : "#334155",
                      transition: "background 0.2s", flexShrink: 0,
                      display: "inline-block",
                    }}>
                      <span style={{
                        position: "absolute", top: 2,
                        left: clsVis[key] ? 14 : 2,
                        width: 12, height: 12, borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th>Pacientes</th>
                    <th>TIR</th>
                    <th className="hide-mobile">GMI</th>
                    <th className="hide-mobile">CV</th>
                    <th>Control</th>
                    <th>Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {deptos
                    .filter((d) => {
                      const cls = d.tir_promedio >= 70 ? "OPTIMO" : d.tir_promedio >= 50 ? "MODERADO" : "ALTO_RIESGO";
                      if (!clsVis[cls]) return false;
                      if (!clsVis.ALTO_RIESGO && d.alto_riesgo > 0) return false;
                      return true;
                    })
                    .map((d) => (
                    <tr key={d.departamento}>
                      <td title={d.departamento}>
                        {isMobile && d.departamento.length > 22
                          ? d.departamento.slice(0, 22) + "…"
                          : d.departamento}
                      </td>
                      <td>
                        {d.total_pacientes > 0 ? (
                          <button
                            onClick={() => abrirModalDepto(d.departamento)}
                            style={{
                              background: "none", border: "none", color: "#3b82f6",
                              cursor: "pointer", fontWeight: 700, fontSize: 13,
                              textDecoration: "underline", padding: 0,
                            }}
                            title="Ver pacientes"
                          >{d.total_pacientes}</button>
                        ) : d.total_pacientes}
                      </td>
                      <td><span className={`badge-tir ${d.tir_promedio >= 70 ? "ok" : d.tir_promedio >= 50 ? "warn" : "bad"}`}>{d.tir_promedio}%</span></td>
                      <td className="hide-mobile">{d.gmi_promedio != null ? `${d.gmi_promedio}%` : "—"}</td>
                      <td className="hide-mobile">{d.cv_promedio  != null ? `${d.cv_promedio}%`  : "—"}</td>
                      <td><span className="badge badge-ok">{d.en_control}</span></td>
                      <td><span className="badge badge-bad">{d.alto_riesgo}</span></td>
                    </tr>
                  ))}
                  {deptos.filter((d) => {
                    const cls = d.tir_promedio >= 70 ? "OPTIMO" : d.tir_promedio >= 50 ? "MODERADO" : "ALTO_RIESGO";
                    if (!clsVis[cls]) return false;
                    if (!clsVis.ALTO_RIESGO && d.alto_riesgo > 0) return false;
                    return true;
                  }).length === 0 && (
                    <tr><td colSpan={7} className="empty-cell">Sin datos para los filtros seleccionados</td></tr>
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
