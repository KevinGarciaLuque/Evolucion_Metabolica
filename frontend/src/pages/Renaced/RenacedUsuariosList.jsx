import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import { getUsuariosRenaced, toggleUsuarioRenaced } from "../../api/renacedApi";
import { useRenacedAuth } from "../../context/RenacedAuthContext";
import { HiOutlineUserPlus, HiOutlinePencilSquare, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";

const PERFIL_LABEL = { 1: "Administrador", 2: "Médico", 3: "Asistente", 4: "Enfermera" };
const PERFIL_COLOR = {
  1: { bg: "#dbeafe", color: "#1d4ed8" },
  2: { bg: "#dcfce7", color: "#166534" },
  3: { bg: "#fef9c3", color: "#854d0e" },
  4: { bg: "#fce7f3", color: "#9d174d" },
};

export default function RenacedUsuariosList() {
  const navigate = useNavigate();
  const { usuario: yo } = useRenacedAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function cargar() {
    setCargando(true);
    getUsuariosRenaced()
      .then((r) => setUsuarios(r.data))
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      u.nombre_completo?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  async function handleToggle() {
    if (!confirmToggle) return;
    setGuardando(true);
    setError("");
    try {
      await toggleUsuarioRenaced(confirmToggle.id);
      setConfirmToggle(null);
      cargar();
    } catch (e) {
      setError(e.response?.data?.error || "Error al cambiar estado");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Usuarios RENACED</h1>
          <p className="page-subtitle">Gestión de médicos, asistentes y enfermeras</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => navigate("/renaced/usuarios/nuevo")}
        >
          <HiOutlineUserPlus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar por nombre, username o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, fontSize: "0.875rem", color: "#64748b" }}>
          {filtrados.length} usuario{filtrados.length !== 1 ? "s" : ""}
        </div>

        {cargando ? (
          <div className="loading">Cargando…</div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Username</th>
                  <th className="hide-mobile">Email</th>
                  <th>Perfil</th>
                  <th>Estado</th>
                  <th className="hide-mobile">Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => {
                  const pc = PERFIL_COLOR[u.perfil_id] || { bg: "#f1f5f9", color: "#475569" };
                  const esSelf = u.id === yo?.id;
                  return (
                    <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                      <td style={{ fontWeight: 600 }}>
                        {u.nombre_completo}
                        {esSelf && <span style={{ marginLeft: 6, fontSize: 11, color: "#6366f1" }}>(tú)</span>}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>{u.username}</td>
                      <td className="hide-mobile" style={{ fontSize: 13, color: "#64748b" }}>
                        {u.email || <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: pc.bg, color: pc.color,
                        }}>
                          {PERFIL_LABEL[u.perfil_id] || u.perfil_nombre}
                        </span>
                      </td>
                      <td>
                        {u.activo
                          ? <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}><HiOutlineCheckCircle size={15} /> Activo</span>
                          : <span style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}><HiOutlineXCircle size={15} /> Inactivo</span>
                        }
                      </td>
                      <td className="hide-mobile" style={{ fontSize: 12, color: "#94a3b8" }}>
                        {u.ultimo_acceso
                          ? new Date(u.ultimo_acceso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                          : "Nunca"}
                      </td>
                      <td>
                        <div className="acciones">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => navigate(`/renaced/usuarios/${u.id}/editar`)}
                            title="Editar"
                          >
                            <HiOutlinePencilSquare size={14} />
                          </button>
                          {!esSelf && (
                            <button
                              className={`btn btn-sm ${u.activo ? "btn-danger-outline" : "btn-outline"}`}
                              onClick={() => setConfirmToggle(u)}
                              title={u.activo ? "Desactivar" : "Activar"}
                            >
                              {u.activo ? <HiOutlineXCircle size={14} /> : <HiOutlineCheckCircle size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!cargando && filtrados.length === 0 && (
                  <tr><td colSpan={7} className="empty-cell">No se encontraron usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmación toggle */}
      {confirmToggle && (
        <div className="modal-overlay" onClick={() => !guardando && setConfirmToggle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmToggle.activo ? "Desactivar usuario" : "Activar usuario"}</h3>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              {confirmToggle.activo
                ? `¿Desactivar a ${confirmToggle.nombre_completo}? No podrá iniciar sesión.`
                : `¿Activar a ${confirmToggle.nombre_completo}?`}
            </p>
            {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmToggle(null)} disabled={guardando}>
                Cancelar
              </button>
              <button
                className={`btn ${confirmToggle.activo ? "btn-danger" : "btn-primary"}`}
                onClick={handleToggle}
                disabled={guardando}
              >
                {guardando ? "Guardando…" : confirmToggle.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RenacedLayout>
  );
}
