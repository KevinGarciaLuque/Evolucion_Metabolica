import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext";
import { RenacedAuthProvider } from "./modules/mexico/context/RenacedAuthContext";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import RenacedProtectedRoute from "./modules/mexico/components/RenacedProtectedRoute";

import Landing          from "./shared/pages/Landing";
import Login           from "./shared/pages/Login";
import Dashboard       from "./modules/honduras/pages/Dashboard";
import PacientesList   from "./modules/honduras/pages/Pacientes/PacientesList";
import PacienteForm    from "./modules/honduras/pages/Pacientes/PacienteForm";
import PacienteDetalle from "./modules/honduras/pages/Pacientes/PacienteDetalle";
import SubirPDF        from "./modules/honduras/pages/Analisis/SubirPDF";
import Consolidado     from "./modules/honduras/pages/Consolidado";
import UsuariosList    from "./modules/honduras/pages/Usuarios/UsuariosList";
import UsuarioForm     from "./modules/honduras/pages/Usuarios/UsuarioForm";
import ConsultasList   from "./modules/honduras/pages/Consultas/ConsultasList";
import ConsultasForm   from "./modules/honduras/pages/Consultas/ConsultasForm";
import Auditoria       from "./modules/honduras/pages/Auditoria/Auditoria";
import MensajesPanel   from "./modules/honduras/pages/Mensajes/MensajesPanel";
import MapaPacientes   from "./modules/honduras/pages/Mapa/MapaPacientes";
import PermisosList    from "./modules/honduras/pages/Permisos/PermisosList";
import BackupPacientes from "./modules/honduras/pages/Reportes/Reportes";
import ReportesVisuales from "./modules/honduras/pages/ReportesVisuales/ReportesVisuales";
import ImportacionHEU from "./modules/honduras/pages/Importaciones/ImportacionHEU";

// ── Super Admin ───────────────────────────────────────────────────────────────
import AdminPanel from "./modules/admin/pages/AdminPanel";

// ── Módulo RENACED ────────────────────────────────────────────────────────────
import RenacedLogin           from "./modules/mexico/pages/RenacedLogin";
import RenacedDashboard       from "./modules/mexico/pages/RenacedDashboard";
import RenacedPacientesList   from "./modules/mexico/pages/RenacedPacientesList";
import RenacedPacienteForm    from "./modules/mexico/pages/RenacedPacienteForm";
import RenacedPacienteDetalle from "./modules/mexico/pages/RenacedPacienteDetalle";
import RenacedReportes        from "./modules/mexico/pages/RenacedReportes";
import RenacedUsuariosList    from "./modules/mexico/pages/RenacedUsuariosList";
import RenacedUsuarioForm     from "./modules/mexico/pages/RenacedUsuarioForm";
import RenacedClinicasList    from "./modules/mexico/pages/RenacedClinicasList";
import RenacedConsultasHub    from "./modules/mexico/pages/RenacedConsultasHub";
import RenacedConsultasClinical from "./modules/mexico/pages/RenacedConsultasClinical";
import RenacedImportarBD      from "./modules/mexico/pages/RenacedImportarBD";
import RenacedEscanearPDF     from "./modules/mexico/pages/RenacedEscanearPDF";
import RenacedMapaPacientes   from "./modules/mexico/pages/RenacedMapaPacientes";

function App() {
  return (
    <AuthProvider>
      <RenacedAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
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
            <Route path="/renaced/login" element={<RenacedLogin />} />
            <Route path="/renaced/dashboard"              element={<RenacedProtectedRoute><RenacedDashboard /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes"              element={<RenacedProtectedRoute><RenacedPacientesList /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes/nuevo"        element={<RenacedProtectedRoute><RenacedPacienteForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes/:id"          element={<RenacedProtectedRoute><RenacedPacienteDetalle /></RenacedProtectedRoute>} />
            <Route path="/renaced/pacientes/:id/editar"   element={<RenacedProtectedRoute><RenacedPacienteForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/consultas"              element={<RenacedProtectedRoute><RenacedConsultasHub /></RenacedProtectedRoute>} />
            <Route path="/renaced/consultas/:pacienteId" element={<RenacedProtectedRoute><RenacedConsultasClinical /></RenacedProtectedRoute>} />
            <Route path="/renaced/escanear-pdf"           element={<RenacedProtectedRoute><RenacedEscanearPDF /></RenacedProtectedRoute>} />
            <Route path="/renaced/reportes"               element={<RenacedProtectedRoute><RenacedReportes /></RenacedProtectedRoute>} />
            <Route path="/renaced/mapa"                   element={<RenacedProtectedRoute><RenacedMapaPacientes /></RenacedProtectedRoute>} />
            <Route path="/renaced/clinicas"               element={<RenacedProtectedRoute adminOnly><RenacedClinicasList /></RenacedProtectedRoute>} />
            <Route path="/renaced/usuarios"              element={<RenacedProtectedRoute adminOnly><RenacedUsuariosList /></RenacedProtectedRoute>} />
            <Route path="/renaced/usuarios/nuevo"        element={<RenacedProtectedRoute adminOnly><RenacedUsuarioForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/usuarios/:id/editar"   element={<RenacedProtectedRoute adminOnly><RenacedUsuarioForm /></RenacedProtectedRoute>} />
            <Route path="/renaced/importar-bd"           element={<RenacedProtectedRoute adminOnly><RenacedImportarBD /></RenacedProtectedRoute>} />

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
