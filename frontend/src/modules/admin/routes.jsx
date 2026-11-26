import { lazy } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "../../shared/components/ProtectedRoute";

// Las pantallas se cargan bajo demanda: el usuario solo descarga lo que visita.
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PaginasWeb = lazy(() => import("./pages/PaginasWeb"));
const PaginaWebPreview = lazy(() => import("./pages/PaginaWebPreview"));

export default [
  <Route key="0" path="/admin/panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />,
  <Route key="1" path="/admin/paginas-web" element={<ProtectedRoute><PaginasWeb /></ProtectedRoute>} />,
  <Route key="2" path="/admin/paginas-web/:codigo/vista-previa" element={<ProtectedRoute><PaginaWebPreview /></ProtectedRoute>} />,
];
