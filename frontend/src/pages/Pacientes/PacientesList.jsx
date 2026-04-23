import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import { IoLogoWhatsapp } from "react-icons/io";

export default function PacientesList() {
  const navigate  = useNavigate();
  const [pacientes, setPacientes]   = useState([]);
  const [deptos, setDeptos]         = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [institucion, setInstitucion] = useState("HMEP");
  const [filtros, setFiltros]       = useState({
    buscar: "", departamento: "", sexo: "", edad_min: "", edad_max: "", con_monitor: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [clsVis, setClsVis] = useState({ OPTIMO: true, MODERADO: true, ALTO_RIESGO: true });

  // ── WhatsApp modal ────────────────────────────────────────────────────────
  const [modalWA,    setModalWA]    = useState(null); // paciente seleccionado
  const [msgWA,      setMsgWA]      = useState("");
  const [enviandoWA, setEnviandoWA] = useState(false);
  const [resultadoWA, setResultadoWA] = useState(null);

  function generarMensajeWA(paciente, clasificacion) {
    const trato    = paciente.sexo === "F" ? "Estimada" : "Estimado";
    const hospital = paciente.institucion === "HMEP"
      ? "Hospital María de Especialidades Pediátricas"
      : paciente.institucion === "IHSS"
        ? "Instituto Hondureño de Seguridad Social"
        : paciente.institucion || "la institución";

    if (clasificacion === "ALTO_RIESGO") {
      return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Hemos detectado alteraciones en las métricas de tu monitor, vemos alertas con niveles altos en la glucosa, por favor revisa:\n1.- Tu Plan de alimentación\n2.- Cumplimiento de Ejercicio\n3.- Revisa tu dosis de insulina que sean las adecuadas\nSi persiste, por favor comuníquese con su médico tratante para coordinar su próxima cita. Gracias.`;
    } else if (clasificacion === "MODERADO") {
      return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Hemos detectado que las métricas de tu monitor se encuentran en un nivel MODERADO. Te recomendamos revisar:\n1.- Tu Plan de alimentación\n2.- Cumplimiento de Ejercicio\n3.- Tu dosis de insulina\nPor favor comuníquese con su médico tratante para seguimiento. Gracias.`;
    } else if (clasificacion === "OPTIMO") {
      return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Sus métricas de monitoreo continuo de glucosa muestran un control ÓPTIMO. ¡Felicitaciones, siga con su excelente manejo! Recuerde mantener sus citas de seguimiento. Gracias.`;
    }
    return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Por favor comuníquese con su médico tratante para coordinar su próxima cita. Gracias.`;
  }

  function abrirModalWA(paciente) {
    setMsgWA(generarMensajeWA(paciente, paciente.ultima_clasificacion));
    setResultadoWA(null);
    setModalWA(paciente);
  }

  async function enviarWA() {
    if (!msgWA.trim() || !modalWA) return;
    setEnviandoWA(true);
    setResultadoWA(null);
    try {
      await api.post(`/mensajes/enviar/${modalWA.id}`, { mensaje: msgWA.trim() });
      setResultadoWA({ ok: true });
      setMsgWA("");
    } catch (err) {
      setResultadoWA({ ok: false, error: err.response?.data?.error || "Error al enviar" });
    } finally {
      setEnviandoWA(false);
    }
  }

  useEffect(() => {
    api.get("/pacientes/departamentos").then((r) => setDeptos(r.data));
  }, []);

  useEffect(() => {
    const params = { institucion };
    if (filtros.buscar)       params.buscar       = filtros.buscar;
    if (filtros.departamento) params.departamento = filtros.departamento;
    if (filtros.sexo)         params.sexo         = filtros.sexo;
    if (filtros.edad_min)     params.edad_min     = filtros.edad_min;
    if (filtros.edad_max)     params.edad_max     = filtros.edad_max;
    if (filtros.con_monitor !== "") params.con_monitor = filtros.con_monitor;

    setCargando(true);
    api.get("/pacientes", { params })
      .then((r) => setPacientes(r.data))
      .finally(() => setCargando(false));
  }, [filtros, institucion]);

  function cambiarFiltro(e) {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este paciente?")) return;
    await api.delete(`/pacientes/${id}`);
    setPacientes(pacientes.filter((p) => p.id !== id));
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p className="page-subtitle">Gestión y búsqueda de pacientes</p>
          <Link to="/pacientes/nuevo" className="btn btn-primary" style={{ marginTop: 8 }}>+ Nuevo Paciente</Link>
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
      </div>

      {/* Filtros */}
      <div className="card filtros-card">
        {/* Barra de búsqueda + botón expandir (siempre visible) */}
        <div className="filtros-topbar">
          <div className="form-group" style={{ flex: 1 }}>
            <input
              type="text" name="buscar" placeholder="Buscar paciente..."
              value={filtros.buscar} onChange={cambiarFiltro}
            />
          </div>
          <button
            className={`btn btn-outline btn-sm filtros-toggle ${mostrarFiltros ? "activo" : ""}`}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            type="button"
          >
            ⋮ Filtros{(filtros.departamento || filtros.sexo || filtros.edad_min || filtros.edad_max || filtros.con_monitor !== "") ? " ●" : ""}
          </button>
        </div>

        {/* Filtros extra — colapsables en móvil, siempre visibles en desktop */}
        <div className={`filtros-extra ${mostrarFiltros ? "abierto" : ""}` }>
          <div className="filtros-grid-extra">
            <div className="form-group">
              <label>Departamento</label>
              <select name="departamento" value={filtros.departamento} onChange={cambiarFiltro}>
                <option value="">Todos</option>
                {deptos.map((d) => <option key={d} value={d}>{d.length > 30 ? d.slice(0, 30) + "…" : d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Género</label>
              <select name="sexo" value={filtros.sexo} onChange={cambiarFiltro}>
                <option value="">Todos</option>
                <option value="F">Niñas (F)</option>
                <option value="M">Niños (M)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Edad mín.</label>
              <input type="number" name="edad_min" placeholder="0" value={filtros.edad_min} onChange={cambiarFiltro} min={0} />
            </div>
            <div className="form-group">
              <label>Edad máx.</label>
              <input type="number" name="edad_max" placeholder="18" value={filtros.edad_max} onChange={cambiarFiltro} min={0} />
            </div>
            <div className="form-group">
              <label>Monitor MCG</label>
              <select name="con_monitor" value={filtros.con_monitor} onChange={cambiarFiltro}>
                <option value="">Todos</option>
                <option value="1">Con monitor</option>
                <option value="0">Sin monitor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            Pacientes {institucion} ({pacientes.filter((p) => !p.ultima_clasificacion || clsVis[p.ultima_clasificacion]).length})
          </h3>
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
                  transition: "background 0.2s", flexShrink: 0, display: "inline-block",
                }}>
                  <span style={{
                    position: "absolute", top: 2,
                    left: clsVis[key] ? 14 : 2,
                    width: 12, height: 12, borderRadius: "50%",
                    background: "#fff", transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
        {cargando ? (
          <div className="loading">Cargando pacientes...</div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="hide-mobile">#</th>
                  <th>Nombre</th>
                  <th className="hide-mobile">Edad</th>
                  <th className="hide-mobile">Género</th>
                  <th>Departamento</th>
                  <th className="hide-mobile">Tipo DM</th>
                  <th className="hide-mobile">HbA1c prev.</th>
                  <th>TIR</th>
                  <th className="hide-mobile">Monitor</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.filter((p) => !p.ultima_clasificacion || clsVis[p.ultima_clasificacion]).map((p, idx) => (
                  <tr key={p.id}>
                    <td className="hide-mobile" style={{ color: "#64748b", fontSize: "0.85rem" }}>{idx + 1}</td>
                    <td>
                      <Link to={`/pacientes/${p.id}`} className="link-paciente">
                        {p.nombre}
                      </Link>
                    </td>
                    <td className="hide-mobile">{p.edad} años</td>
                    <td className="hide-mobile">
                      <span className={`badge ${p.sexo === "F" ? "badge-pink" : "badge-blue"}`}>
                        {p.sexo === "F" ? "👧 Niña" : "👦 Niño"}
                      </span>
                    </td>
                    <td>{p.departamento}</td>
                    <td className="hide-mobile">{p.tipo_diabetes || "—"}</td>
                    <td className="hide-mobile">{p.hba1c_previo ? `${p.hba1c_previo}%` : "—"}</td>
                    <td>
                      {p.tir_promedio != null
                        ? <span className={`badge-tir ${p.ultima_clasificacion === "OPTIMO" ? "ok" : p.ultima_clasificacion === "MODERADO" ? "warn" : "bad"}`}>{p.tir_promedio}%</span>
                        : <span style={{ color: "#64748b", fontSize: 12 }}>—</span>}
                    </td>
                    <td className="hide-mobile">
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
                        background: p.con_monitor ? "#ede9fe" : "#f1f5f9",
                        color: p.con_monitor ? "#6366f1" : "#94a3b8",
                      }}>
                        {p.con_monitor ? "🟣 Con MCG" : "Sin MCG"}
                      </span>
                    </td>
                    <td>
                      <div className="acciones">
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/pacientes/${p.id}`)}>Ver</button>
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/pacientes/${p.id}/editar`)}>Editar</button>
                        <button
                          className="btn btn-sm btn-whatsapp"
                          onClick={() => abrirModalWA(p)}
                          title={`Enviar WhatsApp a ${p.nombre}`}
                        >
                          <IoLogoWhatsapp size={15} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => eliminar(p.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pacientes.length === 0 && (
                  <tr><td colSpan={6} className="empty-cell">No se encontraron pacientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal WhatsApp ─────────────────────────────────────────────── */}
      {modalWA && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#0f172a" }}>
                <IoLogoWhatsapp size={22} color="#25d366" /> Enviar WhatsApp
              </h3>
              <button onClick={() => setModalWA(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            <p style={{ margin: "0 0 4px", fontSize: "0.82rem", color: "#64748b" }}>
              Destinatario: <strong style={{ color: "#0f172a" }}>{modalWA.nombre}</strong>
            </p>
            <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#64748b" }}>
              Teléfono: <strong style={{ color: "#0f172a" }}>{modalWA.telefono || "Sin teléfono registrado"}</strong>
            </p>

            {!modalWA.telefono ? (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem", color: "#dc2626" }}>
                Este paciente no tiene teléfono registrado. Edítalo para agregarlo.
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "#374151", marginBottom: "0.35rem" }}>Mensaje *</label>
                <textarea
                  rows={5}
                  value={msgWA}
                  onChange={e => setMsgWA(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", resize: "vertical", fontFamily: "inherit", marginBottom: "1rem" }}
                />
                {resultadoWA?.ok && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "#16a34a", marginBottom: "0.75rem" }}>
                    ✅ Mensaje enviado correctamente
                  </div>
                )}
                {resultadoWA?.ok === false && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "#dc2626", marginBottom: "0.75rem" }}>
                    ❌ {resultadoWA.error}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" onClick={() => setModalWA(null)} disabled={enviandoWA}>Cancelar</button>
                  <button
                    onClick={enviarWA}
                    disabled={enviandoWA || !msgWA.trim()}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: enviandoWA ? "#86efac" : "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: enviandoWA ? "not-allowed" : "pointer" }}
                  >
                    <IoLogoWhatsapp size={16} /> {enviandoWA ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
