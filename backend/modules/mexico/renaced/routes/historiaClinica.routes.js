import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import { parsearHistoriaClinica } from "../services/pdfHistoriaClinicaRenaced.js";
import { nombreNoCoincide } from "../services/resultadosLab.js";

// El PDF solo se lee para rellenar formularios: no se conserva (trae datos personales y de facturación).
const upload = multer({
  dest: path.join(os.tmpdir(), "renaced_historia_clinica"),
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Solo se permiten archivos PDF")),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();
router.use(verificarToken, resolverTenantDB);

// POST /api/renaced/historia-clinica/escanear?paciente=ID  (campo "pdf")
// Devuelve los campos reconocidos; con ?paciente avisa si el nombre del PDF no es el del paciente.
router.post("/escanear", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });
  try {
    const r = await parsearHistoriaClinica(req.file.path);
    if (req.query.paciente) {
      const [[pac]] = await req.db.query("SELECT nombre, ap_pat, ap_mat FROM paciente WHERE id = ?", [req.query.paciente]);
      if (pac && nombreNoCoincide(pac, r.cabecera)) {
        r.avisos.unshift("El nombre del PDF no coincide con el del paciente. Verifica que sea el PDF correcto antes de guardar.");
        r.nombre_distinto = true;
      }
    }
    delete r.cabecera;
    res.json(r);
  } catch (err) {
    console.error("Error al leer la historia clínica:", err);
    res.status(err.code === "FORMATO_NO_RECONOCIDO" ? 422 : 500).json({ error: err.message || "Error al procesar el PDF" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

export default router;
