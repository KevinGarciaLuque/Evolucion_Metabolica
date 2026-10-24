import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { verificarToken } from "./shared/middlewares/auth.js";
import { resolverTenantDB } from "./modules/mexico/renaced/middlewares/tenantDb.js";
import { resolverAlcanceClinica, verificarAccesoPaciente } from "./modules/mexico/renaced/middlewares/scopeClinica.js";

import authRoutes from "./modules/auth/routes/auth.routes.js";
import pacientesRoutes from "./modules/honduras/saapd/routes/pacientes.routes.js";
import analisisRoutes from "./modules/honduras/saapd/routes/analisis.routes.js";
import pdfRoutes from "./modules/honduras/saapd/routes/pdf.routes.js";
import dashboardRoutes from "./modules/honduras/saapd/routes/dashboard.routes.js";
import usuariosRoutes from "./modules/honduras/saapd/routes/usuarios.routes.js";
import consultasRoutes from "./modules/honduras/saapd/routes/consultas.routes.js";
import clinicoRoutes from "./modules/honduras/saapd/routes/clinico.routes.js";
import auditoriaRoutes  from "./modules/honduras/saapd/routes/auditoria.routes.js";
import mensajesRoutes   from "./modules/honduras/saapd/routes/mensajes.routes.js";
import notificacionesRoutes from "./modules/notificaciones/routes/notificaciones.routes.js";
import permisosRoutes   from "./modules/honduras/saapd/routes/permisos.routes.js";
import crecimientoRoutes from "./modules/honduras/saapd/routes/crecimiento.routes.js";
import reportesRoutes from "./modules/honduras/saapd/routes/reportes.routes.js";
import reportesVisualesRoutes from "./modules/honduras/saapd/routes/reportesVisuales.routes.js";
import importacionesRoutes from "./modules/honduras/saapd/routes/importaciones.routes.js";

// ── Módulo RENACED (base de datos renaced_mexico — aislada) ──────────────────
import renacedAuthRoutes        from "./modules/mexico/renaced/routes/auth.routes.js";
import renacedPacientesRoutes   from "./modules/mexico/renaced/routes/pacientes.routes.js";
import renacedConsultasRoutes   from "./modules/mexico/renaced/routes/consultas.routes.js";
import renacedLaboratorioRoutes from "./modules/mexico/renaced/routes/laboratorio.routes.js";
import renacedDashboardRoutes   from "./modules/mexico/renaced/routes/dashboard.routes.js";
import renacedTratamientoRoutes from "./modules/mexico/renaced/routes/tratamiento.routes.js";
import renacedEvaluacionRoutes  from "./modules/mexico/renaced/routes/evaluacion.routes.js";
import renacedMonitoreoRoutes   from "./modules/mexico/renaced/routes/monitoreo.routes.js";
import renacedEscaneosRoutes    from "./modules/mexico/renaced/routes/escaneos.routes.js";
import renacedEducacionRoutes   from "./modules/mexico/renaced/routes/educacion.routes.js";
import renacedCatalogosRoutes   from "./modules/mexico/renaced/routes/catalogos.routes.js";
import renacedReportesRoutes    from "./modules/mexico/renaced/routes/reportes.routes.js";
import renacedUsuariosRoutes      from "./modules/mexico/renaced/routes/usuarios.routes.js";
import renacedClinicasRoutes      from "./modules/mexico/renaced/routes/clinicas.routes.js";
import renacedDiagnosticoRoutes    from "./modules/mexico/renaced/routes/diagnostico.routes.js";
import renacedComorbilidadRoutes   from "./modules/mexico/renaced/routes/comorbilidad.routes.js";
import renacedPatologiaRoutes      from "./modules/mexico/renaced/routes/patologia.routes.js";
import renacedAntecedentesGORoutes from "./modules/mexico/renaced/routes/antecedentesgo.routes.js";
import renacedEventoRoutes         from "./modules/mexico/renaced/routes/evento.routes.js";
import renacedEstiloVidaRoutes     from "./modules/mexico/renaced/routes/estilovida.routes.js";
import renacedToxicomaniasRoutes   from "./modules/mexico/renaced/routes/toxicomanias.routes.js";
import renacedReclasificacionRoutes from "./modules/mexico/renaced/routes/reclasificacion.routes.js";
import renacedEmbarazoRoutes       from "./modules/mexico/renaced/routes/embarazo.routes.js";
import renacedImportarBDRoutes     from "./modules/mexico/renaced/routes/importarBD.routes.js";
import renacedMapaRoutes           from "./modules/mexico/renaced/routes/mapa.routes.js";

// ── Super Admin ALAD (base de datos alad_master) ─────────────────────────────
import adminTenantsRoutes from "./modules/admin/routes/tenants.routes.js";

// ── Público (landing ALAD, sin autenticación) ────────────────────────────────
import publicEstadisticasRoutes from "./modules/public/routes/estadisticas.routes.js";

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
app.use("/api/notificaciones", notificacionesRoutes);
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
