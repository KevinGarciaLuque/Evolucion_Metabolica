// Login unificado
// Registro del módulo: server.js descubre este archivo y llama a montar(app).
import authRoutes from "./routes/auth.routes.js";

export const codigo = "auth";

export function montar(app) {
  app.use("/api/auth", authRoutes);
}
