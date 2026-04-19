import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login           from "./pages/Login";
import Dashboard       from "./pages/Dashboard";
import PacientesList   from "./pages/Pacientes/PacientesList";
import PacienteForm    from "./pages/Pacientes/PacienteForm";
import PacienteDetalle from "./pages/Pacientes/PacienteDetalle";
import SubirPDF        from "./pages/Analisis/SubirPDF";
import Consolidado     from "./pages/Consolidado";
import UsuariosList    from "./pages/Usuarios/UsuariosList";
import UsuarioForm     from "./pages/Usuarios/UsuarioForm";
import BitacoraList    from "./pages/Bitacora/BitacoraList";
import BitacoraForm    from "./pages/Bitacora/BitacoraForm";
import Auditoria       from "./pages/Auditoria/Auditoria";

function App() {
  return (
    <AuthProvider>
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
          <Route path="/bitacora"          element={<ProtectedRoute><BitacoraList /></ProtectedRoute>} />
          <Route path="/bitacora/nueva"    element={<ProtectedRoute><BitacoraForm /></ProtectedRoute>} />
          <Route path="/bitacora/:id/editar" element={<ProtectedRoute><BitacoraForm /></ProtectedRoute>} />
          <Route path="/auditoria"             element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
