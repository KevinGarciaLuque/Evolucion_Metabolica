import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const INSTITUCIONES_VALIDAS = ["HMEP", "IHSS", "HEU"];

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [permisos, setPermisos] = useState(null); // null = sin restricción, [] = sin acceso
  const [cargando, setCargando] = useState(true);
  const [institucion, setInstitucionState] = useState(() => {
    return localStorage.getItem("institucion_activa") || "HMEP";
  });

  function setInstitucion(inst) {
    if (INSTITUCIONES_VALIDAS.includes(inst)) {
      setInstitucionState(inst);
      localStorage.setItem("institucion_activa", inst);
    }
  }

  useEffect(() => {
    const token    = localStorage.getItem("token");
    const usuGuard = localStorage.getItem("usuario");
    const permGuard = localStorage.getItem("permisos");
    if (token && usuGuard) {
      const u = JSON.parse(usuGuard);
      setUsuario(u);
      // Admins no tienen restricciones
      if (u.rol === "admin") {
        setPermisos(null);
      } else {
        setPermisos(permGuard !== null ? JSON.parse(permGuard) : null);
        // Validar que la institución guardada sea accesible para este usuario
        const instGuardada = localStorage.getItem("institucion_activa") || "HMEP";
        const acceso = Array.isArray(u.instituciones_acceso) ? u.instituciones_acceso : INSTITUCIONES_VALIDAS;
        if (!acceso.includes(instGuardada)) {
          const primera = acceso[0] || "HMEP";
          setInstitucionState(primera);
          localStorage.setItem("institucion_activa", primera);
        }
      }
    }
    setCargando(false);
  }, []);

  async function cargarPermisos(usuario) {
    if (usuario.rol === "admin") {
      setPermisos(null);
      localStorage.removeItem("permisos");
      return;
    }
    try {
      const { data } = await api.get("/permisos/mios");
      setPermisos(data.modulos);
      localStorage.setItem("permisos", JSON.stringify(data.modulos));
    } catch {
      setPermisos(null);
    }
  }

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    await cargarPermisos(data.usuario);
    return data.usuario;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("permisos");
    localStorage.removeItem("institucion_activa");
    setUsuario(null);
    setPermisos(null);
    setInstitucionState("HMEP");
  }

  const soloLectura = usuario?.rol === "asistente";

  return (
    <AuthContext.Provider value={{ usuario, permisos, soloLectura, cargarPermisos, login, logout, cargando, institucion, setInstitucion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
