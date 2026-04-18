import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FiTrash2, FiEdit2, FiEye, FiArrowLeft, FiUpload, FiEdit3 } from "react-icons/fi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import SemaforoISPAD from "../../components/SemaforoISPAD";

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
  const [paciente, setPaciente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);
  const [modalEliminar, setModalEliminar] = useState(null); // { id, fecha }
  const [eliminando, setEliminando] = useState(false);
  const [modalEditar, setModalEditar] = useState(null); // analisis object
  const [editForm, setEditForm] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [modalVer, setModalVer] = useState(null); // analisis object

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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get(`/pacientes/${id}`),
      api.get(`/pacientes/${id}/historial`),
    ]).then(([p, h]) => {
      setPaciente(p.data);
      setHistorial(h.data);
    }).finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <Layout><div className="loading">Cargando paciente...</div></Layout>;
  if (!paciente) return <Layout><div className="login-error">Paciente no encontrado</div></Layout>;

  const ultimoAnalisis = historial[0];

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
  }));

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/pacientes" className="back-btn" title="Volver a Pacientes">
            <FiArrowLeft size={18} />
          </Link>
          <div className="patient-avatar">
            {paciente.nombre?.[0]?.toUpperCase()}
          </div>
          <div>
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
          <Link to={`/pacientes/${id}/editar`} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FiEdit3 size={15} /> Editar
          </Link>
        </div>
      </div>

      {/* ── Layout principal: izquierda info+tutor / derecha semáforo ── */}
      <div className="detalle-grid" style={{ alignItems: "start", marginBottom: 16 }}>

        {/* COLUMNA IZQUIERDA: datos del paciente + tutor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Información del Paciente</h3>
            <table className="info-tabla">
              <tbody>
                <InfoFila label="DNI / Expediente"    valor={paciente.dni || "—"} />
                <InfoFila label="Fecha Nacimiento"     valor={paciente.fecha_nacimiento?.split("T")[0] || "—"} />
                <InfoFila label="Edad actual"          valor={paciente.edad != null ? `${paciente.edad} años` : "—"} />
                <InfoFila label="Edad al debut"        valor={paciente.edad_debut != null ? `${paciente.edad_debut} años` : "—"} />
                <InfoFila label="Género"               valor={paciente.sexo === "F" ? "👧 Femenino" : "👦 Masculino"} />
                <InfoFila label="Institución"          valor={paciente.institucion || "—"} />
                <InfoFila label="Tipo Diabetes"        valor={paciente.tipo_diabetes || "—"} />
                {paciente.subtipo_monogenica && <InfoFila label="Subtipo Monogénica"  valor={paciente.subtipo_monogenica} />}
                <InfoFila label="Peso"                 valor={paciente.peso  ? `${Number(paciente.peso).toFixed(1)} kg`  : "—"} />
                <InfoFila label="Talla"                valor={paciente.talla ? `${Number(paciente.talla).toFixed(1)} cm` : "—"} />
                {paciente.hba1c_previo          && <InfoFila label="HbA1c previo"      valor={`${paciente.hba1c_previo}%`} />}
                {paciente.tipo_insulina         && <InfoFila label="Tipo de insulina"   valor={paciente.tipo_insulina} />}
                {paciente.dosis_por_kg          && <InfoFila label="Dosis por Kg"       valor={paciente.dosis_por_kg} />}
                {paciente.promedio_glucometrias && <InfoFila label="Glucometrías / día" valor={paciente.promedio_glucometrias} />}
                <InfoFila label="Departamento"         valor={paciente.departamento || "—"} />
                {paciente.municipio        && <InfoFila label="Municipio"    valor={paciente.municipio} />}
                {paciente.procedencia_tipo && <InfoFila label="Procedencia"  valor={paciente.procedencia_tipo} />}
                {paciente.telefono         && <InfoFila label="Teléfono"     valor={paciente.telefono} />}
                {paciente.direccion        && <InfoFila label="Dirección"    valor={paciente.direccion} />}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 0 }}>👨‍👩‍👧 Datos del Tutor</h3>
            <table className="info-tabla">
              <tbody>
                <InfoFila label="Nombre"   valor={paciente.nombre_tutor   || "—"} />
                <InfoFila label="Teléfono" valor={paciente.telefono_tutor || "—"} />
              </tbody>
            </table>
          </div>

          {paciente.antecedente_familiar && (
            <div className="card">
              <h3 style={{ marginBottom: 0 }}>🧬 Antecedentes Familiares</h3>
              <p style={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                {paciente.antecedente_familiar}
              </p>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: último análisis + guía de métricas */}
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

          {/* Tarjeta: guía de métricas MCG */}
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
                <div>
                  <strong>TAR Muy Alto</strong> — Tiempo sobre rango (&gt; 250 mg/dL)
                  <span className="guia-meta">Objetivo: &lt; 5%</span>
                </div>
              </div>
              <div className="guia-item">
                <span className="guia-dot" style={{ background: "#FDD94F" }} />
                <div>
                  <strong>TAR Alto</strong> — Tiempo sobre rango (181–250 mg/dL)
                  <span className="guia-meta">Objetivo: &lt; 25%</span>
                </div>
              </div>
              <div className="guia-item">
                <span className="guia-dot" style={{ background: "#76B250" }} />
                <div>
                  <strong>TIR</strong> — Tiempo en Rango (70–180 mg/dL)
                  <span className="guia-meta">Objetivo: ≥ 70%</span>
                </div>
              </div>
              <div className="guia-item">
                <span className="guia-dot" style={{ background: "#FB0D0A" }} />
                <div>
                  <strong>TBR Bajo</strong> — Tiempo bajo rango (54–69 mg/dL)
                  <span className="guia-meta">Objetivo: &lt; 4%</span>
                </div>
              </div>
              <div className="guia-item">
                <span className="guia-dot" style={{ background: "#86270C" }} />
                <div>
                  <strong>TBR Muy Bajo</strong> — Tiempo bajo rango (&lt; 54 mg/dL)
                  <span className="guia-meta">Objetivo: &lt; 1%</span>
                </div>
              </div>
              <div className="guia-item">
                <span className="guia-dot" style={{ background: "#c27803" }} />
                <div>
                  <strong>GMI</strong> — Indicador de Gestión de Glucosa
                  <span className="guia-meta">Estimado de HbA1c a partir del sensor</span>
                </div>
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

      {/* Gráficas de evolución */}
      {chartData.length > 0 && (
        <>
          {/* Gráfica principal: barras apiladas TIR / TAR / TBR */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>📊 Comparación de Registros MCG — TIR / TAR / TBR</h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 12 }}>
              Cada barra representa un registro de monitoreo. Objetivo: TIR ≥ 70% (verde), TAR ≤ 25%, TBR ≤ 4%.
            </p>
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <BarChart data={chartData} margin={{ top: 16, right: 20, left: -10, bottom: 5 }}>
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

          {/* Fila de gráficas secundarias */}
          <div className="dashboard-row">
            <div className="card card-wide">
              <h3>GMI y CV por registro</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 165 : 200}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 60]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => `${v?.toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={7} stroke="#c27803" strokeDasharray="4 4" label={{ value: "GMI 7%", fontSize: 10, fill: "#c27803" }} />
                  <ReferenceLine y={36} stroke="#7c3aed" strokeDasharray="4 4" label={{ value: "CV 36%", fontSize: 10, fill: "#7c3aed" }} />
                  <Bar dataKey="GMI" name="GMI %" fill="#c27803" radius={[4,4,0,0]} label={{ position: "top", fontSize: 10, formatter: v => v > 0 ? `${v}%` : "" }} />
                  <Bar dataKey="CV"  name="CV %"  fill="#7c3aed" radius={[4,4,0,0]} label={{ position: "top", fontSize: 10, formatter: v => v > 0 ? `${v}%` : "" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3>GRI por registro</h3>
              <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>Zona A: 0-20 (ideal) · B: 20-40 · C: 40-60 · D: 60-80 · E: &gt;80</p>
              <ResponsiveContainer width="100%" height={isMobile ? 165 : 200}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => v} />
                  <ReferenceLine y={20} stroke="#16a34a" strokeDasharray="3 3" />
                  <ReferenceLine y={40} stroke="#d97706" strokeDasharray="3 3" />
                  <Bar dataKey="GRI" name="GRI" radius={[4,4,0,0]}
                    label={{ position: "top", fontSize: 10, formatter: v => v > 0 ? v : "" }}>
                    {chartData.map(d => (
                      <Cell key={d.label}
                        fill={d.GRI <= 20 ? "#16a34a" : d.GRI <= 40 ? "#d97706" : d.GRI <= 60 ? "#f59e0b" : "#dc2626"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Historial de análisis */}
      <div className="card">
        <h3>Historial de Análisis ({historial.length})</h3>
        <div className="table-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nº MCG</th>
                <th>Fecha</th>
                <th>TIR</th>
                <th className="hide-mobile">TAR</th>
                <th className="hide-mobile">TBR</th>
                <th>GMI</th>
                <th className="hide-mobile">CV</th>
                <th className="hide-mobile">T. Activo</th>
                <th className="hide-mobile">G. Promedio</th>
                <th>Clasificación</th>
                <th>PDF</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((a) => (
                <tr key={a.id}>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#3b82f6" }}>
                    {a.numero_registro ?? "—"}
                  </td>
                  <td>{a.fecha ? new Date(a.fecha).toLocaleString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td><span className={`badge-tir ${a.tir >= 70 ? "ok" : a.tir >= 50 ? "warn" : "bad"}`}>{a.tir}%</span></td>
                  <td className="hide-mobile">{a.tar}%</td>
                  <td className="hide-mobile">{a.tbr}%</td>
                  <td>{a.gmi}%</td>
                  <td className="hide-mobile">{a.cv}%</td>
                  <td className="hide-mobile">{a.tiempo_activo}%</td>
                  <td className="hide-mobile">{a.glucosa_promedio} mg/dL</td>
                  <td><ClasificacionBadge valor={a.clasificacion} /></td>
                  <td>
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
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <button
                      onClick={() => setModalVer(a)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#0ea5e9", padding: "2px 6px", borderRadius: 4,
                        fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                      }}
                      title="Ver detalle"
                    ><FiEye size={16} /></button>
                    <button
                      onClick={() => abrirEditar(a)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#3b82f6", padding: "2px 6px", borderRadius: 4,
                        fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                      }}
                      title="Editar análisis"
                    ><FiEdit2 size={16} /></button>
                    <button
                      onClick={() => setModalEliminar({ id: a.id, fecha: a.fecha })}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#dc2626", padding: "2px 6px", borderRadius: 4,
                        fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                      }}
                      title="Eliminar análisis"
                    ><FiTrash2 size={16} /></button>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>

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
    </Layout>
  );
}

function InfoFila({ label, valor }) {
  return (
    <tr>
      <td className="info-label">{label}</td>
      <td className="info-valor">{valor}</td>
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
