// Super Admin ALAD (base alad_master)
// Registro del módulo: server.js descubre este archivo y llama a montar(app).
import adminTenantsRoutes from "./routes/tenants.routes.js";

export const codigo = "admin";

export function montar(app) {
  app.use("/api/admin/tenants", adminTenantsRoutes);
}
