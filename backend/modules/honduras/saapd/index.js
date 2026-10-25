// SAAPD Honduras (Evolución Metabólica)
// Registro del módulo: server.js descubre este archivo y llama a montar(app).
import pacientesRoutes from "./routes/pacientes.routes.js";
import analisisRoutes from "./routes/analisis.routes.js";
import pdfRoutes from "./routes/pdf.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import consultasRoutes from "./routes/consultas.routes.js";
import clinicoRoutes from "./routes/clinico.routes.js";
import auditoriaRoutes from "./routes/auditoria.routes.js";
import mensajesRoutes from "./routes/mensajes.routes.js";
import permisosRoutes from "./routes/permisos.routes.js";
import crecimientoRoutes from "./routes/crecimiento.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import reportesVisualesRoutes from "./routes/reportesVisuales.routes.js";
import importacionesRoutes from "./routes/importaciones.routes.js";

export const codigo = "hn";

export function montar(app) {
  app.use("/api/pacientes", pacientesRoutes);
  app.use("/api/analisis", analisisRoutes);
  app.use("/api/pdf", pdfRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/usuarios", usuariosRoutes);
  app.use("/api/consultas", consultasRoutes);
  app.use("/api/pacientes", clinicoRoutes);
  app.use("/api/auditoria", auditoriaRoutes);
  app.use("/api/mensajes",  mensajesRoutes);
  app.use("/api/permisos",    permisosRoutes);
  app.use("/api/pacientes",   crecimientoRoutes);
  app.use("/api/backup-pacientes", reportesRoutes);
  app.use("/api/reportes", reportesRoutes);
  app.use("/api/reportes-visuales", reportesVisualesRoutes);
  app.use("/api/importaciones", importacionesRoutes);
}
