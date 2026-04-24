import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
