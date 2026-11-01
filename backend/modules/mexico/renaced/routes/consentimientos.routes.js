import { Router } from "express";
import multer from "multer";
import path from "path";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { resolverAlcanceClinica } from "../middlewares/scopeClinica.js";
import {
  DIR_CONSENTIMIENTOS, listarConsentimientos, verConsentimiento, subirConsentimiento, importarArchivos, pendientesImportar,
} from "../controllers/consentimientos.controller.js";

// multer entrega el nombre en latin1: se recupera el UTF-8
const original = (file) => Buffer.from(file.originalname, "latin1").toString("utf8");
const TIPOS_OK = /^(application\/pdf|image\/(jpeg|png))$/;

// Subida desde la ficha del paciente: nombre con marca de tiempo y solo caracteres seguros
const subida = multer({
  storage: multer.diskStorage({
    destination: DIR_CONSENTIMIENTOS,
    filename: (_req, file, cb) => {
      const limpio = original(file).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_");
      cb(null, `${Date.now()}-${limpio}`);
    },
  }),
  fileFilter: (_req, file, cb) => (TIPOS_OK.test(file.mimetype) ? cb(null, true) : cb(new Error("Solo PDF o imagen (JPG/PNG)"))),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Carga masiva del sistema anterior: conserva el nombre original (NFC), sin rutas
const masiva = multer({
  storage: multer.diskStorage({
    destination: DIR_CONSENTIMIENTOS,
    filename: (_req, file, cb) =>
      cb(null, path.basename(original(file).replace(/\\/g, "/")).normalize("NFC")),
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 40 },
});

// ── Por paciente: /api/renaced/pacientes/:paciente_id/consentimientos ─────────
// (el acceso a la clínica del paciente ya lo valida index.js antes de llegar aquí)
export const porPaciente = Router({ mergeParams: true });
porPaciente.use(verificarToken, resolverTenantDB);
porPaciente.get("/", listarConsentimientos);
porPaciente.get("/:tipo/archivo", verConsentimiento);
porPaciente.post("/:tipo", subida.single("archivo"), subirConsentimiento);

// ── Carga masiva: POST /api/renaced/consentimientos/archivos (campo "archivos") ──
export const cargaMasiva = Router();
cargaMasiva.use(verificarToken, resolverTenantDB, resolverAlcanceClinica);
const soloAdmin = (req, res, next) =>
  req.alcance?.esAdmin ? next() : res.status(403).json({ error: "Solo el administrador puede importar archivos" });
cargaMasiva.post("/archivos", soloAdmin, masiva.array("archivos", 40), importarArchivos);
cargaMasiva.get("/pendientes", soloAdmin, pendientesImportar);
