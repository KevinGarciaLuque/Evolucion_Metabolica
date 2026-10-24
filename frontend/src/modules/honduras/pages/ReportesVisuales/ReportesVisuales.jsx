import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, Legend,
} from "recharts";
import { motion } from "framer-motion";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import InstSelector from "../../components/InstSelector";

const hoverCard = {
  whileHover: { y: -6, scale: 1.03, boxShadow: "0 14px 28px rgba(0,0,0,0.14)", transition: { type: "spring", stiffness: 320, damping: 22 } },
  whileTap: { scale: 0.98 },
};

function descargarBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function promedio(arr, key, dec = 1) {
  const values = arr.map((x) => Number(x[key])).filter((v) => !Number.isNaN(v));
  if (!values.length) return 0;
  return Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(dec));
}

export default function ReportesVisuales() {
  const { usuario, institucion, setInstitucion } = useAuth();
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({
    buscar: "",
    departamento: "",
    sexo: "",
    clasificacion: "",
    institucion,
    fecha_desde: "",
    fecha_hasta: "",
  });

  const cargar = async (f = filtros) => {
    setCargando(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
      const { data } = await api.get("/reportes-visuales", { params });
      setRows(data || []);
    } finally {
      setCargando(false);
    }
  };

  // Re-carga automáticamente cuando cambia la institución global
  useEffect(() => {
    const nuevosFiltros = { ...filtros, institucion };
    setFiltros(nuevosFiltros);
    cargar(nuevosFiltros);
  }, [institucion]);

  const departamentos = useMemo(() => {
    return [...new Set(rows.map((r) => r.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const kpis = useMemo(() => {
    const pacientesUnicos = new Set(rows.map((r) => r.paciente_id)).size;
    const total = rows.length;
    const tir = promedio(rows, "tir");
    const gmi = promedio(rows, "gmi", 2);
    const optimos = rows.filter((r) => r.clasificacion === "OPTIMO").length;
    const pctOptimos = total ? Number(((optimos / total) * 100).toFixed(1)) : 0;
    return { pacientesUnicos, total, tir, gmi, pctOptimos };
  }, [rows]);

  const porClasificacion = useMemo(() => {
    const base = { OPTIMO: 0, MODERADO: 0, ALTO_RIESGO: 0 };
    rows.forEach((r) => {
      if (base[r.clasificacion] !== undefined) base[r.clasificacion] += 1;
    });
    return [
      { name: "Optimo", value: base.OPTIMO, color: "#16a34a" },
      { name: "Moderado", value: base.MODERADO, color: "#d97706" },
      { name: "Alto Riesgo", value: base.ALTO_RIESGO, color: "#dc2626" },
    ];
  }, [rows]);

  const tendenciaMensual = useMemo(() => {
    const mapa = {};
    rows.forEach((r) => {
      if (!r.fecha) return;
      const key = String(r.fecha).slice(0, 7);
      if (!mapa[key]) mapa[key] = { key, tir: [], gmi: [] };
      if (!Number.isNaN(Number(r.tir))) mapa[key].tir.push(Number(r.tir));
      if (!Number.isNaN(Number(r.gmi))) mapa[key].gmi.push(Number(r.gmi));
    });
    return Object.values(mapa)
      .map((m) => ({
        mes: m.key,
        tir: m.tir.length ? Number((m.tir.reduce((s, v) => s + v, 0) / m.tir.length).toFixed(1)) : 0,
        gmi: m.gmi.length ? Number((m.gmi.reduce((s, v) => s + v, 0) / m.gmi.length).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [rows]);

  async function exportarExcel() {
    setExportando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ""));
      const resp = await api.get("/reportes-visuales/export-excel", { params, responseType: "blob" });
      const fecha = new Date().toISOString().slice(0, 10);
      descargarBlob(resp.data, `reporte_visual_${fecha}.xlsx`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p className="page-subtitle">Informes visuales clínicos con filtros y exportación profesional a Excel</p>
        </div>
        <InstSelector institucion={institucion} setInstitucion={setInstitucion} usuario={usuario} />
      </div>

      <div className="card filtros-card">
        <div className="filtros-grid-extra">
          <div className="form-group">
            <label>Buscar por nombre o DNI</label>
            <input value={filtros.buscar} onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })} placeholder="Paciente o DNI" />
          </div>
          <div className="form-group">
            <label>Departamento</label>
            <select value={filtros.departamento} onChange={(e) => setFiltros({ ...filtros, departamento: e.target.value })}>
              <option value="">Todos</option>
              {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Sexo</label>
            <select value={filtros.sexo} onChange={(e) => setFiltros({ ...filtros, sexo: e.target.value })}>
              <option value="">Todos</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div className="form-group">
            <label>Clasificación</label>
            <select value={filtros.clasificacion} onChange={(e) => setFiltros({ ...filtros, clasificacion: e.target.value })}>
              <option value="">Todas</option>
              <option value="OPTIMO">Óptimo</option>
              <option value="MODERADO">Moderado</option>
              <option value="ALTO_RIESGO">Alto Riesgo</option>
            </select>
          </div>
          <div className="form-group">
            <label>Institución</label>
            <select value={filtros.institucion} onChange={(e) => setFiltros({ ...filtros, institucion: e.target.value })}>
              <option value="">Todas</option>
              <option value="HMEP">HMEP</option>
              <option value="IHSS">IHSS</option>
            </select>
          </div>
          <div className="form-group">
            <label>Desde</label>
            <input type="date" value={filtros.fecha_desde} onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input type="date" value={filtros.fecha_hasta} onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={cargar}>Aplicar filtros</button>
          <button className="btn btn-outline" onClick={() => { setFiltros({ buscar: "", departamento: "", sexo: "", clasificacion: "", institucion, fecha_desde: "", fecha_hasta: "" }); }}>Limpiar</button>
          <button className="btn btn-outline" onClick={exportarExcel} disabled={exportando}>
            {exportando ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <motion.div className="stat-card stat-card-blue" {...hoverCard}><div><p className="stat-value">{kpis.total}</p><p className="stat-label">Total análisis</p></div></motion.div>
        <motion.div className="stat-card stat-card-green" {...hoverCard}><div><p className="stat-value">{kpis.pacientesUnicos}</p><p className="stat-label">Pacientes únicos</p></div></motion.div>
        <motion.div className="stat-card stat-card-orange" {...hoverCard}><div><p className="stat-value">{kpis.tir}%</p><p className="stat-label">TIR promedio</p></div></motion.div>
        <motion.div className="stat-card stat-card-purple" {...hoverCard}><div><p className="stat-value">{kpis.gmi}%</p><p className="stat-label">GMI promedio</p></div></motion.div>
        <motion.div className="stat-card stat-card-red" {...hoverCard}><div><p className="stat-value">{kpis.pctOptimos}%</p><p className="stat-label">% en óptimo</p></div></motion.div>
      </div>

      <div className="dashboard-row">
        <div className="card">
          <h3>Distribución por clasificación ISPAD</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porClasificacion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {porClasificacion.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-wide">
          <h3>Tendencia mensual (TIR y GMI)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tendenciaMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tir" stroke="#1d4ed8" strokeWidth={2.4} name="TIR %" />
              <Line type="monotone" dataKey="gmi" stroke="#d97706" strokeWidth={2.4} name="GMI %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Detalle de análisis</h3>
        {cargando ? (
          <div className="loading">Cargando información...</div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th className="hide-mobile">Departamento</th>
                  <th>TIR</th>
                  <th className="hide-mobile">GMI</th>
                  <th className="hide-mobile">CV</th>
                  <th>Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fecha ? String(r.fecha).slice(0, 10) : "—"}</td>
                    <td>{r.paciente_nombre}</td>
                    <td>{r.paciente_dni || "—"}</td>
                    <td className="hide-mobile">{r.departamento || "—"}</td>
                    <td>{r.tir ?? "—"}%</td>
                    <td className="hide-mobile">{r.gmi ?? "—"}%</td>
                    <td className="hide-mobile">{r.cv ?? "—"}%</td>
                    <td>
                      <span className={`badge ${r.clasificacion === "OPTIMO" ? "badge-ok" : r.clasificacion === "MODERADO" ? "badge-warn" : "badge-bad"}`}>
                        {r.clasificacion === "OPTIMO" ? "Óptimo" : r.clasificacion === "MODERADO" ? "Moderado" : "Alto Riesgo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="empty-cell">Sin resultados para los filtros aplicados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
