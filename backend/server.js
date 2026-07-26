import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { verificarToken } from "./middlewares/auth.js";
import { resolverTenantDB } from "./middlewares/tenantDb.js";
import { resolverAlcanceClinica, verificarAccesoPaciente } from "./middlewares/scopeClinica.js";

import authRoutes from "./routes/auth.routes.js";
import pacientesRoutes from "./routes/pacientes.routes.js";
import analisisRoutes from "./routes/analisis.routes.js";
import pdfRoutes from "./routes/pdf.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import consultasRoutes from "./routes/consultas.routes.js";
import clinicoRoutes from "./routes/clinico.routes.js";
import auditoriaRoutes  from "./routes/auditoria.routes.js";
import mensajesRoutes   from "./routes/mensajes.routes.js";
import permisosRoutes   from "./routes/permisos.routes.js";
import crecimientoRoutes from "./routes/crecimiento.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import reportesVisualesRoutes from "./routes/reportesVisuales.routes.js";
import importacionesRoutes from "./routes/importaciones.routes.js";

// ── Módulo RENACED (base de datos renaced_mexico — aislada) ──────────────────
import renacedAuthRoutes        from "./routes/renaced/auth.routes.js";
import renacedPacientesRoutes   from "./routes/renaced/pacientes.routes.js";
import renacedConsultasRoutes   from "./routes/renaced/consultas.routes.js";
import renacedLaboratorioRoutes from "./routes/renaced/laboratorio.routes.js";
import renacedDashboardRoutes   from "./routes/renaced/dashboard.routes.js";
import renacedTratamientoRoutes from "./routes/renaced/tratamiento.routes.js";
import renacedEvaluacionRoutes  from "./routes/renaced/evaluacion.routes.js";
import renacedMonitoreoRoutes   from "./routes/renaced/monitoreo.routes.js";
import renacedEducacionRoutes   from "./routes/renaced/educacion.routes.js";
import renacedCatalogosRoutes   from "./routes/renaced/catalogos.routes.js";
import renacedReportesRoutes    from "./routes/renaced/reportes.routes.js";
import renacedUsuariosRoutes      from "./routes/renaced/usuarios.routes.js";
import renacedClinicasRoutes      from "./routes/renaced/clinicas.routes.js";
import renacedDiagnosticoRoutes    from "./routes/renaced/diagnostico.routes.js";
import renacedComorbilidadRoutes   from "./routes/renaced/comorbilidad.routes.js";
import renacedPatologiaRoutes      from "./routes/renaced/patologia.routes.js";
import renacedAntecedentesGORoutes from "./routes/renaced/antecedentesgo.routes.js";
import renacedEventoRoutes         from "./routes/renaced/evento.routes.js";
import renacedEstiloVidaRoutes     from "./routes/renaced/estilovida.routes.js";
import renacedToxicomaniasRoutes   from "./routes/renaced/toxicomanias.routes.js";
import renacedReclasificacionRoutes from "./routes/renaced/reclasificacion.routes.js";
import renacedEmbarazoRoutes       from "./routes/renaced/embarazo.routes.js";
import renacedImportarBDRoutes     from "./routes/renaced/importarBD.routes.js";
import renacedMapaRoutes           from "./routes/renaced/mapa.routes.js";

// ── Super Admin ALAD (base de datos alad_master) ─────────────────────────────
import adminTenantsRoutes from "./routes/admin/tenants.routes.js";

// ── Público (landing ALAD, sin autenticación) ────────────────────────────────
import publicEstadisticasRoutes from "./routes/public/estadisticas.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir las carpetas de uploads como estáticos
// UPLOADS_PATH debe coincidir con el punto de montaje del volumen en Railway
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));

// Rutas de la API
app.use("/api/auth", authRoutes);
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

// ── Rutas RENACED (prefijo /api/renaced — DB renaced_mexico, aislada) ────────
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

// ── Rutas Super Admin ALAD (prefijo /api/admin — DB alad_master) ──────────
app.use("/api/admin/tenants", adminTenantsRoutes);

// ── Rutas públicas (prefijo /api/public — landing ALAD, sin login) ────────
app.use("/api/public", publicEstadisticasRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
