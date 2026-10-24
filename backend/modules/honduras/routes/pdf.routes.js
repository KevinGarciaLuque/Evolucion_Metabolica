import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { subirYParsear, confirmarAnalisis } from "../controllers/pdf.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// UPLOADS_PATH debe coincidir con el punto de montaje del volumen en Railway
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: path.join(uploadsPath, "pdfs"),
  filename: (_req, file, cb) => {
    const nombre = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, nombre);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Solo se permiten archivos PDF"));
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const router = Router();

router.use(verificarToken);

// POST /api/pdf/upload/:pacienteId → sube y parsea el PDF
router.post("/upload/:pacienteId", upload.single("pdf"), subirYParsear);

// POST /api/pdf/confirmar → guarda el análisis revisado
router.post("/confirmar", confirmarAnalisis);

export default router;
