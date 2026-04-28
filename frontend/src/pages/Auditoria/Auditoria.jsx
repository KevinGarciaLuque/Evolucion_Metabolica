import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HiOutlineShieldCheck,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUsers,
  HiOutlineBookOpen,
  HiOutlineUserGroup,
} from "react-icons/hi2";

const ACCION_CONFIG = {
  // Sesión
  login:              { label: "Inicio sesión",    badge: "badge-green",  Icon: HiOutlineArrowRightOnRectangle },
  logout:             { label: "Cierre sesión",    badge: "badge-red",    Icon: HiOutlineArrowLeftOnRectangle  },
  // Pacientes
  crear_paciente:     { label: "Nuevo paciente",   badge: "badge-blue",   Icon: HiOutlineUsers                },
  editar_paciente:    { label: "Editó paciente",   badge: "badge-yellow", Icon: HiOutlineUsers                },
  eliminar_paciente:  { label: "Eliminó paciente", badge: "badge-red",    Icon: HiOutlineUsers                },
  // Registro Clínico
  crear_bitacora:     { label: "Nuevo reg. clínico",   badge: "badge-green",  Icon: HiOutlineBookOpen             },
  editar_bitacora:    { label: "Editó reg. clínico",   badge: "badge-yellow", Icon: HiOutlineBookOpen             },
  eliminar_bitacora:  { label: "Eliminó reg. clínico", badge: "badge-red",    Icon: HiOutlineBookOpen             },
  // Usuarios
  crear_usuario:      { label: "Nuevo usuario",    badge: "badge-purple", Icon: HiOutlineUserGroup            },
  editar_usuario:     { label: "Editó usuario",    badge: "badge-yellow", Icon: HiOutlineUserGroup            },
  eliminar_usuario:   { label: "Eliminó usuario",  badge: "badge-red",    Icon: HiOutlineUserGroup            },
};

const ROL_BADGE = {
  admin:     "badge-purple",
  doctor:    "badge-blue",
  asistente: "badge-pink",
};

function formatFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-HN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

export default function Auditoria() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  // Redirigir si no es admin
  useEffect(() => {
    if (usuario && usuario.rol !== "admin") navigate("/dashboard", { replace: true });
  }, [usuario, navigate]);

  const [registros,  setRegistros]  = useState([]);
  const [total,      setTotal]      = useState(0);
  const [cargando,   setCargando]   = useState(true);
  const [stats,      setStats]      = useState(null);

  // Filtros
  const [buscar,  setBuscar]  = useState("");
  const [accion,  setAccion]  = useState("");
  const [entidad, setEntidad] = useState("");
  const [desde,   setDesde]   = useState("");
  const [hasta,   setHasta]   = useState("");
  const [page,    setPage]    = useState(1);
  const LIMIT = 50;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { page, limit: LIMIT };
      if (buscar)  params.usuario = buscar;
      if (accion)  params.accion  = accion;
      if (entidad) params.entidad = entidad;
      if (desde)   params.desde   = desde;
      if (hasta)   params.hasta   = hasta;

      const [res, resStats] = await Promise.all([
        api.get("/auditoria",              { params }),
        api.get("/auditoria/estadisticas"),
      ]);
      setRegistros(res.data.data);
      setTotal(res.data.total);
      setStats(resStats.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [buscar, accion, entidad, desde, hasta, page]);

  useEffect(() => { cargar(); }, [cargar]);

  function handleFiltrar(e) {
    e.preventDefault();
    setPage(1);
    cargar();
  }

  const totalPaginas = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Auditoría de Sesiones</h1>
          <p className="page-subtitle">Registro completo de accesos al sistema</p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-card stat-card-blue">
            <div className="stat-icon">
              <HiOutlineShieldCheck size={22} color="#3b82f6" />
            </div>
            <div className="stat-info">
              <p className="stat-label">Logins hoy</p>
              <p className="stat-value">{stats.loginsHoy}</p>
            </div>
          </div>
          <div className="stat-card stat-card-green">
            <div className="stat-icon">
              <HiOutlineArrowRightOnRectangle size={22} color="#22c55e" />
            </div>
            <div className="stat-info">
              <p className="stat-label">Logins últimos 7 días</p>
              <p className="stat-value">{stats.loginsSemana}</p>
            </div>
          </div>
          <div className="stat-card stat-card-purple">
            <div className="stat-icon">
              <HiOutlineShieldCheck size={22} color="#a855f7" />
            </div>
            <div className="stat-info">
              <p className="stat-label">Usuarios únicos hoy</p>
              <p className="stat-value">{stats.usuariosUnicosHoy}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card filtros-card" style={{ marginBottom: "1rem" }}>
        <form className="filtros-row" onSubmit={handleFiltrar}
          style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>

          <div className="form-group" style={{ margin: 0, flex: "1 1 180px" }}>
            <label>Buscar usuario</label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0, flex: "1 1 130px" }}>
            <label>Acción</label>
            <select value={accion} onChange={(e) => setAccion(e.target.value)}>
              <option value="">Todas</option>
              <optgroup label="Sesión">
                <option value="login">Inicio sesión</option>
                <option value="logout">Cierre sesión</option>
              </optgroup>
              <optgroup label="Pacientes">
                <option value="crear_paciente">Nuevo paciente</option>
                <option value="editar_paciente">Editó paciente</option>
                <option value="eliminar_paciente">Eliminó paciente</option>
              </optgroup>
              <optgroup label="Registro Clínico">
                <option value="crear_bitacora">Nuevo reg. clínico</option>
                <option value="editar_bitacora">Editó reg. clínico</option>
                <option value="eliminar_bitacora">Eliminó reg. clínico</option>
              </optgroup>
              <optgroup label="Usuarios">
                <option value="crear_usuario">Nuevo usuario</option>
                <option value="editar_usuario">Editó usuario</option>
                <option value="eliminar_usuario">Eliminó usuario</option>
              </optgroup>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: "1 1 110px" }}>
            <label>Módulo</label>
            <select value={entidad} onChange={(e) => setEntidad(e.target.value)}>
              <option value="">Todos</option>
              <option value="sesion">Sesión</option>
              <option value="paciente">Paciente</option>
              <option value="bitacora">Registro Clínico</option>
              <option value="usuario">Usuario</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: "1 1 130px" }}>
            <label>Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0, flex: "1 1 130px" }}>
            <label>Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>

          <div className="filtros-btns">
            <button type="submit" className="btn btn-primary">
              Filtrar
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setBuscar(""); setAccion(""); setEntidad(""); setDesde(""); setHasta(""); setPage(1); }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header-row">
          <h3>Registros ({total})</h3>
        </div>

        {cargando ? (
          <div className="loading">Cargando registros...</div>
        ) : registros.length === 0 ? (
          <div className="empty-state">No hay registros que coincidan con los filtros.</div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="hide-mobile">#</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th className="hide-mobile">Rol</th>
                  <th>Acción</th>
                  <th className="hide-mobile">Descripción</th>
                  <th className="hide-mobile">IP</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, idx) => {
                  const cfg = ACCION_CONFIG[r.accion] || { label: r.accion, badge: "badge-gray", Icon: HiOutlineShieldCheck };
                  return (
                    <tr key={r.id}>
                      <td className="hide-mobile">{(page - 1) * LIMIT + idx + 1}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{formatFecha(r.fecha)}</td>
                      <td>
                        <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{r.usuario_nombre}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{r.usuario_email}</div>
                        <span className={`badge show-mobile-only ${ROL_BADGE[r.usuario_rol] || "badge-gray"}`} style={{ marginTop: 4 }}>
                          {r.usuario_rol}
                        </span>
                      </td>
                      <td className="hide-mobile">
                        <span className={`badge ${ROL_BADGE[r.usuario_rol] || "badge-gray"}`}>
                          {r.usuario_rol}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${cfg.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <cfg.Icon size={13} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }} className="hide-mobile">
                        {r.descripcion || "—"}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }} className="hide-mobile">
                        {r.ip === "::1" ? "Localhost" : (r.ip || "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="paginacion" style={{ display: "flex", justifyContent: "center", gap: "0.5rem", padding: "1rem 0 0.5rem" }}>
            <button
              className="btn btn-outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Anterior
            </button>
            <span style={{ lineHeight: "2.2rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Página {page} de {totalPaginas}
            </span>
            <button
              className="btn btn-outline"
              disabled={page === totalPaginas}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
