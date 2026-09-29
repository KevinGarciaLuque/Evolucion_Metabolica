import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getEstadisticasPublicas } from "../api/publicApi";
import FlagIcon from "../components/FlagIcon";
import MetabolicHero from "../components/hero/MetabolicHero";

// Códigos de país que usan el esquema RENACED (login /renaced/login).
// "hn" (Honduras) usa el sistema original de Evolución Metabólica (/login).
function loginDePais(codigo) {
  return codigo === "hn" ? "/login" : "/renaced/login";
}

export default function Landing({ variant = "video" }) {
  const navigate = useNavigate();
  const [paises, setPaises] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    getEstadisticasPublicas()
      .then((r) => setPaises(r.data))
      .catch(() => setPaises([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) setSelectorAbierto(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loginSlot = (
    <div style={{ position: "relative" }} ref={selectorRef}>
      <button
        className="mh__login"
        aria-haspopup="menu"
        aria-expanded={selectorAbierto}
        onClick={() => setSelectorAbierto((o) => !o)}
      >
        Iniciar sesión
      </button>

      {selectorAbierto && (
        <div role="menu" style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          background: "#fff", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          minWidth: 220, overflow: "hidden", zIndex: 20, textAlign: "left",
        }}>
          <div style={{ padding: "10px 16px", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
            Selecciona tu país
          </div>
          {paises.length === 0 && (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#94a3b8" }}>
              Sin países disponibles
            </div>
          )}
          {paises.map((p) => (
            <button
              key={p.codigo}
              role="menuitem"
              className="landing-pais-btn"
              onClick={() => navigate(loginDePais(p.codigo))}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 16px", background: "none", border: "none",
                borderTop: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left", fontSize: 14,
              }}
            >
              <FlagIcon codigo={p.codigo} size={18} className="landing-pais-flag" />
              {p.pais}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: "#0b3a6b" }}>
      <style>{`
        .landing-pais-btn { transition: background-color 0.18s ease, padding-left 0.18s ease, color 0.18s ease; }
        .landing-pais-btn:hover { background-color: #eff6ff !important; padding-left: 22px !important; color: #1d4ed8; }
        .landing-pais-btn:hover .landing-pais-flag { transform: scale(1.15); }
        .landing-pais-flag { transition: transform 0.18s ease; }
      `}</style>

      <MetabolicHero variant={variant} paises={paises} cargando={cargando} loginSlot={loginSlot} />

      <footer style={{ color: "#7f9bbd", fontSize: 12, textAlign: "center", padding: "16px 20px 24px", background: "#0b3a6b" }}>
        © {new Date().getFullYear()} LATAM · Desarrollado por Kevin Garcia · Todos los derechos reservados
      </footer>
    </div>
  );
}
