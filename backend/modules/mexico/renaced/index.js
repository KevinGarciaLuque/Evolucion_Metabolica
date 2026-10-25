// RENACED México (base renaced_mexico, aislada)
// Registro del módulo: server.js descubre este archivo y llama a montar(app).
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "./middlewares/tenantDb.js";
import { resolverAlcanceClinica, verificarAccesoPaciente } from "./middlewares/scopeClinica.js";
import renacedAuthRoutes from "./routes/auth.routes.js";
import renacedPacientesRoutes from "./routes/pacientes.routes.js";
import renacedConsultasRoutes from "./routes/consultas.routes.js";
import renacedLaboratorioRoutes from "./routes/laboratorio.routes.js";
import renacedDashboardRoutes from "./routes/dashboard.routes.js";
import renacedTratamientoRoutes from "./routes/tratamiento.routes.js";
import renacedEvaluacionRoutes from "./routes/evaluacion.routes.js";
import renacedMonitoreoRoutes from "./routes/monitoreo.routes.js";
import renacedEscaneosRoutes from "./routes/escaneos.routes.js";
import renacedEducacionRoutes from "./routes/educacion.routes.js";
import renacedCatalogosRoutes from "./routes/catalogos.routes.js";
import renacedReportesRoutes from "./routes/reportes.routes.js";
import renacedUsuariosRoutes from "./routes/usuarios.routes.js";
import renacedClinicasRoutes from "./routes/clinicas.routes.js";
import renacedDiagnosticoRoutes from "./routes/diagnostico.routes.js";
import renacedComorbilidadRoutes from "./routes/comorbilidad.routes.js";
import renacedPatologiaRoutes from "./routes/patologia.routes.js";
import renacedAntecedentesGORoutes from "./routes/antecedentesgo.routes.js";
import renacedEventoRoutes from "./routes/evento.routes.js";
import renacedEstiloVidaRoutes from "./routes/estilovida.routes.js";
import renacedToxicomaniasRoutes from "./routes/toxicomanias.routes.js";
import renacedReclasificacionRoutes from "./routes/reclasificacion.routes.js";
import renacedEmbarazoRoutes from "./routes/embarazo.routes.js";
import renacedImportarBDRoutes from "./routes/importarBD.routes.js";
import renacedMapaRoutes from "./routes/mapa.routes.js";

export const codigo = "mx";

export function montar(app) {
  app.use("/api/renaced/auth",     renacedAuthRoutes);

  // Guarda de acceso para TODOS los sub-recursos de un paciente (consultas, laboratorio,
  // tratamiento, evaluación, etc.). Se registra antes de cada router específico y
  // corre primero para ese mismo prefijo — así ningún endpoint anidado bajo
  // /pacientes/:paciente_id/* queda sin validar la clínica del usuario.
  app.use(
    "/api/renaced/pacientes/:paciente_id(\\d+)",
    verificarToken, resolverTenantDB, resolverAlcanceClinica, verificarAccesoPaciente
  );

  app.use("/api/renaced/pacientes", renacedPacientesRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/consultas", renacedConsultasRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/laboratorio", renacedLaboratorioRoutes);
  app.use("/api/renaced/dashboard", renacedDashboardRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/tratamiento", renacedTratamientoRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/evaluacion",  renacedEvaluacionRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/monitoreo",   renacedMonitoreoRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/educacion",   renacedEducacionRoutes);
  app.use("/api/renaced/escaneos",                           renacedEscaneosRoutes);
  app.use("/api/renaced/catalogos",                          renacedCatalogosRoutes);
  app.use("/api/renaced/reportes",                           renacedReportesRoutes);
  app.use("/api/renaced/usuarios",                           renacedUsuariosRoutes);
  app.use("/api/renaced/clinicas",                           renacedClinicasRoutes);
  app.use("/api/renaced/diagnostico",                          renacedDiagnosticoRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/comorbilidad",  renacedComorbilidadRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/patologia",     renacedPatologiaRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/antecedentes-go", renacedAntecedentesGORoutes);
  app.use("/api/renaced/pacientes/:paciente_id/eventos",       renacedEventoRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/estilovida",    renacedEstiloVidaRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/toxicomanias",  renacedToxicomaniasRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/reclasificacion", renacedReclasificacionRoutes);
  app.use("/api/renaced/pacientes/:paciente_id/embarazos",     renacedEmbarazoRoutes);
  app.use("/api/renaced/importar-bd",                          renacedImportarBDRoutes);
  app.use("/api/renaced/mapa",                                 renacedMapaRoutes);
}
