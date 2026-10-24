import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext";
import { RenacedAuthProvider } from "./modules/mexico/renaced/context/RenacedAuthContext";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import RenacedProtectedRoute from "./modules/mexico/renaced/components/RenacedProtectedRoute";

import Landing          from "./shared/pages/Landing";
import Login           from "./shared/pages/Login";
import Dashboard       from "./modules/honduras/saapd/pages/Dashboard";
import PacientesList   from "./modules/honduras/saapd/pages/Pacientes/PacientesList";
import PacienteForm    from "./modules/honduras/saapd/pages/Pacientes/PacienteForm";
import PacienteDetalle from "./modules/honduras/saapd/pages/Pacientes/PacienteDetalle";
import SubirPDF        from "./modules/honduras/saapd/pages/Analisis/SubirPDF";
import Consolidado     from "./modules/honduras/saapd/pages/Consolidado";
import UsuariosList    from "./modules/honduras/saapd/pages/Usuarios/UsuariosList";
import UsuarioForm     from "./modules/honduras/saapd/pages/Usuarios/UsuarioForm";
import ConsultasList   from "./modules/honduras/saapd/pages/Consultas/ConsultasList";
import ConsultasForm   from "./modules/honduras/saapd/pages/Consultas/ConsultasForm";
import Auditoria       from "./modules/honduras/saapd/pages/Auditoria/Auditoria";
import MensajesPanel   from "./modules/honduras/saapd/pages/Mensajes/MensajesPanel";
import MapaPacientes   from "./modules/honduras/saapd/pages/Mapa/MapaPacientes";
import PermisosList    from "./modules/honduras/saapd/pages/Permisos/PermisosList";
import BackupPacientes from "./modules/honduras/saapd/pages/Reportes/Reportes";
import ReportesVisuales from "./modules/honduras/saapd/pages/ReportesVisuales/ReportesVisuales";
import ImportacionHEU from "./modules/honduras/saapd/pages/Importaciones/ImportacionHEU";

// ── Super Admin ───────────────────────────────────────────────────────────────
import AdminPanel from "./modules/admin/pages/AdminPanel";

// ── Módulo RENACED ────────────────────────────────────────────────────────────
import RenacedLogin           from "./modules/mexico/renaced/pages/RenacedLogin";
import RenacedDashboard       from "./modules/mexico/renaced/pages/RenacedDashboard";
import RenacedPacientesList   from "./modules/mexico/renaced/pages/RenacedPacientesList";
import RenacedPacienteForm    from "./modules/mexico/renaced/pages/RenacedPacienteForm";
import RenacedPacienteDetalle from "./modules/mexico/renaced/pages/RenacedPacienteDetalle";
import RenacedReportes        from "./modules/mexico/renaced/pages/RenacedReportes";
import RenacedUsuariosList    from "./modules/mexico/renaced/pages/RenacedUsuariosList";
import RenacedUsuarioForm     from "./modules/mexico/renaced/pages/RenacedUsuarioForm";
import RenacedClinicasList    from "./modules/mexico/renaced/pages/RenacedClinicasList";
import RenacedConsultasHub    from "./modules/mexico/renaced/pages/RenacedConsultasHub";
import RenacedConsultasClinical from "./modules/mexico/renaced/pages/RenacedConsultasClinical";
import RenacedImportarBD      from "./modules/mexico/renaced/pages/RenacedImportarBD";
import RenacedEscanearPDF     from "./modules/mexico/renaced/pages/RenacedEscanearPDF";
import RenacedMapaPacientes   from "./modules/mexico/renaced/pages/RenacedMapaPacientes";

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
