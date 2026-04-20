import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const VACÍO = {
  nombre: "",
  email: "",
  password: "",
  rol: "doctor",
  sexo: "",
  estado: 1,
};

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [form, setForm]         = useState(VACÍO);
  const [error, setError]       = useState("");
  const [guardando, setGuardando] = useState(false);
  const [verPass, setVerPass]   = useState(false);

  useEffect(() => {
    if (esEdicion) {
      api.get(`/usuarios/${id}`).then((r) => {
        const u = r.data;
        setForm({
          nombre:   u.nombre  || "",
          email:    u.email   || "",
          password: "",
          rol:      u.rol     || "doctor",
          sexo:     u.sexo    || "",
          estado:   u.estado  ?? 1,
        });
      });
    }
  }, [id, esEdicion]);

  function cambiar(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? (checked ? 1 : 0) : value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (esEdicion) {
        await api.put(`/usuarios/${id}`, form);
        navigate("/usuarios");
      } else {
        await api.post("/usuarios", form);
        navigate("/usuarios");
      }
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
              <input
                name="nombre"
                placeholder="Ej. María López"
                value={form.nombre}
                onChange={cambiar}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                name="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={form.email}
                onChange={cambiar}
                required
              />
            </div>

            <div className="form-group">
              <label>
                {esEdicion ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={verPass ? "text" : "password"}
                  placeholder={esEdicion ? "••••••••" : "Mínimo 6 caracteres"}
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
                  style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", color: "#94a3b8",
                    padding: "0", lineHeight: 1, display: "flex",
                  }}
                  title={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Rol *</label>
              <select name="rol" value={form.rol} onChange={cambiar} required>
                <option value="admin">Administrador</option>
                <option value="doctor">Doctor</option>
                <option value="asistente">Asistente</option>
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

            {esEdicion && (
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  id="estado"
                  name="estado"
                  type="checkbox"
                  checked={Boolean(form.estado)}
                  onChange={cambiar}
                  style={{ width: "auto", accentColor: "var(--primary)" }}
                />
                <label htmlFor="estado" style={{ margin: 0, cursor: "pointer" }}>
                  Usuario activo
                </label>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate("/usuarios")}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
