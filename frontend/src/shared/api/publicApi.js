import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Sin token: alimenta la landing pública de ALAD.
export const getEstadisticasPublicas = () => axios.get(`${API}/public/estadisticas`);
