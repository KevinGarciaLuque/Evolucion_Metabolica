import { lazy } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "../../shared/components/ProtectedRoute";

// Las pantallas se cargan bajo demanda: el usuario solo descarga lo que visita.
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

export default [
  <Route key="0" path="/admin/panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />,
];
