import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRenacedAuth } from "../../context/RenacedAuthContext";
import "../Login.css";

export default function RenacedLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [verPass, setVerPass]   = useState(false);
  const [error, setError]       = useState("");
  const [cargando, setCargando] = useState(false);
  const { login }               = useRenacedAuth();
  const navigate                = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await login(email, password);
      navigate("/renaced/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page" style={{ background: "linear-gradient(135deg, #0c2340 0%, #1a4a7a 100%)" }}>
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 36 }}>🇲🇽</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>RENACED México</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
            Registro Nacional de Diabetes
          </p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginTop: 20, color: "#dc2626", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="admin@renaced.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginTop: 16, position: "relative" }}>
            <label>Contraseña</label>
            <input
              type={verPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: 48 }}
            />
            <button
              type="button"
              onClick={() => setVerPass((v) => !v)}
              style={{ position: "absolute", right: 12, top: 34, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}
            >
              {verPass ? "Ocultar" : "Ver"}
            </button>
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%", marginTop: 24, padding: "13px", borderRadius: 10,
              background: cargando ? "#94a3b8" : "#1a4a7a", color: "#fff",
              border: "none", fontSize: 15, fontWeight: 700, cursor: cargando ? "default" : "pointer",
            }}
          >
            {cargando ? "Ingresando…" : "Ingresar al sistema"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#94a3b8" }}>
          RENACED · Registro Nacional de Diabetes · México
        </p>
      </div>
    </div>
  );
}
