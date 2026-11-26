import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Sin token: alimenta la landing pública de ALAD.
export const getEstadisticasPublicas = () => axios.get(`${API}/public/estadisticas`);

// Página web pública de un país (solo responde si está activa).
export const getPaginaPublica = (pais, sistema) => axios.get(`${API}/public/pagina/${pais}/${sistema}`);
