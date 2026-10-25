import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext";
import { RenacedAuthProvider } from "./modules/mexico/renaced/context/RenacedAuthContext";

import Landing from "./shared/pages/Landing";
import Login   from "./shared/pages/Login";

// Registro automático de módulos: cada modules/<area>/routes.jsx o
// modules/<pais>/<sistema>/routes.jsx exporta su arreglo de <Route>.
// Un país nuevo solo agrega su routes.jsx; aquí no hay que tocar nada.
const modulosRutas = import.meta.glob(["./modules/*/routes.jsx", "./modules/*/*/routes.jsx"], { eager: true });
const rutasModulos = Object.keys(modulosRutas).sort().flatMap((k) => modulosRutas[k].default);

const Cargando = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#64748b" }}>
    Cargando…
  </div>
);

function App() {
  return (
    <AuthProvider>
      <RenacedAuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Cargando />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              {rutasModulos}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </RenacedAuthProvider>
    </AuthProvider>
  );
}

export default App;
