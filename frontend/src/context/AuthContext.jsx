import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [permisos, setPermisos] = useState(null); // null = sin restricción, [] = sin acceso
  const [cargando, setCargando] = useState(true);

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
    setUsuario(null);
    setPermisos(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, permisos, cargarPermisos, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
