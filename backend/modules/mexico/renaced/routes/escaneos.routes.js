import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { UPLOADS_PATH } from "../../../../shared/paths.js";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import {
  subirYParsear, confirmarEscaneo, getEscaneosByPaciente, deleteEscaneo, listarMonitores,
} from "../controllers/escaneos.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsPath = UPLOADS_PATH;
const destino = path.join(uploadsPath, "renaced_pdfs");
fs.mkdirSync(destino, { recursive: true });

const storage = multer.diskStorage({
  destination: destino,
  filename: (_req, file, cb) => {
    // multer entrega el nombre en latin1: se recupera el UTF-8 y se deja sólo ASCII seguro para la URL
    const original = Buffer.from(file.originalname, "latin1").toString("utf8");
    const limpio = original.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_");
    cb(null, `${Date.now()}-${limpio}`);
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

// GET  /api/renaced/escaneos/monitores           → tipos de reporte admitidos
router.get("/monitores", listarMonitores);
// POST /api/renaced/escaneos/upload/:pacienteId?tipo=  → sube y parsea el PDF (tipo opcional)
router.post("/upload/:pacienteId", upload.single("pdf"), subirYParsear);
// POST /api/renaced/escaneos/confirmar           → guarda el escaneo revisado
router.post("/confirmar", confirmarEscaneo);
// GET  /api/renaced/escaneos/paciente/:pacienteId
router.get("/paciente/:pacienteId", getEscaneosByPaciente);
// DELETE /api/renaced/escaneos/:id
router.delete("/:id", deleteEscaneo);

export default router;
