import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import SemaforoISPAD from "../../components/SemaforoISPAD";

// ─── Colores por clasificación ──────────────────────────────────────────────
const COLORS_CLASIF = { OPTIMO: "#16a34a", MODERADO: "#d97706", ALTO_RIESGO: "#dc2626" };

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
        <div>
          <Link to="/pacientes" className="breadcrumb">← Pacientes</Link>
          <h1>{paciente.nombre}</h1>
          <p className="page-subtitle">
            {paciente.sexo === "F" ? "👧" : "👦"} {paciente.edad} años · {paciente.departamento} · {paciente.tipo_diabetes}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/analisis/subir?paciente=${id}`} className="btn btn-primary">📄 Subir PDF</Link>
          <Link to={`/pacientes/${id}/editar`} className="btn btn-outline">Editar</Link>
        </div>
      </div>

      {/* Info básica */}
      <div className="detalle-grid">
        <div className="card info-card">
          <h3>Información del Paciente</h3>
          <table className="info-tabla">
            <tbody>
              <InfoFila label="DNI/Expediente"  valor={paciente.dni || "—"} />
              <InfoFila label="Fecha Nacimiento" valor={paciente.fecha_nacimiento?.split("T")[0] || "—"} />
              <InfoFila label="Género"           valor={paciente.sexo === "F" ? "👧 Femenino" : "👦 Masculino"} />
              <InfoFila label="Peso"             valor={paciente.peso ? `${paciente.peso} kg` : "—"} />
              <InfoFila label="Talla"            valor={paciente.talla ? `${paciente.talla} cm` : "—"} />
              <InfoFila label="Tipo Diabetes"    valor={paciente.tipo_diabetes || "—"} />
              <InfoFila label="Departamento"     valor={paciente.departamento} />
              <InfoFila label="Institución"      valor={paciente.institucion || "—"} />
              {paciente.hba1c_previo && <InfoFila label="HbA1c previo" valor={`${paciente.hba1c_previo}%`} />}
              {paciente.telefono && <InfoFila label="Teléfono" valor={paciente.telefono} />}
            </tbody>
          </table>
        </div>

        {/* Semáforo del último análisis */}
        {ultimoAnalisis && (
          <div className="card">
            <h3>Último Análisis · {ultimoAnalisis.fecha}</h3>
            <SemaforoISPAD
              tir={Number(ultimoAnalisis.tir)}
              tar={Number(ultimoAnalisis.tar)}
              tbr={Number(ultimoAnalisis.tbr)}
              gmi={Number(ultimoAnalisis.gmi)}
              clasificacion={ultimoAnalisis.clasificacion}
            />
          </div>
        )}
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
                <Bar dataKey="TIR" name="TIR %" stackId="a" fill="#1d4ed8" radius={[0,0,0,0]}>
                  {chartData.map((d) => (
                    <Cell key={d.label} fill={d.TIR >= 70 ? "#16a34a" : d.TIR >= 50 ? "#d97706" : "#dc2626"} />
                  ))}
                </Bar>
                <Bar dataKey="TAR" name="TAR %" stackId="b" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="TBR" name="TBR %" stackId="c" fill="#ef4444" radius={[4,4,0,0]} />
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
              </tr>
            </thead>
            <tbody>
              {historial.map((a) => (
                <tr key={a.id}>
                  <td>{a.fecha}</td>
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
                        href={`http://localhost:3001/uploads/pdfs/${a.archivo_pdf}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-small"
                      >
                        Ver PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-cell">
                    No hay análisis aún.{" "}
                    <Link to={`/analisis/subir?paciente=${id}`}>Subir primer PDF →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
