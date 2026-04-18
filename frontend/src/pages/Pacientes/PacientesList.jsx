import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

// Formatea el teléfono para wa.me (código de Honduras: 504)
function formatearWA(tel) {
  const digits = (tel || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("504") && digits.length >= 11) return digits;
  if (digits.length === 8) return `504${digits}`;
  return digits;
}

// Genera el mensaje pre-escrito según el nivel de HbA1c
function generarMensajeWA(p) {
  const hba1c = p.hba1c_previo ? parseFloat(p.hba1c_previo) : null;
  let alerta = "";
  if (hba1c !== null && hba1c > 9) {
    alerta = ` Su control reciente de HbA1c es ${hba1c}%, lo cual se clasifica como ALTO RIESGO y requiere atención médica urgente.`;
  } else if (hba1c !== null && hba1c > 7) {
    alerta = ` Su control reciente de HbA1c es ${hba1c}%, clasificado como MODERADO y requiere seguimiento.`;
  } else if (hba1c !== null) {
    alerta = ` Su control reciente de HbA1c es ${hba1c}%.`;
  }
  return encodeURIComponent(
    `Estimado/a ${p.nombre}, le contactamos del Programa Evolución Metabólica (${p.institucion || "HMEP"}).${alerta} Por favor comuníquese con su médico tratante para coordinar su próxima cita. Gracias.`
  );
}

function WhatsAppBtn({ paciente }) {
  const numero = formatearWA(paciente.telefono);
  if (!numero) return null;
  const url = `https://wa.me/${numero}?text=${generarMensajeWA(paciente)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-sm btn-whatsapp"
      title={`Contactar por WhatsApp: ${paciente.telefono}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

export default function PacientesList() {
  const navigate  = useNavigate();
  const [pacientes, setPacientes]   = useState([]);
  const [deptos, setDeptos]         = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [institucion, setInstitucion] = useState("HMEP");
  const [filtros, setFiltros]       = useState({
    buscar: "", departamento: "", sexo: "", edad_min: "", edad_max: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

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
            ⋮ Filtros{(filtros.departamento || filtros.sexo || filtros.edad_min || filtros.edad_max) ? " ●" : ""}
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
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header-row">
          <h3>
            Pacientes {institucion} ({pacientes.length})
          </h3>
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p, idx) => (
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
                      <div className="acciones">
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/pacientes/${p.id}`)}>Ver</button>
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/pacientes/${p.id}/editar`)}>Editar</button>
                        <WhatsAppBtn paciente={p} />
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
    </Layout>
  );
}
