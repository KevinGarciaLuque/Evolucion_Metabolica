import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const INSTITUCIONES = ["HMEP", "IHSS", "HEU"];

const VACIO = {
  nombre: "",
  email: "",
  password: "",
  rol: "doctor",
  sexo: "",
  estado: 1,
  mostrar_info_graficas: 0,
  instituciones_acceso: ["HMEP", "IHSS", "HEU"],
};

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [verPass, setVerPass] = useState(false);

  const esAdmin = form.rol === "admin";
  const institucionesMarcadas = useMemo(
    () => (esAdmin ? INSTITUCIONES : form.instituciones_acceso),
    [esAdmin, form.instituciones_acceso]
  );

  useEffect(() => {
    if (!esEdicion) return;
    api.get(`/usuarios/${id}`).then((r) => {
      const u = r.data;
      setForm({
        nombre: u.nombre || "",
        email: u.email || "",
        password: "",
        rol: u.rol || "doctor",
        sexo: u.sexo || "",
        estado: u.estado ?? 1,
        mostrar_info_graficas: u.mostrar_info_graficas ?? 0,
        instituciones_acceso: Array.isArray(u.instituciones_acceso) && u.instituciones_acceso.length
          ? u.instituciones_acceso
          : ["HMEP", "IHSS", "HEU"],
      });
    });
  }, [id, esEdicion]);

  function cambiar(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }));
  }

  function toggleInstitucion(inst) {
    if (esAdmin) return;
    setForm((prev) => {
      const existe = prev.instituciones_acceso.includes(inst);
      const siguiente = existe
        ? prev.instituciones_acceso.filter((i) => i !== inst)
        : [...prev.instituciones_acceso, inst];
      return { ...prev, instituciones_acceso: siguiente };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!esAdmin && (!form.instituciones_acceso || form.instituciones_acceso.length === 0)) {
      setError("Selecciona al menos una institución para el usuario");
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        ...form,
        instituciones_acceso: institucionesMarcadas,
      };

      if (esEdicion) {
        await api.put(`/usuarios/${id}`, payload);
      } else {
        await api.post("/usuarios", payload);
      }
      navigate("/usuarios");
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{esEdicion ? "Editar Usuario" : "Nuevo Usuario"}</h1>
          <p className="page-subtitle">
            {esEdicion ? "Modifica los datos del usuario" : "Crea un nuevo acceso al sistema"}
          </p>
        </div>
      </div>

      <div className="card form-card">
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre completo *</label>
              <input name="nombre" placeholder="Ej. Maria Lopez" value={form.nombre} onChange={cambiar} required />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input name="email" type="email" placeholder="usuario@ejemplo.com" value={form.email} onChange={cambiar} required />
            </div>

            <div className="form-group">
              <label>{esEdicion ? "Nueva contraseña (dejar vacio para no cambiar)" : "Contraseña *"}</label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={verPass ? "text" : "password"}
                  placeholder={esEdicion ? "********" : "Minimo 6 caracteres"}
                  value={form.password}
                  onChange={cambiar}
                  required={!esEdicion}
                  minLength={esEdicion ? undefined : 6}
                  autoComplete="new-password"
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setVerPass(!verPass)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "0", lineHeight: 1, display: "flex" }}
                  title={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Rol *</label>
              <select name="rol" value={form.rol} onChange={cambiar} required>
                <option value="admin">Administrador</option>
                <option value="doctor">Doctor</option>
                <option value="asistente">Asistente</option>
                <option value="enfermera">Enfermera</option>
              </select>
            </div>

            <div className="form-group">
              <label>Sexo</label>
              <select name="sexo" value={form.sexo} onChange={cambiar}>
                <option value="">No especificado</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label style={{ marginBottom: 10, display: "block" }}>Instituciones con acceso</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {INSTITUCIONES.map((inst) => {
                  const activo = institucionesMarcadas.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstitucion(inst)}
                      disabled={esAdmin}
                      style={{
                        border: `1.5px solid ${activo ? "#2563eb" : "#cbd5e1"}`,
                        background: activo ? "#eff6ff" : "#fff",
                        color: activo ? "#1d4ed8" : "#475569",
                        borderRadius: 999,
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: esAdmin ? "not-allowed" : "pointer",
                        opacity: esAdmin ? 0.8 : 1,
                      }}
                    >
                      {activo ? "✓ " : ""}{inst}
                    </button>
                  );
                })}
              </div>
              {esAdmin && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  Los administradores tienen acceso completo a todas las instituciones.
                </div>
              )}
            </div>

            {esEdicion && (
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input id="estado" name="estado" type="checkbox" checked={Boolean(form.estado)} onChange={cambiar} style={{ width: "auto", accentColor: "var(--primary)" }} />
                <label htmlFor="estado" style={{ margin: 0, cursor: "pointer" }}>Usuario activo</label>
              </div>
            )}

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label style={{ marginBottom: 10, display: "block" }}>Botones de información en gráficas</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: form.mostrar_info_graficas ? "#eef2ff" : "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mostrar_info_graficas: f.mostrar_info_graficas ? 0 : 1 }))}
                  style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: form.mostrar_info_graficas ? "#6366f1" : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                  aria-label="Activar botones de informacion"
                >
                  <span style={{ position: "absolute", top: 3, left: form.mostrar_info_graficas ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                </button>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: form.mostrar_info_graficas ? "#4338ca" : "#64748b" }}>
                    {form.mostrar_info_graficas ? "Activado" : "Desactivado"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate("/usuarios")}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
