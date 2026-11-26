// Ruta pública /:pais/:sistema (p. ej. /mexico/renaced). Solo se muestra si el Super Admin
// activó la página; si no existe o está inactiva, se va a la landing general.
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getPaginaPublica } from "../api/publicApi";
import PaginaWebVista from "./PaginaWebVista";

export default function PaginaWebPublica() {
  const { pais, sistema } = useParams();
  const [pagina, setPagina] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | no

  useEffect(() => {
    setEstado("cargando");
    getPaginaPublica(pais, sistema)
      .then((r) => { setPagina(r.data); setEstado("ok"); })
      .catch(() => setEstado("no"));
  }, [pais, sistema]);

  if (estado === "cargando") return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#64748b" }}>Cargando…</div>;
  if (estado === "no") return <Navigate to="/" replace />;

  // Recarga completa: el navegador toma el manifest (app instalable) del país.
  return <PaginaWebVista pagina={pagina} onIniciarSesion={() => window.location.assign(pagina.login)} />;
}
