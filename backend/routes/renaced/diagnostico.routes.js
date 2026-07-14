import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getDiagnostico, saveDiagnostico } from "../../controllers/renaced/diagnostico.controller.js";

const router = Router();
router.use(verificarToken, resolverTenantDB);

router.get("/:pacienteId",  getDiagnostico);
router.put("/:pacienteId",  saveDiagnostico);

export default router;
