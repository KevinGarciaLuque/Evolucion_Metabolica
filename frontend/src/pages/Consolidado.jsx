import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import api from "../api/axios";
import Layout from "../components/Layout";

const COLORS = ["#1d4ed8", "#db2777"];

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
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-card-blue">
          <div className="stat-icon">📋</div>
          <div>
            <p className="stat-value">{filtrados.length}</p>
            <p className="stat-label">Análisis seleccionados</p>
          </div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-icon">📊</div>
          <div>
            <p className="stat-value">{promedioTIR}%</p>
            <p className="stat-label">TIR Promedio grupo</p>
          </div>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="stat-icon">🔬</div>
          <div>
            <p className="stat-value">{promedioGMI}%</p>
            <p className="stat-label">GMI Promedio grupo</p>
          </div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-icon">✅</div>
          <div>
            <p className="stat-value">{filtrados.filter((a) => a.clasificacion === "OPTIMO").length}</p>
            <p className="stat-label">En control óptimo</p>
          </div>
        </div>
        <div className="stat-card stat-card-red">
          <div className="stat-icon">⚠️</div>
          <div>
            <p className="stat-value">{filtrados.filter((a) => a.clasificacion === "ALTO_RIESGO").length}</p>
            <p className="stat-label">Alto riesgo</p>
          </div>
        </div>
      </div>

      {cargando ? <div className="loading">Cargando datos...</div> : (
        <>
          {/* TIR por departamento — ancho completo */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>TIR Promedio por Departamento</h3>
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
              <BarChart
                data={deptosTick}
                margin={{ top: 8, right: 16, left: -10, bottom: isMobile ? 60 : 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: isMobile ? 9 : 11 }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => `${v}%`}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.departamento || ""}
                />
                <Bar dataKey="tir_promedio" name="TIR %" radius={[4, 4, 0, 0]}>
                  {deptosTick.map((d) => (
                    <Cell key={d.departamento}
                      fill={d.tir_promedio >= 70 ? "#16a34a" : d.tir_promedio >= 50 ? "#d97706" : "#dc2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Género y grupo etario en fila */}
          <div className="dashboard-row">
            <div className="card">
              <h3>Comparativa por Género</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart data={genero} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="sexo" type="category" tickFormatter={(v) => v === "F" ? "👧 Niñas" : "👦 Niños"} width={80} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="tir_promedio" radius={[0, 4, 4, 0]} name="TIR %">
                    {genero.map((g, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card card-wide">
              <h3>TIR Promedio por Grupo Etario</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart data={edades} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grupo" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="tir_promedio" fill="#7c3aed" radius={[4, 4, 0, 0]} name="TIR %" />
                  <Bar dataKey="gmi_promedio" fill="#c27803" radius={[4, 4, 0, 0]} name="GMI %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

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
