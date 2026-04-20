import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";

const ROL_BADGE = {
  admin:     "badge-purple",
  doctor:    "badge-blue",
  asistente: "badge-pink",
};

const ROL_LABEL = {
  admin:     "Admin",
  doctor:    "Doctor",
  asistente: "Asistente",
};

export default function UsuariosList() {
  const navigate = useNavigate();
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState(null);
  const [buscar, setBuscar]     = useState("");

  useEffect(() => {
    setCargando(true);
    setError(null);
    api.get("/usuarios")
      .then((r) => setUsuarios(r.data))
      .catch((err) => {
        const msg = err.response?.data?.error || err.message || "Error al cargar usuarios";
        const status = err.response?.status;
        setError(status === 403 ? "Acceso denegado: se requiere rol administrador" : msg);
      })
      .finally(() => setCargando(false));
  }, []);

  async function eliminar(id, nombre) {
    if (!confirm(`¿Desactivar al usuario "${nombre}"?`)) return;
    try {
      await api.delete(`/usuarios/${id}`);
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, estado: 0 } : u));
    } catch (err) {
      alert(err.response?.data?.error || "Error al eliminar usuario");
    }
  }

  const filtrados = usuarios.filter((u) =>
    u.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    u.email.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Usuarios</h1>
          <p className="page-subtitle">Gestión de accesos al sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/usuarios/nuevo")}>
          + Nuevo Usuario
        </button>
      </div>

      <div className="card filtros-card">
        <div className="form-group" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header-row">
          <h3>Usuarios del sistema ({filtrados.length})</h3>
        </div>

        {cargando ? (
          <div className="loading">Cargando usuarios...</div>
        ) : error ? (
          <div style={{ padding: "20px", color: "#ef4444", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span> {error}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="hide-mobile">#</th>
                  <th>Nombre</th>
                  <th className="hide-mobile">Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="hide-mobile">Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u, idx) => (
                  <tr key={u.id}>
                    <td className="hide-mobile" style={{ color: "#64748b", fontSize: "0.85rem" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>
                      {u.nombre}
                      <div className="show-mobile-only" style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>{u.email}</div>
                    </td>
                    <td className="hide-mobile" style={{ color: "#64748b" }}>{u.email}</td>
                    <td>
                      <span className={`badge ${ROL_BADGE[u.rol] || "badge-blue"}`}>
                        {ROL_LABEL[u.rol] || u.rol}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.estado ? "badge-green" : "badge-gray"}`}>
                        {u.estado ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ color: "#64748b", fontSize: "0.83rem" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("es-HN") : "—"}
                    </td>
                    <td>
                      <div className="acciones">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/usuarios/${u.id}/editar`)}
                        >
                          Editar
                        </button>
                        {u.id !== yo?.id && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => eliminar(u.id, u.nombre)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-cell">No se encontraron usuarios</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
