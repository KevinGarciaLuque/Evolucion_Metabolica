import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RenacedAuthProvider } from "./context/RenacedAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RenacedProtectedRoute from "./components/RenacedProtectedRoute";

import Login           from "./pages/Login";
import Dashboard       from "./pages/Dashboard";
import PacientesList   from "./pages/Pacientes/PacientesList";
import PacienteForm    from "./pages/Pacientes/PacienteForm";
import PacienteDetalle from "./pages/Pacientes/PacienteDetalle";
import SubirPDF        from "./pages/Analisis/SubirPDF";
import Consolidado     from "./pages/Consolidado";
import UsuariosList    from "./pages/Usuarios/UsuariosList";
import UsuarioForm     from "./pages/Usuarios/UsuarioForm";
import ConsultasList   from "./pages/Consultas/ConsultasList";
import ConsultasForm   from "./pages/Consultas/ConsultasForm";
import Auditoria       from "./pages/Auditoria/Auditoria";
import MensajesPanel   from "./pages/Mensajes/MensajesPanel";
import MapaPacientes   from "./pages/Mapa/MapaPacientes";
import PermisosList    from "./pages/Permisos/PermisosList";
import BackupPacientes from "./pages/Reportes/Reportes";
import ReportesVisuales from "./pages/ReportesVisuales/ReportesVisuales";
import ImportacionHEU from "./pages/Importaciones/ImportacionHEU";

// ── Super Admin ───────────────────────────────────────────────────────────────
import AdminPanel from "./pages/Admin/AdminPanel";

// ── Módulo RENACED ────────────────────────────────────────────────────────────
import RenacedLogin           from "./pages/Renaced/RenacedLogin";
import RenacedDashboard       from "./pages/Renaced/RenacedDashboard";
import RenacedPacientesList   from "./pages/Renaced/RenacedPacientesList";
import RenacedPacienteForm    from "./pages/Renaced/RenacedPacienteForm";
import RenacedPacienteDetalle from "./pages/Renaced/RenacedPacienteDetalle";
import RenacedReportes        from "./pages/Renaced/RenacedReportes";
import RenacedUsuariosList    from "./pages/Renaced/RenacedUsuariosList";
import RenacedUsuarioForm     from "./pages/Renaced/RenacedUsuarioForm";
import RenacedConsultasHub    from "./pages/Renaced/RenacedConsultasHub";
import RenacedConsultasClinical from "./pages/Renaced/RenacedConsultasClinical";

function App() {
  return (
    <AuthProvider>
      <RenacedAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pacientes"        element={<ProtectedRoute><PacientesList /></ProtectedRoute>} />
            <Route path="/pacientes/nuevo"  element={<ProtectedRoute><PacienteForm /></ProtectedRoute>} />
            <Route path="/pacientes/:id"    element={<ProtectedRoute><PacienteDetalle /></ProtectedRoute>} />
            <Route path="/pacientes/:id/editar" element={<ProtectedRoute><PacienteForm /></ProtectedRoute>} />
            <Route path="/analisis/subir"   element={<ProtectedRoute><SubirPDF /></ProtectedRoute>} />
            <Route path="/consolidado"      element={<ProtectedRoute><Consolidado /></ProtectedRoute>} />
            <Route path="/usuarios"         element={<ProtectedRoute><UsuariosList /></ProtectedRoute>} />
            <Route path="/usuarios/nuevo"   element={<ProtectedRoute><UsuarioForm /></ProtectedRoute>} />
            <Route path="/usuarios/:id/editar" element={<ProtectedRoute><UsuarioForm /></ProtectedRoute>} />
            <Route path="/consultas"             element={<ProtectedRoute><ConsultasList /></ProtectedRoute>} />
            <Route path="/consultas/nueva"        element={<ProtectedRoute><ConsultasForm /></ProtectedRoute>} />
            <Route path="/consultas/:id/editar"   element={<ProtectedRoute><ConsultasForm /></ProtectedRoute>} />
            <Route path="/auditoria"             element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
            <Route path="/mensajes"              element={<ProtectedRoute><MensajesPanel /></ProtectedRoute>} />
            <Route path="/mapa"                  element={<ProtectedRoute><MapaPacientes /></ProtectedRoute>} />
            <Route path="/permisos"              element={<ProtectedRoute><PermisosList /></ProtectedRoute>} />
            <Route path="/backup-pacientes"      element={<ProtectedRoute><BackupPacientes /></ProtectedRoute>} />
            <Route path="/reportes"              element={<ProtectedRoute><ReportesVisuales /></ProtectedRoute>} />
            <Route path="/importaciones/heu"     element={<ProtectedRoute><ImportacionHEU /></ProtectedRoute>} />

            {/* ── RENACED ─────────────────────────────────────────────── */}
            <Route path="/renaced/login" element={<Navigate to="/login" replace />} />
            <Route path="/renaced/dashboard"              element={<RenacedProtectedRoute><RenacedDashboard /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes"              element={<RenacedProtectedRoute><RenacedPacientesList /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes/nuevo"        element={<RenacedProtectedRoute><RenacedPacienteForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes/:id"          element={<RenacedProtectedRoute><RenacedPacienteDetalle /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes/:id/editar"   element={<RenacedProtectedRoute><RenacedPacienteForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/consultas"              element={<RenacedProtectedRoute><RenacedConsultasHub /></RenacedProtectedRoute>} />
            <Route path="/renaced/consultas/:pacienteId" element={<RenacedProtectedRoute><RenacedConsultasClinical /></RenacedProtectedRoute>} />
            <Route path="/renaced/reportes"               element={<RenacedProtectedRoute><RenacedReportes /></RenacedProtectedRoute>} />
            <Route path="/renaced/usuarios"              element={<RenacedProtectedRoute adminOnly><RenacedUsuariosList /></RenacedProtectedRoute>} />
            <Route path="/renaced/usuarios/nuevo"        element={<RenacedProtectedRoute adminOnly><RenacedUsuarioForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/usuarios/:id/editar"   element={<RenacedProtectedRoute adminOnly><RenacedUsuarioForm /></RenacedProtectedRoute>} />

            {/* ── Admin ───────────────────────────────────────────────── */}
            <Route path="/admin/panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </RenacedAuthProvider>
    </AuthProvider>
  );
}

export default App;
