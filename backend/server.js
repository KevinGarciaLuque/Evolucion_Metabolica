import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

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

// ── Registro automático de módulos ───────────────────────────────────────────
// Cada módulo (modules/<area>/index.js o modules/<pais>/<sistema>/index.js)
// exporta montar(app) con sus propias rutas. Un país nuevo solo necesita su
// carpeta con un index.js; aquí no hay que tocar nada.
function descubrirModulos(base) {
  const encontrados = [];
  const visitar = (dir, nivel) => {
    const idx = path.join(dir, "index.js");
    if (fs.existsSync(idx)) { encontrados.push(idx); return; }
    if (nivel >= 2) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) visitar(path.join(dir, e.name), nivel + 1);
    }
  };
  visitar(base, 0);
  return encontrados.sort();
}

for (const archivo of descubrirModulos(path.join(__dirname, "modules"))) {
  const modulo = await import(pathToFileURL(archivo).href);
  modulo.montar(app);
  console.log(`📦 Módulo cargado: ${path.relative(path.join(__dirname, "modules"), path.dirname(archivo)).split(path.sep).join("/")}`);
}

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
