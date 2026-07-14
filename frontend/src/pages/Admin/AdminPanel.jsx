import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import {
  getTenants, createTenant, updateTenant, deleteTenant, getTenantById, getEstadisticasGlobales,
} from "../../api/adminApi";
import {
  HiOutlineGlobeAmericas, HiOutlinePlusCircle, HiOutlinePencilSquare,
  HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineUsers, HiOutlineMagnifyingGlass,
  HiOutlineChartBar, HiOutlineTrash, HiOutlinePower,
} from "react-icons/hi2";

const EMPTY_FORM = {
  nombre: "", codigo: "", subdominio: "", db_name: "", db_host: "",
  admin_nombre: "", admin_email: "", admin_password: "",
};

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
      <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Panel Super Admin</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Gestión de países / instancias RENACED</p>
          </div>
          <button className="btn btn-primary" onClick={abrirCrear} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <HiOutlinePlusCircle size={18} /> Nuevo País
          </button>
        </div>

        {/* ── Tarjetas resumen global ─────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard icon={<HiOutlineGlobeAmericas size={22} color="#6366f1" />} label="Países activos"
            value={tenants.filter((t) => t.activo).length} color="#eef2ff" />
          <StatCard icon={<HiOutlineUsers size={22} color="#0891b2" />} label="Total pacientes (global)"
            value={cargando ? "…" : totalPacientes.toLocaleString()} color="#ecfeff" />
          {stats.map((s) => (
            <StatCard key={s.codigo}
              icon={<span style={{ fontSize: 20 }}>🌐</span>}
              label={s.pais}
              value={s.error ? "Sin conexión" : (s.total_pacientes || 0).toLocaleString()}
              sub={s.error ? undefined : `${s.mujeres || 0}F · ${s.hombres || 0}M`}
              color={s.error ? "#fef2f2" : "#f0fdf4"}
            />
          ))}
        </div>

        {/* ── Buscador ──────────────────────────────────────────────────── */}
        <div style={{ position: "relative", marginBottom: 20, maxWidth: 420 }}>
          <HiOutlineMagnifyingGlass size={18} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Buscar país por nombre o código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px 10px 38px", borderRadius: 10,
              border: "1px solid #e2e8f0", fontSize: 14, background: "#fff",
            }}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {tenantsFiltrados.map((t) => (
              <div key={t.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, background: "#eef2ff", color: "#4f46e5",
                      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0,
                    }}>
                      {t.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{t.nombre}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>#{t.id}</p>
                    </div>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: t.activo ? "#dcfce7" : "#fee2e2",
                    color: t.activo ? "#16a34a" : "#dc2626",
                  }}>
                    {t.activo
                      ? <><HiOutlineCheckCircle size={13} /> Activo</>
                      : <><HiOutlineXCircle size={13} /> Inactivo</>}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0" }}>
                  <span className="badge badge-blue">
                    <code style={{ fontSize: 11 }}>{t.codigo}</code>
                  </span>
                  {t.subdominio && <span className="badge badge-purple">{t.subdominio}</span>}
                </div>

                <p style={{ margin: "0 0 14px", fontSize: 12, color: "#94a3b8" }}>
                  {t.db_name}{t.db_host ? ` · ${t.db_host}` : ""}
                </p>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => verStats(t)} title="Ver estadísticas"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
                  <button className="btn btn-danger btn-sm" onClick={() => setEliminarTarget(t)} title="Eliminar"
                    style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
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
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 12 }}>Nombre del país *</label>
                  <input type="text" placeholder="Ej: México" value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Código (3 letras) *</label>
                  <input type="text" placeholder="Ej: mx" maxLength={5} value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toLowerCase() }))}
                    required disabled={modal === "editar"} />
                </div>
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
                <button type="submit" className="btn btn-primary" disabled={guardando}>
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

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: color || "#f8fafc", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{sub}</p>}
      </div>
    </div>
  );
}
