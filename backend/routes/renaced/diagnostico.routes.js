import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getDiagnostico, saveDiagnostico } from "../../controllers/renaced/diagnostico.controller.js";

const router = Router();
router.use(verificarToken);

router.get("/:pacienteId",  getDiagnostico);
router.put("/:pacienteId",  saveDiagnostico);

export default router;
