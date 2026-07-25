import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import FlagIcon from "../../components/FlagIcon";
import {
  getTenants, createTenant, updateTenant, deleteTenant, getTenantById, getEstadisticasGlobales,
} from "../../api/adminApi";
import {
  HiOutlineGlobeAmericas, HiOutlinePlusCircle, HiOutlinePencilSquare,
  HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineUsers, HiOutlineMagnifyingGlass,
  HiOutlineChartBar, HiOutlineTrash, HiOutlinePower, HiOutlineLockOpen,
  HiOutlineCircleStack, HiOutlineSparkles,
} from "react-icons/hi2";
import "./AdminPanel.css";

// Catálogo de módulos disponibles por tipo de sistema (según el sidebar real de cada país)
const MODULOS_HONDURAS = [
  { clave: "dashboard",         nombre: "Dashboard" },
  { clave: "consolidado",       nombre: "Consolidado" },
  { clave: "pacientes",         nombre: "Pacientes" },
  { clave: "analisis",          nombre: "Analizar PDF" },
  { clave: "consultas",         nombre: "Consultas" },
  { clave: "mapa",              nombre: "Mapa" },
  { clave: "mensajes",          nombre: "Mensajes" },
  { clave: "reportes",          nombre: "Reportes" },
  { clave: "importaciones",     nombre: "Importación HEU" },
  { clave: "backup_pacientes",  nombre: "Backup Pacientes" },
  { clave: "permisos",          nombre: "Permisos" },
  { clave: "usuarios",          nombre: "Usuarios" },
  { clave: "auditoria",         nombre: "Auditoría" },
];
const MODULOS_RENACED = [
  { clave: "dashboard",  nombre: "Dashboard" },
  { clave: "pacientes",  nombre: "Pacientes" },
  { clave: "consultas",  nombre: "Consultas" },
  { clave: "mapa",       nombre: "Mapa" },
  { clave: "reportes",   nombre: "Reportes" },
  { clave: "usuarios",   nombre: "Usuarios" },
];
function catalogoModulos(codigo) {
  return codigo === "hn" ? MODULOS_HONDURAS : MODULOS_RENACED;
}

const EMPTY_FORM = {
  nombre: "", codigo: "", subdominio: "", db_name: "", db_host: "",
  admin_nombre: "", admin_email: "", admin_password: "",
};

// Catálogo ALAD — países de Latinoamérica (20)
const PAISES_ALAD = [
  { codigo: "ar", nombre: "Argentina" },
  { codigo: "bo", nombre: "Bolivia" },
  { codigo: "br", nombre: "Brasil" },
  { codigo: "cl", nombre: "Chile" },
  { codigo: "co", nombre: "Colombia" },
  { codigo: "cr", nombre: "Costa Rica" },
  { codigo: "cu", nombre: "Cuba" },
  { codigo: "do", nombre: "República Dominicana" },
  { codigo: "ec", nombre: "Ecuador" },
  { codigo: "sv", nombre: "El Salvador" },
  { codigo: "gt", nombre: "Guatemala" },
  { codigo: "ht", nombre: "Haití" },
  { codigo: "hn", nombre: "Honduras" },
  { codigo: "mx", nombre: "México" },
  { codigo: "ni", nombre: "Nicaragua" },
  { codigo: "pa", nombre: "Panamá" },
  { codigo: "py", nombre: "Paraguay" },
  { codigo: "pe", nombre: "Perú" },
  { codigo: "uy", nombre: "Uruguay" },
  { codigo: "ve", nombre: "Venezuela" },
];

function normalizarNombre(nombre) {
  return nombre
    .replace(/[áàäâã]/gi, "a")
    .replace(/[éèëê]/gi, "e")
    .replace(/[íìïî]/gi, "i")
    .replace(/[óòöôõ]/gi, "o")
    .replace(/[úùüû]/gi, "u")
    .replace(/ñ/gi, "n")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export default function AdminPanel() {
  const [tenants, setTenants]     = useState([]);
  const [stats, setStats]         = useState([]);
  const [busqueda, setBusqueda]   = useState("");
  const [cargando, setCargando]   = useState(true);
  const [modal, setModal]         = useState(false);       // 'crear' | 'editar' | false
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState("");
  const [exito, setExito]         = useState(null); // { admin_email, admin_password, admin_creado }
  const [statsModal, setStatsModal] = useState(null); // tenant con stats cargados
  const [cargandoStats, setCargandoStats] = useState(false);
  const [eliminarTarget, setEliminarTarget] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [permisosModal, setPermisosModal] = useState(null); // tenant actual
  const [permisosSeleccion, setPermisosSeleccion] = useState([]);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const [t, s] = await Promise.all([getTenants(), getEstadisticasGlobales()]);
      setTenants(t.data);
      setStats(s.data);
    } catch (_) {}
    finally { setCargando(false); }
  }

  function abrirCrear() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setError("");
    setModal("crear");
  }

  function abrirEditar(t) {
    setForm({ nombre: t.nombre, codigo: t.codigo, subdominio: t.subdominio || "", db_name: t.db_name, db_host: t.db_host || "" });
    setEditTarget(t);
    setError("");
    setModal("editar");
  }

  function abrirPermisos(t) {
    const catalogo = catalogoModulos(t.codigo);
    const activos = Array.isArray(t.modulos) ? t.modulos : catalogo.map((m) => m.clave);
    setPermisosSeleccion(activos.filter((m) => catalogo.some((c) => c.clave === m)));
    setPermisosModal(t);
  }

  function toggleModulo(clave) {
    setPermisosSeleccion((prev) =>
      prev.includes(clave) ? prev.filter((m) => m !== clave) : [...prev, clave]
    );
  }

  async function guardarPermisos() {
    if (!permisosModal) return;
    setGuardandoPermisos(true);
    try {
      await updateTenant(permisosModal.id, { modulos: permisosSeleccion });
      await cargar();
      setPermisosModal(null);
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar permisos");
    } finally {
      setGuardandoPermisos(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      if (modal === "crear") {
        const res = await createTenant(form);
        await cargar();
        setModal(false);
        setExito({
          admin_email: form.admin_email,
          admin_password: form.admin_password,
          admin_creado: res.data.admin_creado,
          pais: form.nombre,
        });
      } else {
        await updateTenant(editTarget.id, form);
        await cargar();
        setModal(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(t) {
    try {
      await updateTenant(t.id, { activo: t.activo ? 0 : 1 });
      await cargar();
    } catch (_) {}
  }

  async function verStats(t) {
    setStatsModal({ nombre: t.nombre });
    setCargandoStats(true);
    try {
      const res = await getTenantById(t.id);
      setStatsModal(res.data);
    } catch (_) {
      setStatsModal(null);
    } finally {
      setCargandoStats(false);
    }
  }

  async function confirmarEliminar() {
    if (!eliminarTarget) return;
    setEliminando(true);
    try {
      await deleteTenant(eliminarTarget.id);
      await cargar();
      setEliminarTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || "Error al eliminar país");
    } finally {
      setEliminando(false);
    }
  }

  const totalPacientes = stats.reduce((sum, s) => sum + (s.total_pacientes || 0), 0);

  const tenantsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) =>
      t.nombre.toLowerCase().includes(q) ||
      (t.codigo || "").toLowerCase().includes(q) ||
      (t.subdominio || "").toLowerCase().includes(q)
    );
  }, [tenants, busqueda]);

  return (
    <Layout>
      <div className="admin-panel">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="admin-hero">
          <div>
            <span className="admin-hero-eyebrow"><HiOutlineSparkles size={13} /> Super Admin</span>
            <h1>Panel de Instancias</h1>
            <p>Gestión de países / instancias RENACED</p>
          </div>
          <button className="btn btn-primary" onClick={abrirCrear} style={{ display: "flex", alignItems: "center", gap: 6, position: "relative", zIndex: 1 }}>
            <HiOutlinePlusCircle size={18} /> Nuevo País
          </button>
        </div>

        {/* ── Tarjetas resumen global ─────────────────────────────────────── */}
        <div className="admin-stats">
          <StatCard icon={<HiOutlineGlobeAmericas size={21} color="#4f46e5" />} label="Países activos"
            value={tenants.filter((t) => t.activo).length} bg="linear-gradient(155deg,#eef2ff,#e0e7ff)" />
          <StatCard icon={<HiOutlineUsers size={21} color="#0891b2" />} label="Total pacientes (global)"
            value={cargando ? "…" : totalPacientes.toLocaleString()} bg="linear-gradient(155deg,#ecfeff,#cffafe)" />
          {stats.map((s) => (
            <StatCard key={s.codigo}
              icon={<FlagIcon codigo={s.codigo} size={20} />}
              label={s.pais}
              value={s.error ? "Sin conexión" : (s.total_pacientes || 0).toLocaleString()}
              sub={s.error ? undefined : `${s.mujeres || 0}F · ${s.hombres || 0}M`}
              bg={s.error ? "linear-gradient(155deg,#fef2f2,#fee2e2)" : "linear-gradient(155deg,#f0fdf4,#dcfce7)"}
            />
          ))}
        </div>

        {/* ── Buscador ──────────────────────────────────────────────────── */}
        <div className="admin-search">
          <HiOutlineMagnifyingGlass size={18} />
          <input
            type="text"
            placeholder="Buscar país por nombre o código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* ── Grid de países ───────────────────────────────────────────────── */}
        {cargando ? (
          <p style={{ color: "#94a3b8" }}>Cargando…</p>
        ) : tenantsFiltrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "#94a3b8", padding: 32, fontStyle: "italic" }}>
            No hay países que coincidan con la búsqueda
          </div>
        ) : (
          <div className="admin-grid">
            {tenantsFiltrados.map((t) => (
              <div key={t.id} className="tenant-card" style={{ "--tenant-accent": t.activo ? "#22c55e" : "#ef4444" }}>
                <div className="tenant-card-top">
                  <div className="tenant-card-id">
                    <div className="tenant-flag-wrap">
                      <FlagIcon codigo={t.codigo} size={24} />
                    </div>
                    <div>
                      <p className="tenant-name">{t.nombre}</p>
                      <p className="tenant-hash">#{t.id}</p>
                    </div>
                  </div>
                  <span className={`tenant-status ${t.activo ? "on" : "off"}`}>
                    {t.activo
                      ? <><HiOutlineCheckCircle size={13} /> Activo</>
                      : <><HiOutlineXCircle size={13} /> Inactivo</>}
                  </span>
                </div>

                <div className="tenant-badges">
                  <span className="badge badge-blue">
                    <code style={{ fontSize: 11 }}>{t.codigo}</code>
                  </span>
                  {t.subdominio && <span className="badge badge-purple">{t.subdominio}</span>}
                </div>

                <p className="tenant-db-line">
                  <HiOutlineCircleStack size={13} />
                  {t.db_name}{t.db_host ? ` · ${t.db_host}` : ""}
                </p>

                <div className="tenant-actions">
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => abrirPermisos(t)} title="Permisos de módulos">
                    <HiOutlineLockOpen size={14} />
                  </button>
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => verStats(t)} title="Ver estadísticas">
                    <HiOutlineChartBar size={14} />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(t)} title="Editar"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <HiOutlinePencilSquare size={14} /> Editar
                  </button>
                  <button
                    className={`btn btn-sm ${t.activo ? "btn-outline" : "btn-primary"}`}
                    onClick={() => toggleActivo(t)} title={t.activo ? "Desactivar" : "Activar"}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <HiOutlinePower size={14} /> {t.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => setEliminarTarget(t)} title="Eliminar"
                    style={{ marginLeft: "auto" }}>
                    <HiOutlineTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal crear / editar ─────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: modal === "crear" ? 640 : 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{modal === "crear" ? "Nuevo País" : `Editar — ${editTarget?.nombre}`}</h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={guardar}>
              {modal === "crear" && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12 }}>País * (catálogo ALAD)</label>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))", gap: 8,
                    maxHeight: 260, overflowY: "auto", padding: "4px 2px", marginTop: 4,
                  }}>
                    {PAISES_ALAD.map((p) => {
                      const yaExiste = tenants.some((t) => t.codigo === p.codigo);
                      const seleccionado = form.codigo === p.codigo;
                      return (
                        <button
                          key={p.codigo}
                          type="button"
                          disabled={yaExiste}
                          onClick={() => setForm((f) => ({
                            ...f,
                            nombre: p.nombre,
                            codigo: p.codigo,
                            subdominio: `${p.codigo}.alad.org`,
                            db_name: `renaced_${normalizarNombre(p.nombre)}`,
                          }))}
                          title={yaExiste ? "Ya registrado" : p.nombre}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                            padding: "10px 4px", borderRadius: 10,
                            border: seleccionado ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: yaExiste ? "#f1f5f9" : seleccionado ? "#eff6ff" : "#fff",
                            cursor: yaExiste ? "not-allowed" : "pointer",
                            opacity: yaExiste ? 0.5 : 1,
                            fontSize: 11, fontWeight: 600, color: "#334155",
                          }}
                        >
                          <FlagIcon codigo={p.codigo} size={22} />
                          <span style={{ textAlign: "center", lineHeight: 1.2 }}>{p.nombre}</span>
                          {yaExiste && <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>Ya registrado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {modal === "editar" && (
                  <>
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 12 }}>Nombre del país *</label>
                      <input type="text" placeholder="Ej: México" value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12 }}>Código (3 letras) *</label>
                      <input type="text" placeholder="Ej: mx" maxLength={5} value={form.codigo}
                        onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toLowerCase() }))}
                        required disabled />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Subdominio</label>
                  <input type="text" placeholder="Ej: mexico" value={form.subdominio}
                    onChange={(e) => setForm((f) => ({ ...f, subdominio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Nombre de la BD *</label>
                  <input type="text" placeholder="Ej: renaced_mexico" value={form.db_name}
                    onChange={(e) => setForm((f) => ({ ...f, db_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Host de la BD</label>
                  <input type="text" placeholder="Ej: metro.proxy.rlwy.net" value={form.db_host}
                    onChange={(e) => setForm((f) => ({ ...f, db_host: e.target.value }))} />
                </div>
              </div>

              {modal === "crear" && (
                <>
                  <div style={{ borderTop: "1px solid #e2e8f0", margin: "16px 0 14px", paddingTop: 14 }}>
                    <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Administrador inicial del país
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div className="form-group" style={{ gridColumn: "1/-1" }}>
                        <label style={{ fontSize: 12 }}>Nombre completo *</label>
                        <input type="text" placeholder="Ej: Dr. Juan Pérez" value={form.admin_nombre}
                          onChange={(e) => setForm((f) => ({ ...f, admin_nombre: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Email / Usuario *</label>
                        <input type="email" placeholder="admin@renaced.mx" value={form.admin_email}
                          onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Contraseña inicial *</label>
                        <input type="text" placeholder="Mínimo 8 caracteres" value={form.admin_password}
                          onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))} required minLength={8} />
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
                    ⚠️ La base de datos del país debe existir antes de crear el registro.
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando || (modal === "crear" && !form.codigo)}>
                  {guardando ? "Guardando…" : modal === "crear" ? "Crear País" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal credenciales ──────────────────────────────────────────── */}
      {exito && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{exito.admin_creado ? "✅" : "⚠️"}</div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {exito.admin_creado ? `País "${exito.pais}" creado` : "País registrado sin admin"}
              </h3>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                {exito.admin_creado
                  ? "Guarda estas credenciales — no se volverán a mostrar"
                  : "El admin no pudo crearse. Verifica que la BD exista y vuelve a intentarlo."}
              </p>
            </div>

            {exito.admin_creado && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Credenciales del Administrador</p>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Usuario / Email</span>
                    <code style={{ background: "#e2e8f0", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{exito.admin_email}</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Contraseña</span>
                    <code style={{ background: "#e2e8f0", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{exito.admin_password}</code>
                  </div>
                </div>
              </div>
            )}

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setExito(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── Modal estadísticas ────────────────────────────────────────────── */}
      {statsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setStatsModal(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Estadísticas — {statsModal.nombre}</h3>
              <button onClick={() => setStatsModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            {cargandoStats ? (
              <p style={{ color: "#94a3b8" }}>Cargando…</p>
            ) : statsModal.stats ? (
              statsModal.stats.error ? (
                <p style={{ color: "#dc2626", fontSize: 13 }}>Sin conexión a la base de datos del país.</p>
              ) : (
                <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Total pacientes</span>
                    <strong>{(statsModal.stats.total_pacientes || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Código</span>
                    <code>{statsModal.codigo}</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Base de datos</span>
                    <span>{statsModal.db_name}</span>
                  </div>
                </div>
              )
            ) : (
              <p style={{ color: "#dc2626", fontSize: 13 }}>No se pudieron cargar las estadísticas.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Modal permisos de módulos por país ────────────────────────────── */}
      {permisosModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setPermisosModal(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 440, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <FlagIcon codigo={permisosModal.codigo} size={16} /> Permisos — {permisosModal.nombre}
              </h3>
              <button onClick={() => setPermisosModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <p style={{ margin: "4px 0 16px", fontSize: 12, color: "#94a3b8" }}>
              Módulos habilitados en el sidebar de este país.
            </p>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", flex: 1 }}>
              {catalogoModulos(permisosModal.codigo).map((m) => {
                const activo = permisosSeleccion.includes(m.clave);
                return (
                  <label key={m.clave} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                    background: activo ? "#eff6ff" : "#f8fafc",
                    border: `1px solid ${activo ? "#bfdbfe" : "#e2e8f0"}`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{m.nombre}</span>
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => toggleModulo(m.clave)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setPermisosModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={guardandoPermisos} onClick={guardarPermisos}>
                {guardandoPermisos ? "Guardando…" : "Guardar permisos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ───────────────────────────────────── */}
      {eliminarTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Eliminar país</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
              Esta acción eliminará el registro de <strong>{eliminarTarget.nombre}</strong> del panel Super Admin.
              La base de datos del país <strong>no</strong> se elimina, pero el país dejará de administrarse desde aquí. ¿Deseas continuar?
            </p>
            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => { setEliminarTarget(null); setError(""); }}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando ? "Eliminando…" : "Eliminar país"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ icon, label, value, sub, bg }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon" style={{ background: bg || "#f8fafc" }}>{icon}</div>
      <div>
        <p className="stat-tile-label">{label}</p>
        <p className="stat-tile-value">{value}</p>
        {sub && <p className="stat-tile-sub">{sub}</p>}
      </div>
    </div>
  );
}
