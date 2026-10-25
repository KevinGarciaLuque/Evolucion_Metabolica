// Campana de notificaciones y avisos
// Registro del módulo: server.js descubre este archivo y llama a montar(app).
import notificacionesRoutes from "./routes/notificaciones.routes.js";

export const codigo = "notificaciones";

export function montar(app) {
  app.use("/api/notificaciones", notificacionesRoutes);
}
