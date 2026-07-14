import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import {
  getUsuarioRenaced, createUsuarioRenaced, updateUsuarioRenaced,
} from "../../api/renacedApi";

const PERFILES = [
  { id: 2, label: "Médico" },
  { id: 3, label: "Asistente" },
  { id: 4, label: "Enfermera" },
];

const INITIAL = {
  nombre_completo: "",
  username: "",
  email: "",
  password: "",
  perfil_id: 2,
  activo: 1,
};

export default function RenacedUsuarioForm() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const esEdicion = Boolean(id);

  const [form, setForm]       = useState(INITIAL);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]     = useState("");
  const [exito, setExito]     = useState("");
  const [verPass, setVerPass] = useState(false);

  useEffect(() => {
    if (!esEdicion) return;
    getUsuarioRenaced(id)
      .then((r) => {
        const u = r.data;
        setForm({
          nombre_completo: u.nombre_completo || "",
          username: u.username || "",
          email: u.email || "",
          password: "",
          perfil_id: u.perfil_id,
          activo: u.activo,
        });
      })
      .catch(() => setError("No se pudo cargar el usuario"))
      .finally(() => setCargando(false));
  }, [id, esEdicion]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setExito("");

    if (!form.nombre_completo.trim() || !form.username.trim()) {
      setError("Nombre completo y username son requeridos");
      return;
    }
    if (!esEdicion && !form.password.trim()) {
      setError("La contraseña es requerida al crear un usuario");
      return;
    }

    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (!payload.email) delete payload.email;

    setGuardando(true);
    try {
      if (esEdicion) {
        await updateUsuarioRenaced(id, payload);
        setExito("Usuario actualizado correctamente");
        setTimeout(() => navigate("/renaced/usuarios"), 1200);
      } else {
        await createUsuarioRenaced(payload);
        setExito("Usuario creado correctamente");
        setTimeout(() => navigate("/renaced/usuarios"), 1200);
      }
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar usuario");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</h1>
          <p className="page-subtitle">
            {esEdicion ? "Modifica los datos del usuario RENACED" : "Registra un médico, asistente o enfermera"}
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("/renaced/usuarios")}>
          ← Volver
        </button>
      </div>

      {cargando ? (
        <div className="loading">Cargando…</div>
      ) : (
        <div className="card" style={{ maxWidth: 560 }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>
              {error}
            </div>
          )}
          {exito && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#16a34a", fontSize: 14 }}>
              {exito}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label">Nombre completo *</label>
              <input
                name="nombre_completo"
                value={form.nombre_completo}
                onChange={handleChange}
                placeholder="Ej. Dra. María López García"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label">Username *</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Ej. dra.lopez"
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="form-label">
                Contraseña {esEdicion ? "(dejar vacío para no cambiar)" : "*"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={verPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder={esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
                  autoComplete="new-password"
                  required={!esEdicion}
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  onClick={() => setVerPass((v) => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 12, fontWeight: 600,
                  }}
                >
                  {verPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">Perfil *</label>
              <select
                name="perfil_id"
                value={form.perfil_id}
                onChange={(e) => setForm((f) => ({ ...f, perfil_id: Number(e.target.value) }))}
                required
              >
                {PERFILES.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {esEdicion && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  id="activo"
                  name="activo"
                  type="checkbox"
                  checked={form.activo === 1}
                  onChange={handleChange}
                  style={{ width: "auto" }}
                />
                <label htmlFor="activo" style={{ margin: 0, cursor: "pointer" }}>
                  Usuario activo
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate("/renaced/usuarios")}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      )}
    </RenacedLayout>
  );
}
