import { useEffect, useState } from "react";
import RenacedLayout from "../../components/RenacedLayout";
import {
  getClinicasRenaced, getEstablecimientosRenaced, createClinicaRenaced,
  updateClinicaRenaced, toggleClinicaRenaced,
} from "../../api/renacedApi";
import { HiOutlinePlusCircle, HiOutlinePencilSquare, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";

const FORM_INICIAL = {
  nombre: "", establecimiento_cve: "",
  investigador_nombre: "", investigador_email: "", investigador_password: "",
};

export default function RenacedClinicasList() {
  const [clinicas, setClinicas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // clínica en edición, o null si es nueva
  const [form, setForm] = useState(FORM_INICIAL);
  const [origen, setOrigen] = useState("catalogo"); // "catalogo" | "manual"
  const [establecimientos, setEstablecimientos] = useState([]);
  const [buscandoEstablecimiento, setBuscandoEstablecimiento] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [confirmToggle, setConfirmToggle] = useState(null);

  function cargar() {
    setCargando(true);
    getClinicasRenaced()
      .then((r) => setClinicas(r.data))
      .catch(() => setClinicas([]))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!modalAbierto || origen !== "catalogo") return;
    const t = setTimeout(() => {
      getEstablecimientosRenaced(buscandoEstablecimiento)
        .then((r) => setEstablecimientos(r.data))
        .catch(() => setEstablecimientos([]));
    }, 300);
    return () => clearTimeout(t);
  }, [modalAbierto, origen, buscandoEstablecimiento]);

  const filtradas = clinicas.filter((c) =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirNueva() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setOrigen("catalogo");
    setBuscandoEstablecimiento("");
    setEstablecimientos([]);
    setError("");
    setModalAbierto(true);
  }

  function abrirEditar(clinica) {
    setEditando(clinica);
    setForm({ nombre: clinica.nombre, establecimiento_cve: clinica.establecimiento_cve || "" });
    setOrigen("manual");
    setError("");
    setModalAbierto(true);
  }

  function elegirEstablecimiento(est) {
    setForm((f) => ({ ...f, nombre: est.nombre, establecimiento_cve: est.clave }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre de la clínica es requerido"); return; }
    if (!editando) {
      if (!form.investigador_nombre.trim() || !form.investigador_email.trim() || !form.investigador_password.trim()) {
        setError("Nombre, correo y contraseña del investigador responsable son requeridos");
        return;
      }
    }
    setGuardando(true);
    setError("");
    try {
      if (editando) {
        await updateClinicaRenaced(editando.id, form);
      } else {
        await createClinicaRenaced(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar la clínica");
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggle() {
    if (!confirmToggle) return;
    setGuardando(true);
    try {
      await toggleClinicaRenaced(confirmToggle.id);
      setConfirmToggle(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "Error al cambiar estado");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Clínicas</h1>
          <p className="page-subtitle">
            Unidades de servicio de salud donde se registran pacientes. Cada investigador
            solo ve los datos de su propia clínica.
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={abrirNueva}>
          <HiOutlinePlusCircle size={16} /> Nueva clínica
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="card">
        <div style={{ marginBottom: 12, fontSize: "0.875rem", color: "#64748b" }}>
          {filtradas.length} clínica{filtradas.length !== 1 ? "s" : ""}
        </div>

        {cargando ? (
          <div className="loading">Cargando…</div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="hide-mobile">Clave establecimiento</th>
                  <th>Usuarios</th>
                  <th>Pacientes</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => (
                  <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                    <td className="hide-mobile" style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {c.establecimiento_cve || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td>{c.total_usuarios}</td>
                    <td>{c.total_pacientes}</td>
                    <td>
                      {c.activo
                        ? <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}><HiOutlineCheckCircle size={15} /> Activa</span>
                        : <span style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}><HiOutlineXCircle size={15} /> Inactiva</span>
                      }
                    </td>
                    <td>
                      <div className="acciones">
                        <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(c)} title="Editar">
                          <HiOutlinePencilSquare size={14} />
                        </button>
                        <button
                          className={`btn btn-sm ${c.activo ? "btn-danger-outline" : "btn-outline"}`}
                          onClick={() => setConfirmToggle(c)}
                          title={c.activo ? "Desactivar" : "Activar"}
                        >
                          {c.activo ? <HiOutlineXCircle size={14} /> : <HiOutlineCheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!cargando && filtradas.length === 0 && (
                  <tr><td colSpan={6} className="empty-cell">No se encontraron clínicas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={() => !guardando && setModalAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>{editando ? "Editar clínica" : "Nueva clínica"}</h3>
            {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

            {!editando && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${origen === "catalogo" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => { setOrigen("catalogo"); setForm(FORM_INICIAL); }}
                >
                  Desde catálogo oficial
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${origen === "manual" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => { setOrigen("manual"); setForm(FORM_INICIAL); }}
                >
                  Alta manual
                </button>
              </div>
            )}

            {!editando && origen === "catalogo" && (
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Buscar establecimiento (INEGI/RENACED)</label>
                <input
                  type="text"
                  placeholder="Nombre o clave…"
                  value={buscandoEstablecimiento}
                  onChange={(e) => setBuscandoEstablecimiento(e.target.value)}
                />
                <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 8, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  {establecimientos.map((est) => (
                    <button
                      type="button"
                      key={est.clave}
                      onClick={() => elegirEstablecimiento(est)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                        background: form.establecimiento_cve === est.clave ? "#eff6ff" : "transparent",
                        border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13,
                      }}
                    >
                      <strong>{est.nombre}</strong>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{est.clave}</div>
                    </button>
                  ))}
                  {establecimientos.length === 0 && (
                    <div style={{ padding: 12, fontSize: 13, color: "#94a3b8" }}>Sin resultados</div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">Nombre de la clínica *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Hospital General de México"
                  required
                  readOnly={!editando && origen === "catalogo" && !!form.establecimiento_cve}
                />
              </div>
              {(editando || origen === "manual") && (
                <div>
                  <label className="form-label">Clave de establecimiento (opcional)</label>
                  <input
                    value={form.establecimiento_cve}
                    onChange={(e) => setForm((f) => ({ ...f, establecimiento_cve: e.target.value }))}
                    placeholder="Clave INEGI si aplica"
                  />
                </div>
              )}

              {!editando && (
                <>
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", margin: "0 0 10px" }}>
                      Investigador responsable de la clínica
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Nombre completo *</label>
                    <input
                      value={form.investigador_nombre}
                      onChange={(e) => setForm((f) => ({ ...f, investigador_nombre: e.target.value }))}
                      placeholder="Ej. Dra. María López García"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Correo *</label>
                    <input
                      type="email"
                      value={form.investigador_email}
                      onChange={(e) => setForm((f) => ({ ...f, investigador_email: e.target.value }))}
                      placeholder="correo@ejemplo.com"
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Contraseña *</label>
                    <input
                      type="password"
                      value={form.investigador_password}
                      onChange={(e) => setForm((f) => ({ ...f, investigador_password: e.target.value }))}
                      placeholder="Contraseña"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "-6px 0 0" }}>
                    Se crea como perfil "Investigador de Clínica", ligado únicamente a esta clínica.
                  </p>
                </>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalAbierto(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear clínica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmToggle && (
        <div className="modal-overlay" onClick={() => !guardando && setConfirmToggle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmToggle.activo ? "Desactivar clínica" : "Activar clínica"}</h3>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              {confirmToggle.activo
                ? `¿Desactivar "${confirmToggle.nombre}"? Los usuarios asignados no podrán operar hasta reasignarlos.`
                : `¿Activar "${confirmToggle.nombre}"?`}
            </p>
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
