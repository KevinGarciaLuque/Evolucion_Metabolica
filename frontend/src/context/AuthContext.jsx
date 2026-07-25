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
    const token     = localStorage.getItem("token");
    const usuGuard  = localStorage.getItem("usuario");
    const permGuard = localStorage.getItem("permisos");
    if (token && usuGuard) {
      const u = JSON.parse(usuGuard);
      setUsuario(u);
      if (u.rol === "admin") {
        setPermisos(null);
      } else {
        // Carga rápida desde caché para no bloquear el render
        setPermisos(permGuard !== null ? JSON.parse(permGuard) : null);
        // Validar institución guardada
        const instGuardada = localStorage.getItem("institucion_activa") || "HMEP";
        const acceso = Array.isArray(u.instituciones_acceso) ? u.instituciones_acceso : INSTITUCIONES_VALIDAS;
        if (!acceso.includes(instGuardada)) {
          const primera = acceso[0] || "HMEP";
          setInstitucionState(primera);
          localStorage.setItem("institucion_activa", primera);
        }
        // Refresca permisos desde el servidor en segundo plano
        // para que cambios del admin se reflejen sin necesidad de re-login
        api.get("/permisos/mios").then(({ data }) => {
          setPermisos(data.modulos);
          localStorage.setItem("permisos", JSON.stringify(data.modulos));
        }).catch(() => {});
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

    if (data.tipo === "renaced") {
      // Devolver los datos crudos — Login.jsx se encarga de setSession en RenacedAuthContext
      return { _tipo: "renaced", token: data.token, usuario: data.usuario };
    }

    // Un login nuevo del panel principal invalida cualquier sesión de
    // impersonación RENACED anterior — si no se limpia, el sidebar reutiliza
    // un renaced_token viejo (ya vencido) en vez de pedir uno nuevo.
    localStorage.removeItem("renaced_token");
    localStorage.removeItem("renaced_usuario");

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
