import { Navigate } from "react-router-dom";
import { useRenacedAuth } from "../context/RenacedAuthContext";

export default function RenacedProtectedRoute({ children, adminOnly = false }) {
  const { usuario, cargando } = useRenacedAuth();

  // Mientras valida el token en background, si hay usuario en estado no bloquear
  if (cargando && !usuario) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (adminOnly && usuario.perfil_id !== 1) return <Navigate to="/renaced/dashboard" replace />;
  return children;
}
