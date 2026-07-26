import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getEstadisticasPublicas } from "../api/publicApi";
import FlagIcon from "../components/FlagIcon";

// Códigos de país que usan el esquema RENACED (login /renaced/login).
// "hn" (Honduras) usa el sistema original de Evolución Metabólica (/login).
function loginDePais(codigo) {
  return codigo === "hn" ? "/login" : "/renaced/login";
}

export default function Landing() {
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

  const totalPacientes = paises.reduce((acc, p) => acc + (p.total_pacientes || 0), 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c2340 0%, #1a4a7a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Navbar */}
      <nav style={{
        width: "100%", position: "sticky", top: 0, zIndex: 30,
        background: "rgba(12, 35, 64, 0.85)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          width: "100%", maxWidth: 1100, margin: "0 auto", display: "flex",
          justifyContent: "space-between", alignItems: "center", padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🌎</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: 0.3 }}>LATAM</span>
          </div>

          {/* Espacio para futuras páginas/enlaces del navbar (ej. "Acerca de", "Países", "Contacto") */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }} />

          <div style={{ position: "relative" }} ref={selectorRef}>
            <button
              onClick={() => setSelectorAbierto((o) => !o)}
              style={{
                background: "#fff", color: "#0c2340", border: "none", borderRadius: 10,
                padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Iniciar sesión
            </button>

            {selectorAbierto && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                background: "#fff", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                minWidth: 220, overflow: "hidden", zIndex: 20,
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
                    onClick={() => navigate(loginDePais(p.codigo))}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "10px 16px", background: "none", border: "none",
                      borderTop: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left", fontSize: 14,
                    }}
                  >
                    <FlagIcon codigo={p.codigo} size={18} />
                    {p.pais}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ textAlign: "center", maxWidth: 720, marginTop: 40, padding: "0 20px" }}>
        <h1 style={{ color: "#fff", fontSize: "2.4rem", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          Registro Nacional de Diabetes
        </h1>
        <p style={{ color: "#cbd5e1", fontSize: "1.05rem", marginTop: 16, lineHeight: 1.6 }}>
          Datos agregados de los países latinoamericanos participantes en el
          registro SAAPD (Honduras) / RENACED (México).
        </p>

        {!cargando && paises.length > 0 && (
          <p style={{ color: "#fff", fontSize: "0.95rem", marginTop: 10, fontWeight: 600 }}>
            {totalPacientes.toLocaleString("es-MX")} pacientes registrados en {paises.length} país{paises.length !== 1 ? "es" : ""}
          </p>
        )}
      </main>

      {/* Tarjetas por país */}
      <section style={{
        display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center",
        marginTop: 44, marginBottom: 60, width: "100%", maxWidth: 900, padding: "0 20px",
      }}>
        {cargando && (
          <div style={{ color: "#94a3b8", fontSize: 14 }}>Cargando estadísticas…</div>
        )}
        {!cargando && paises.map((p) => (
          <div
            key={p.codigo}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16, padding: "24px 32px", minWidth: 200, textAlign: "center",
            }}
          >
            <FlagIcon codigo={p.codigo} size={32} />
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginTop: 10 }}>{p.pais}</div>
            <div style={{ color: "#93c5fd", fontWeight: 800, fontSize: "1.6rem", marginTop: 6 }}>
              {p.total_pacientes != null ? p.total_pacientes.toLocaleString("es-MX") : "—"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>pacientes registrados</div>
          </div>
        ))}
      </section>

      <footer style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: "0 20px 24px", marginTop: "auto" }}>
        © {new Date().getFullYear()} LATAM · Desarrollado por Kevin Garcia · Todos los derechos reservados
      </footer>
    </div>
  );
}
