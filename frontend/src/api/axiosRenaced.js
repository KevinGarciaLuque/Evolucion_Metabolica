import axios from "axios";

const apiRenaced = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 30000,
});

apiRenaced.interceptors.request.use((config) => {
  const token = localStorage.getItem("renaced_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiRenaced.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("renaced_token");
      window.location.href = "/renaced/login";
    }
    return Promise.reject(error);
  }
);

export default apiRenaced;
