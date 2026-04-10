import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

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
        </div>
        <Link to="/pacientes/nuevo" className="btn btn-primary">+ Nuevo Paciente</Link>
      </div>

      {/* Toggle HMEP / IHSS */}
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
