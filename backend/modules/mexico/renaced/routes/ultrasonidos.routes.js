import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_PATH } from "../../../../shared/paths.js";
import {
  escanearUltrasonido, getUltrasonidos, createUltrasonido, deleteUltrasonido,
} from "../controllers/ultrasonidos.controller.js";

// El PDF se conserva en uploads/renaced_ultrasonidos
const destino = path.join(UPLOADS_PATH, "renaced_ultrasonidos");
fs.mkdirSync(destino, { recursive: true });
const storage = multer.diskStorage({
  destination: destino,
  filename: (_req, file, cb) => {
    const original = Buffer.from(file.originalname, "latin1").toString("utf8");
    const limpio = original.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_");
    cb(null, `${Date.now()}-${limpio}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Solo se permiten archivos PDF")),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);

router.post("/escanear", upload.single("pdf"), escanearUltrasonido);   // campo "pdf"
router.get("/", getUltrasonidos);
router.post("/", createUltrasonido);
router.delete("/:id(\\d+)", deleteUltrasonido);

export default router;
