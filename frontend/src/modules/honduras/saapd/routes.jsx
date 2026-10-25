import { lazy } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "../../../shared/components/ProtectedRoute";

// Las pantallas se cargan bajo demanda: el usuario solo descarga lo que visita.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PacientesList = lazy(() => import("./pages/Pacientes/PacientesList"));
const PacienteForm = lazy(() => import("./pages/Pacientes/PacienteForm"));
const PacienteDetalle = lazy(() => import("./pages/Pacientes/PacienteDetalle"));
const SubirPDF = lazy(() => import("./pages/Analisis/SubirPDF"));
const Consolidado = lazy(() => import("./pages/Consolidado"));
const UsuariosList = lazy(() => import("./pages/Usuarios/UsuariosList"));
const UsuarioForm = lazy(() => import("./pages/Usuarios/UsuarioForm"));
const ConsultasList = lazy(() => import("./pages/Consultas/ConsultasList"));
const ConsultasForm = lazy(() => import("./pages/Consultas/ConsultasForm"));
const Auditoria = lazy(() => import("./pages/Auditoria/Auditoria"));
const MensajesPanel = lazy(() => import("./pages/Mensajes/MensajesPanel"));
const MapaPacientes = lazy(() => import("./pages/Mapa/MapaPacientes"));
const PermisosList = lazy(() => import("./pages/Permisos/PermisosList"));
const BackupPacientes = lazy(() => import("./pages/Reportes/Reportes"));
const ReportesVisuales = lazy(() => import("./pages/ReportesVisuales/ReportesVisuales"));
const ImportacionHEU = lazy(() => import("./pages/Importaciones/ImportacionHEU"));

export default [
  <Route key="0" path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />,
  <Route key="1" path="/pacientes" element={<ProtectedRoute><PacientesList /></ProtectedRoute>} />,
  <Route key="2" path="/pacientes/nuevo" element={<ProtectedRoute><PacienteForm /></ProtectedRoute>} />,
  <Route key="3" path="/pacientes/:id" element={<ProtectedRoute><PacienteDetalle /></ProtectedRoute>} />,
  <Route key="4" path="/pacientes/:id/editar" element={<ProtectedRoute><PacienteForm /></ProtectedRoute>} />,
  <Route key="5" path="/analisis/subir" element={<ProtectedRoute><SubirPDF /></ProtectedRoute>} />,
  <Route key="6" path="/consolidado" element={<ProtectedRoute><Consolidado /></ProtectedRoute>} />,
  <Route key="7" path="/usuarios" element={<ProtectedRoute><UsuariosList /></ProtectedRoute>} />,
  <Route key="8" path="/usuarios/nuevo" element={<ProtectedRoute><UsuarioForm /></ProtectedRoute>} />,
  <Route key="9" path="/usuarios/:id/editar" element={<ProtectedRoute><UsuarioForm /></ProtectedRoute>} />,
  <Route key="10" path="/consultas" element={<ProtectedRoute><ConsultasList /></ProtectedRoute>} />,
  <Route key="11" path="/consultas/nueva" element={<ProtectedRoute><ConsultasForm /></ProtectedRoute>} />,
  <Route key="12" path="/consultas/:id/editar" element={<ProtectedRoute><ConsultasForm /></ProtectedRoute>} />,
  <Route key="13" path="/auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />,
  <Route key="14" path="/mensajes" element={<ProtectedRoute><MensajesPanel /></ProtectedRoute>} />,
  <Route key="15" path="/mapa" element={<ProtectedRoute><MapaPacientes /></ProtectedRoute>} />,
  <Route key="16" path="/permisos" element={<ProtectedRoute><PermisosList /></ProtectedRoute>} />,
  <Route key="17" path="/backup-pacientes" element={<ProtectedRoute><BackupPacientes /></ProtectedRoute>} />,
  <Route key="18" path="/reportes" element={<ProtectedRoute><ReportesVisuales /></ProtectedRoute>} />,
  <Route key="19" path="/importaciones/heu" element={<ProtectedRoute><ImportacionHEU /></ProtectedRoute>} />,
];
