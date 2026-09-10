import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import {
  subirYParsear, confirmarEscaneo, getEscaneosByPaciente, deleteEscaneo,
} from "../../controllers/renaced/escaneos.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, "../../uploads");
const destino = path.join(uploadsPath, "renaced_pdfs");
fs.mkdirSync(destino, { recursive: true });

const storage = multer.diskStorage({
  destination: destino,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Solo se permiten archivos PDF"));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.use(verificarToken, resolverTenantDB);

// POST /api/renaced/escaneos/upload/:pacienteId  → sube y parsea el PDF
router.post("/upload/:pacienteId", upload.single("pdf"), subirYParsear);
// POST /api/renaced/escaneos/confirmar           → guarda el escaneo revisado
router.post("/confirmar", confirmarEscaneo);
// GET  /api/renaced/escaneos/paciente/:pacienteId
router.get("/paciente/:pacienteId", getEscaneosByPaciente);
// DELETE /api/renaced/escaneos/:id
router.delete("/:id", deleteEscaneo);

export default router;
