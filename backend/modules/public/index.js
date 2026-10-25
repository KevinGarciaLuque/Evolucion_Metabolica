// Rutas públicas de la landing
// Registro del módulo: server.js descubre este archivo y llama a montar(app).
import publicEstadisticasRoutes from "./routes/estadisticas.routes.js";

export const codigo = "public";

export function montar(app) {
  app.use("/api/public", publicEstadisticasRoutes);
}
