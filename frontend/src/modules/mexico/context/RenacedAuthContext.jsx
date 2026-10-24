import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const RenacedAuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function leerCache() {
  try {
    const c = localStorage.getItem("renaced_usuario");
    return c ? JSON.parse(c) : null;
  } catch { return null; }
}

export function RenacedAuthProvider({ children }) {
  // Inicialización síncrona desde localStorage — evita race condition con navigate
  const [usuario, setUsuario] = useState(() => leerCache());
  const [cargando, setCargando] = useState(() => !!localStorage.getItem("renaced_token") && !leerCache());

  useEffect(() => {
    const token = localStorage.getItem("renaced_token");
    if (!token) { setCargando(false); return; }
    // Validar token en background sin bloquear el render
    axios.get(`${API}/renaced/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { setUsuario(r.data); localStorage.setItem("renaced_usuario", JSON.stringify(r.data)); })
      .catch(() => { localStorage.removeItem("renaced_token"); localStorage.removeItem("renaced_usuario"); setUsuario(null); })
      .finally(() => setCargando(false));
  }, []);

  async function login(email, password) {
    const { data } = await axios.post(`${API}/renaced/auth/login`, { email, password });
    localStorage.setItem("renaced_token", data.token);
    localStorage.setItem("renaced_usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }

  function setSession(token, usuarioData) {
    localStorage.setItem("renaced_token", token);
    localStorage.setItem("renaced_usuario", JSON.stringify(usuarioData));
    setUsuario(usuarioData);
  }

  function logout() {
    localStorage.removeItem("renaced_token");
    localStorage.removeItem("renaced_usuario");
    setUsuario(null);
  }

  return (
    <RenacedAuthContext.Provider value={{ usuario, cargando, login, logout, setSession }}>
      {children}
    </RenacedAuthContext.Provider>
  );
}

export function useRenacedAuth() {
  return useContext(RenacedAuthContext);
}
