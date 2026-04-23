import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Mapa de ruta → clave de módulo (debe coincidir con permisos_modulos)
const RUTA_MODULO = {
  "/dashboard":      "dashboard",
  "/consolidado":    "consolidado",
  "/pacientes":      "pacientes",
  "/analisis/subir": "analisis",
  "/consultas":      "consultas",
  "/mapa":           "mapa",
  "/mensajes":       "mensajes",
};

// Rutas exclusivas del admin (no configurables vía permisos)
const RUTAS_ADMIN = ["/usuarios", "/auditoria", "/permisos"];

export default function ProtectedRoute({ children }) {
  const { usuario, permisos, cargando } = useAuth();
  const { pathname } = useLocation();

  if (cargando) return <div className="loading-screen">Cargando...</div>;
  if (!usuario)  return <Navigate to="/login" replace />;

  // Verificar rutas de admin
  const esRutaAdmin = RUTAS_ADMIN.some((r) => pathname.startsWith(r));
  if (esRutaAdmin && usuario.rol !== "admin")
    return <Navigate to="/dashboard" replace />;

  // Admin siempre tiene acceso
  if (usuario.rol === "admin") return children;

  // Si no hay permisos configurados (null) → acceso total
  if (permisos === null) return children;

  // Verificar permiso del módulo según la ruta base
  const modulo = Object.entries(RUTA_MODULO).find(([ruta]) =>
    pathname.startsWith(ruta)
  )?.[1];

  if (modulo && !permisos.includes(modulo))
    return <Navigate to="/dashboard" replace />;

  return children;
}
