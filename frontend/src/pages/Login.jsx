import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRenacedAuth } from "../context/RenacedAuthContext";
import { FiInfo, FiArrowLeft } from "react-icons/fi";
import FlagIcon from "../components/FlagIcon";
import "./Login.css";

function ModalAcercaDe({ onClose, origin }) {
  const [cerrando, setCerrando] = useState(false);

  function handleClose() {
    setCerrando(true);
    setTimeout(onClose, 280);
  }

  return (
    <div
      className={`modal-overlay${cerrando ? " modal-overlay-out" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`modal-acerca${cerrando ? " modal-acerca-out" : ""}`}
        style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={handleClose} aria-label="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="modal-acerca-header">
          <FlagIcon codigo="hn" size={32} />
          <h2>SAAPD Honduras</h2>
          <p className="modal-version">Versión 1.0 · 2026</p>
        </div>

        <p className="modal-descripcion">
          Sistema de Monitoreo Continuo de Glucosa con inteligencia artificial para el seguimiento de pacientes con diabetes.
        </p>

        <div className="modal-seccion">
          <h3>Equipo médico</h3>
          <div className="modal-doctor">
            <span className="modal-doctor-icon">👩‍⚕️</span>
            <div>
              <strong>Dra. Lesby Espinoza</strong>
              <span></span>
            </div>
          </div>
          <div className="modal-doctor">
            <span className="modal-doctor-icon">👩‍⚕️</span>
            <div>
              <strong>Dra. Leonela Membreño</strong>
              <span></span>
            </div>
          </div>
        </div>

        <div className="modal-seccion">
          <h3>Tecnología</h3>
          <div className="modal-tags">
            <span>Syai X1</span>
            <span>ISPAD Guidelines</span>
            <span>IA clínica</span>
          </div>
        </div>

        <p className="modal-acerca-footer">
          Desarrollado por <strong style={{ color: "#1d4ed8" }}>Kevin Garcia</strong> para el seguimiento especializado de pacientes pediátricos con diabetes.
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login }            = useAuth();
  const { setSession, logout: logoutRenaced } = useRenacedAuth();
  const navigate             = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [cargando, setCargando] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [mostrarAcerca, setMostrarAcerca] = useState(false);
  const [btnOrigin, setBtnOrigin] = useState({ x: 0, y: 0 });
  const btnRef = useRef(null);

  function handleAbrirAcerca() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const bx = rect.left + rect.width / 2;
      const by = rect.top + rect.height / 2;
      const modalW = 420;
      const modalH = 430;
      const modalLeft = (window.innerWidth - modalW) / 2;
      const modalTop = (window.innerHeight - modalH) / 2;
      setBtnOrigin({ x: Math.round(bx - modalLeft), y: Math.round(by - modalTop) });
    }
    setMostrarAcerca(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const result = await login(form.email, form.password);
      if (result?._tipo === "renaced") {
        setSession(result.token, result.usuario);
        navigate("/renaced/dashboard");
      } else if (result?.rol === "SUPER_ADMIN") {
        logoutRenaced(); // limpia cualquier sesión RENACED impersonada previa (ya vencida)
        navigate("/admin/panel");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <button type="button" className="btn-volver-inicio" onClick={() => navigate("/")}>
          <FiArrowLeft size={15} />
          Volver al inicio
        </button>

        <div className="login-header">
          <FlagIcon codigo="hn" size={48} style={{ display: "block", margin: "0 auto 12px" }} />
          <h1>SAAPD Honduras</h1>
          <p>Sistema de Monitoreo Continuo de Glucosa</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="doctor@clinica.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-password-wrap">
              <input
                type={verPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="toggle-pass-btn"
                onClick={() => setVerPass(!verPass)}
                tabIndex={-1}
                aria-label={verPass ? "Ocultar contraseña" : "Ver contraseña"}
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

          <button type="submit" className="btn btn-primary btn-full" disabled={cargando} style={{ marginTop: "20px" }}>
            {cargando ? "Ingresando..." : "Ingresar al sistema"}
          </button>
        </form>

        <button
            ref={btnRef}
            type="button"
            className="btn-acerca"
            onClick={handleAbrirAcerca}
            aria-label="Acerca de"
          >
            <FiInfo size={20} />
          </button>

        <p className="login-footer">
          Monitoreo continuo con IA · Syai X1 · ISPAD Guidelines
        </p>
      </div>

      {mostrarAcerca && (
        <ModalAcercaDe
          onClose={() => setMostrarAcerca(false)}
          origin={btnOrigin}
        />
      )}
    </div>
  );
}
