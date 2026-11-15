import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fmtFecha } from "../../../../shared/utils/zonaHoraria";
import RenacedLayout from "../components/RenacedLayout";
import { getSaludCuentasRenaced } from "../api/renacedApi";
import { HiOutlinePencilSquare, HiOutlineCheckCircle, HiOutlineArrowPath } from "react-icons/hi2";

// Cada revisión: clave en la respuesta, título, qué significa y si es grave.
const REVISIONES = [
  { clave: "sin_medico", titulo: "Sin médico vinculado", grave: true,
    ayuda: "Si capturan consultas, quedan sin médico. Edita el usuario y elige su médico." },
  { clave: "sin_clinica", titulo: "Sin clínica", grave: true,
    ayuda: "No pertenecen a ninguna clínica activa, así que no ven pacientes. Edita el usuario y asígnale su clínica." },
  { clave: "clinicas_sin_admin", titulo: "Clínicas sin administrador", grave: true, clinicas: true,
    ayuda: "Nadie puede dar de alta personal en esa clínica. Asigna un Administrador de Clínica." },
  { clave: "nunca_entraron", titulo: "Nunca han entrado", grave: false,
    ayuda: "Cuentas activas que jamás iniciaron sesión. Avísales o confirma que sus credenciales funcionan." },
  { clave: "inactivos", titulo: "Inactivos", grave: false,
    ayuda: "Cuentas desactivadas: no pueden iniciar sesión." },
];

const fecha = (f) => (f ? fmtFecha(f, { day: "2-digit", month: "short", year: "numeric" }, "es-MX") : "—");

export default function RenacedSaludCuentas() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sel, setSel] = useState("sin_medico");
  const [busqueda, setBusqueda] = useState("");

  function cargar() {
    setCargando(true);
    setError("");
    getSaludCuentasRenaced()
      .then((r) => setDatos(r.data))
      .catch((e) => setError(e.response?.data?.error || "No se pudo revisar las cuentas"))
      .finally(() => setCargando(false));
  }
  useEffect(() => { cargar(); }, []);

  const rev = REVISIONES.find((r) => r.clave === sel);
  const q = busqueda.trim().toLowerCase();
  const filas = (datos?.[sel] || []).filter((f) =>
    !q || [f.nombre_completo, f.username, f.nombre, f.unidad_nombre, f.perfil_nombre].some((v) => v?.toLowerCase().includes(q))
  );

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Salud de cuentas</h1>
          <p className="page-subtitle">Usuarios y clínicas con datos incompletos</p>
        </div>
        <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={cargar} disabled={cargando}>
          <HiOutlineArrowPath size={16} /> Actualizar
        </button>
      </div>

      {error && <div className="card" style={{ color: "#dc2626", marginBottom: 16 }}>{error}</div>}

      {datos && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
            {REVISIONES.map((r) => {
              const n = datos.resumen[r.clave];
              const activo = sel === r.clave;
              const color = n === 0 ? "#16a34a" : r.grave ? "#dc2626" : "#d97706";
              return (
                <button key={r.clave} type="button" onClick={() => { setSel(r.clave); setBusqueda(""); }}
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer", border: activo ? `2px solid ${color}` : "2px solid transparent", margin: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{n}</div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{r.titulo}</div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px" }}>
            {datos.resumen.usuarios_activos} usuarios activos de {datos.resumen.usuarios} · {datos.resumen.clinicas_activas} clínicas activas
          </p>

          <div className="card">
            <h3 style={{ margin: "0 0 4px" }}>{rev.titulo} ({datos[sel].length})</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 12px" }}>{rev.ayuda}</p>
            {datos[sel].length > 0 && (
              <input type="text" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ marginBottom: 12 }} />
            )}

            {datos[sel].length === 0 ? (
              <div style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 6, padding: "12px 0" }}>
                <HiOutlineCheckCircle size={18} /> Todo en orden: no hay casos.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="tabla">
                  <thead>
                    {rev.clinicas ? (
                      <tr><th>Clínica</th><th>Usuarios activos</th><th></th></tr>
                    ) : (
                      <tr>
                        <th>Nombre</th><th>Usuario</th><th>Perfil</th>
                        <th className="hide-mobile">Clínica</th>
                        <th className="hide-mobile">{sel === "nunca_entraron" ? "Alta" : "Último acceso"}</th>
                        <th></th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {filas.map((f) => rev.clinicas ? (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600 }}>{f.nombre}</td>
                        <td>{f.usuarios_activos}</td>
                        <td><button className="btn btn-sm btn-outline" onClick={() => navigate("/renaced/usuarios/nuevo")}>Crear usuario</button></td>
                      </tr>
                    ) : (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600 }}>{f.nombre_completo}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 13 }}>{f.username}</td>
                        <td style={{ fontSize: 13 }}>{f.perfil_nombre}</td>
                        <td className="hide-mobile" style={{ fontSize: 13, color: "#64748b" }}>{f.unidad_nombre || "—"}</td>
                        <td className="hide-mobile" style={{ fontSize: 12, color: "#94a3b8" }}>{fecha(sel === "nunca_entraron" ? f.fecha_alta : f.ultimo_acceso)}</td>
                        <td>
                          <button className="btn btn-sm btn-outline" title="Editar" onClick={() => navigate(`/renaced/usuarios/${f.id}/editar`)}>
                            <HiOutlinePencilSquare size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filas.length === 0 && <tr><td colSpan={6} className="empty-cell">Sin resultados</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {cargando && !datos && <div className="loading">Revisando cuentas…</div>}
    </RenacedLayout>
  );
}
