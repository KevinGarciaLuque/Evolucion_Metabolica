import { Navigate } from "react-router-dom";
import { useRenacedAuth } from "../context/RenacedAuthContext";

// adminOnly: solo Administrador del país. conClinica: también el Administrador de Clínica (perfil 6).
export default function RenacedProtectedRoute({ children, adminOnly = false, conClinica = false }) {
  const { usuario, cargando } = useRenacedAuth();

  // Mientras valida el token en background, si hay usuario en estado no bloquear
  if (cargando && !usuario) return null;
  if (!usuario) return <Navigate to="/renaced/login" replace />;
  if (adminOnly && usuario.perfil_id !== 1 && !(conClinica && usuario.perfil_id === 6)) return <Navigate to="/renaced/dashboard" replace />;
  return children;
}
