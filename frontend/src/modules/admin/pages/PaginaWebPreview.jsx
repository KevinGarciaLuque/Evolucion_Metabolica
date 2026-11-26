// Vista previa (solo Super Admin) de la página de un país, esté activa o no.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPaginaWeb } from "../api/adminApi";
import PaginaWebVista from "../../../shared/pages/PaginaWebVista";

export default function PaginaWebPreview() {
  const { codigo } = useParams();
  const [pagina, setPagina] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPaginaWeb(codigo).then((r) => setPagina(r.data)).catch(() => setError("No se pudo cargar la vista previa"));
  }, [codigo]);

  if (error) return <p style={{ padding: 24 }}>{error}</p>;
  if (!pagina) return <p style={{ padding: 24, color: "#64748b" }}>Cargando…</p>;

  return (
    <>
      <div style={{ background: "#fef3c7", color: "#92400e", padding: "8px 16px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
        <span>Vista previa · la página está {pagina.activa ? "ACTIVA" : "INACTIVA"} (el público {pagina.activa ? "sí" : "no"} la ve)</span>
        <Link to="/admin/paginas-web">← Volver a Páginas Web</Link>
      </div>
      <PaginaWebVista pagina={pagina} onIniciarSesion={() => {}} />
    </>
  );
}
