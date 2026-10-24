import { useCallback, useEffect, useState } from "react";
import FlagIcon from "../../components/FlagIcon";
import { getBitacoraTenant, getBitacoraTenantEstadisticas } from "../../api/adminApi";
import {
  HiOutlineClipboardDocumentList, HiOutlineShieldCheck, HiOutlineArrowRightOnRectangle,
  HiOutlineXCircle, HiOutlineUsers,
} from "react-icons/hi2";

function formatFecha(iso) {
  if (!iso) return "—";
  // Railway MySQL corre en UTC; agregamos Z para que JS lo parsee como UTC
  const s = typeof iso === "string" ? iso.replace(" ", "T") + "Z" : iso;
  const d = new Date(s);
  return d.toLocaleString("es-HN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

const LIMIT = 50;

// La columna `fecha` se guarda en UTC (el MySQL de Railway corre en UTC, igual
// que auditoria_sesiones). Los filtros deben calcularse también en UTC —si se
// usara la fecha local del navegador, después de cierta hora local ya sería
// "mañana" en UTC y el filtro no encontraría los registros de hoy.
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TenantBitacoraModal({ tenant, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [total, setTotal]         = useState(0);
  const [stats, setStats]         = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [page, setPage]           = useState(1);

  const [buscar, setBuscar] = useState("");
  const [exito, setExito]   = useState("");
  const [desde, setDesde]   = useState(hoyISO());
  const [hasta, setHasta]   = useState(hoyISO());

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { page, limit: LIMIT };
      if (buscar) params.usuario = buscar;
      if (exito !== "") params.exito = exito;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const [res, resStats] = await Promise.all([
        getBitacoraTenant(tenant.id, params),
        getBitacoraTenantEstadisticas(tenant.id),
      ]);
      setRegistros(res.data.data);
      setTotal(res.data.total);
      setStats(resStats.data);
    } catch (_) {
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  }, [tenant.id, buscar, exito, desde, hasta, page]);

  useEffect(() => { cargar(); }, [cargar]);

  function handleFiltrar(e) {
    e.preventDefault();
    setPage(1);
    cargar();
  }

  const totalPaginas = Math.ceil(total / LIMIT);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "22px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: "1.05rem" }}>
                <HiOutlineClipboardDocumentList size={18} />
                <FlagIcon codigo={tenant.codigo} size={17} /> Bitácora de accesos — {tenant.nombre}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                Registro de inicios de sesión (exitosos y fallidos) de los usuarios de este país.
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
          </div>

          {/* Tarjetas de resumen */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 16 }}>
              <MiniStat icon={<HiOutlineShieldCheck size={18} color="#3b82f6" />} label="Logins hoy" value={stats.loginsHoy} />
              <MiniStat icon={<HiOutlineArrowRightOnRectangle size={18} color="#22c55e" />} label="Últimos 7 días" value={stats.loginsSemana} />
              <MiniStat icon={<HiOutlineXCircle size={18} color="#ef4444" />} label="Fallidos hoy" value={stats.fallidosHoy} />
              <MiniStat icon={<HiOutlineUsers size={18} color="#a855f7" />} label="Usuarios únicos hoy" value={stats.usuariosUnicosHoy} />
            </div>
          )}

          {/* Filtros */}
          <form onSubmit={handleFiltrar} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginTop: 16 }}>
            <div className="form-group" style={{ margin: 0, flex: "1 1 160px" }}>
              <label style={{ fontSize: 11 }}>Buscar usuario</label>
              <input type="text" placeholder="Nombre o email…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: "1 1 120px" }}>
              <label style={{ fontSize: 11 }}>Estado</label>
              <select value={exito} onChange={(e) => setExito(e.target.value)}>
                <option value="">Todos</option>
                <option value="1">Exitosos</option>
                <option value="0">Fallidos</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: "1 1 130px" }}>
              <label style={{ fontSize: 11 }}>Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: "1 1 130px" }}>
              <label style={{ fontSize: 11 }}>Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => { setBuscar(""); setExito(""); setDesde(""); setHasta(""); setPage(1); }}>
                Ver todo el historial
              </button>
            </div>
          </form>
        </div>

        {/* Tabla */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 28px" }}>
          {cargando ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando…</p>
          ) : registros.length === 0 ? (
            <div style={{ padding: "28px 12px", textAlign: "center", color: "#94a3b8", fontSize: 13, fontStyle: "italic", background: "#f8fafc", borderRadius: 10 }}>
              No hay registros que coincidan con los filtros.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th className="hide-mobile">Rol</th>
                    <th>IP</th>
                    <th className="hide-mobile">Navegador / SO</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{formatFecha(r.fecha)}</td>
                      <td>
                        <div style={{ fontWeight: 600, lineHeight: 1.3, fontSize: 13 }}>{r.usuario_nombre || "—"}</div>
                        <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{r.usuario_email || "—"}</div>
                      </td>
                      <td className="hide-mobile" style={{ fontSize: 12.5 }}>{r.usuario_rol || "—"}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {r.ip === "::1" ? "Localhost" : (r.ip || "—")}
                      </td>
                      <td className="hide-mobile" style={{ fontSize: 12.5, color: "#64748b" }}>{r.navegador || "—"}</td>
                      <td>
                        <span className={`badge ${r.exito ? "badge-green" : "badge-red"}`}>
                          {r.exito ? "Exitoso" : "Fallido"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", padding: "1rem 0 0.25rem" }}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
              <span style={{ lineHeight: "2.2rem", color: "#64748b", fontSize: "0.85rem" }}>Página {page} de {totalPaginas}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 28px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
      {icon}
      <div>
        <p style={{ margin: 0, fontSize: 10.5, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{value ?? "—"}</p>
      </div>
    </div>
  );
}
