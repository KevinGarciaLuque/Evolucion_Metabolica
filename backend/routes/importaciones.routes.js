import { Router } from "express";
import multer from "multer";
import { verificarToken, noAsistente } from "../middlewares/auth.js";
import { confirmarHEU, detalleBatchHEU, detalleConsultaHEU, listarPacientesHEU, previewHEU, sincronizarKoboHEU } from "../controllers/importaciones.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const previewUpload = (req, res, next) => {
  upload.single("archivo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: `Error al procesar archivo: ${err.message}` });
    }
    next();
  });
};

router.use(verificarToken);

router.post("/heu/preview", noAsistente, previewUpload, previewHEU);
router.post("/heu/confirmar", noAsistente, confirmarHEU);
router.post("/heu/sync-kobo", noAsistente, sincronizarKoboHEU);
router.get("/heu/consulta/:consultaId/detalle", noAsistente, detalleConsultaHEU);
router.get("/heu/:batchId", noAsistente, detalleBatchHEU);
router.get("/heu-pacientes", noAsistente, listarPacientesHEU);

export default router;
