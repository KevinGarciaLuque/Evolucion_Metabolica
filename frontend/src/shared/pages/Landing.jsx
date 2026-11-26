import { useEffect, useState } from "react";
import { getEstadisticasPublicas } from "../api/publicApi";
import MetabolicHero from "../components/hero/MetabolicHero";
import SobreNosotros from "../components/hero/SobreNosotros";
import ContactoGlak from "../components/hero/ContactoGlak";

// Códigos de país que usan el esquema RENACED (login /renaced/login).
// "hn" (Honduras) usa el sistema original de Evolución Metabólica (/login).
function loginDePais(codigo) {
  return codigo === "hn" ? "/login" : "/renaced/login";
}

// Si el país tiene su página web activa se va primero allí; si no, directo al login.
const destinoDePais = (p) => p.pagina_ruta || loginDePais(p.codigo);

export default function Landing({ variant = "video" }) {
  const [paises, setPaises] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getEstadisticasPublicas()
      .then((r) => setPaises(r.data))
      .catch(() => setPaises([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div style={{ background: "#0b3a6b" }}>
      <MetabolicHero
        variant={variant} paises={paises} cargando={cargando}
        onPaisClick={(p) => window.location.assign(destinoDePais(p))} /* recarga completa: el navegador toma el manifest (app instalable) del país elegido */
      />

      <SobreNosotros />
      <ContactoGlak />

      <footer style={{ color: "#7f9bbd", fontSize: 12, textAlign: "center", padding: "16px 20px 24px", background: "#0b3a6b" }}>
        © {new Date().getFullYear()} LATAM · Desarrollado por Kevin Garcia · Todos los derechos reservados
      </footer>
    </div>
  );
}
