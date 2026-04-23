import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const TIPO_BADGE = {
  Presencial:   "badge-green",
  Telemedicina: "badge-blue",
  Control:      "badge-yellow",
  Urgencia:     "badge-red",
  Otro:         "badge-gray",
};

function hoy() {
  return new Date().toISOString().split("T")[0];
}

export default function ConsultasList() {
  const navigate = useNavigate();
  const [entradas, setEntradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({
    paciente_nombre: "", fecha_desde: "", fecha_hasta: hoy(),
  });

  useEffect(() => {
    const params = {};
    if (filtros.paciente_nombre) params.paciente_nombre = filtros.paciente_nombre;
    if (filtros.fecha_desde)     params.fecha_desde     = filtros.fecha_desde;
    if (filtros.fecha_hasta)     params.fecha_hasta     = filtros.fecha_hasta;
    setCargando(true);
    api.get("/consultas", { params })
      .then((r) => setEntradas(r.data))
      .finally(() => setCargando(false));
  }, [filtros]);

  function cambiarFiltro(e) {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este registro clínico?")) return;
    await api.delete(`/consultas/${id}`);
    setEntradas(entradas.filter((e) => e.id !== id));
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Consultas</h1>
          <p className="page-subtitle">Registro de consultas y seguimiento de pacientes</p>
        </div>
        <Link to="/consultas/nueva" className="btn btn-primary">+ Nueva Consulta</Link>
      </div>

      {/* Filtros */}
      <div className="card filtros-card">
        <div className="filtros-grid-extra" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <div className="form-group">
            <label>Buscar paciente</label>
            <input
              type="text"
              name="paciente_nombre"
              placeholder="Nombre del paciente..."
              value={filtros.paciente_nombre}
              onChange={cambiarFiltro}
            />
          </div>
          <div className="form-group">
            <label>Desde</label>
            <input type="date" name="fecha_desde" value={filtros.fecha_desde} onChange={cambiarFiltro} />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input type="date" name="fecha_hasta" value={filtros.fecha_hasta} onChange={cambiarFiltro} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header-row">
          <h3>Entradas ({entradas.length})</h3>
        </div>

        {cargando ? (
          <p className="text-center" style={{ padding: "32px 0", color: "#94a3b8" }}>Cargando...</p>
        ) : entradas.length === 0 ? (
          <p className="text-center" style={{ padding: "32px 0", color: "#94a3b8" }}>No hay entradas registradas.</p>
        ) : (
        <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th className="hide-mobile">Tipo</th>
                  <th className="hide-mobile">Glucosa ayunas</th>
                  <th className="hide-mobile">HbA1c</th>
                  <th className="hide-mobile">Próxima cita</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>{e.fecha?.split("T")[0]}</td>
                    <td>
                      <Link to={`/pacientes/${e.paciente_id}`} className="link-paciente">
                        {e.paciente_nombre}
                      </Link>
                      {e.paciente_dni && <span className="text-muted" style={{ fontSize: "0.75rem", marginLeft: 6 }}>({e.paciente_dni})</span>}
                      <div className="show-mobile-only" style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className={`badge ${TIPO_BADGE[e.tipo_consulta] || "badge-gray"}`}>{e.tipo_consulta}</span>
                        {e.hba1c != null && <span className="badge badge-gray">HbA1c: {e.hba1c}%</span>}
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <span className={`badge ${TIPO_BADGE[e.tipo_consulta] || "badge-gray"}`}>
                        {e.tipo_consulta}
                      </span>
                    </td>
                    <td className="hide-mobile">{e.glucosa_ayunas != null ? `${e.glucosa_ayunas} mg/dL` : "—"}</td>
                    <td className="hide-mobile">{e.hba1c != null ? `${e.hba1c}%` : "—"}</td>
                    <td className="hide-mobile">{e.proxima_cita?.split("T")[0] || "—"}</td>
                    <td>
                      <div className="acciones">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/consultas/${e.id}/editar`)}
                        >Editar</button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => eliminar(e.id)}
                        >Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
