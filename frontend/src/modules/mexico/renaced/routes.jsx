import { lazy } from "react";
import { Route } from "react-router-dom";
import RenacedProtectedRoute from "./components/RenacedProtectedRoute";

// Las pantallas se cargan bajo demanda: el usuario solo descarga lo que visita.
const RenacedLogin = lazy(() => import("./pages/RenacedLogin"));
const RenacedDashboard = lazy(() => import("./pages/RenacedDashboard"));
const RenacedPacientesList = lazy(() => import("./pages/RenacedPacientesList"));
const RenacedPacienteForm = lazy(() => import("./pages/RenacedPacienteForm"));
const RenacedPacienteDetalle = lazy(() => import("./pages/RenacedPacienteDetalle"));
const RenacedReportes = lazy(() => import("./pages/RenacedReportes"));
const RenacedUsuariosList = lazy(() => import("./pages/RenacedUsuariosList"));
const RenacedUsuarioForm = lazy(() => import("./pages/RenacedUsuarioForm"));
const RenacedClinicasList = lazy(() => import("./pages/RenacedClinicasList"));
const RenacedConsultasHub = lazy(() => import("./pages/RenacedConsultasHub"));
const RenacedConsultasClinical = lazy(() => import("./pages/RenacedConsultasClinical"));
const RenacedImportarBD = lazy(() => import("./pages/RenacedImportarBD"));
const RenacedEscanearPDF = lazy(() => import("./pages/RenacedEscanearPDF"));
const RenacedMapaPacientes = lazy(() => import("./pages/RenacedMapaPacientes"));

export default [
  <Route key="0" path="/renaced/login" element={<RenacedLogin />} />,
  <Route key="1" path="/renaced/dashboard" element={<RenacedProtectedRoute><RenacedDashboard /></RenacedProtectedRoute>} />,
  <Route key="2" path="/renaced/pacientes" element={<RenacedProtectedRoute><RenacedPacientesList /></RenacedProtectedRoute>} />,
  <Route key="3" path="/renaced/pacientes/nuevo" element={<RenacedProtectedRoute><RenacedPacienteForm /></RenacedProtectedRoute>} />,
  <Route key="4" path="/renaced/pacientes/:id" element={<RenacedProtectedRoute><RenacedPacienteDetalle /></RenacedProtectedRoute>} />,
  <Route key="5" path="/renaced/pacientes/:id/editar" element={<RenacedProtectedRoute><RenacedPacienteForm /></RenacedProtectedRoute>} />,
  <Route key="6" path="/renaced/consultas" element={<RenacedProtectedRoute><RenacedConsultasHub /></RenacedProtectedRoute>} />,
  <Route key="7" path="/renaced/consultas/:pacienteId" element={<RenacedProtectedRoute><RenacedConsultasClinical /></RenacedProtectedRoute>} />,
  <Route key="8" path="/renaced/escanear-pdf" element={<RenacedProtectedRoute><RenacedEscanearPDF /></RenacedProtectedRoute>} />,
  <Route key="9" path="/renaced/reportes" element={<RenacedProtectedRoute><RenacedReportes /></RenacedProtectedRoute>} />,
  <Route key="10" path="/renaced/mapa" element={<RenacedProtectedRoute><RenacedMapaPacientes /></RenacedProtectedRoute>} />,
  <Route key="11" path="/renaced/clinicas" element={<RenacedProtectedRoute adminOnly><RenacedClinicasList /></RenacedProtectedRoute>} />,
  <Route key="12" path="/renaced/usuarios" element={<RenacedProtectedRoute adminOnly><RenacedUsuariosList /></RenacedProtectedRoute>} />,
  <Route key="13" path="/renaced/usuarios/nuevo" element={<RenacedProtectedRoute adminOnly><RenacedUsuarioForm /></RenacedProtectedRoute>} />,
  <Route key="14" path="/renaced/usuarios/:id/editar" element={<RenacedProtectedRoute adminOnly><RenacedUsuarioForm /></RenacedProtectedRoute>} />,
  <Route key="15" path="/renaced/importar-bd" element={<RenacedProtectedRoute adminOnly><RenacedImportarBD /></RenacedProtectedRoute>} />,
];
