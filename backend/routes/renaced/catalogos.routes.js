import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getCatalogosEvaluacion } from "../../controllers/renaced/catalogos.controller.js";

const router = Router();
router.use(verificarToken, resolverTenantDB);
router.get("/evaluacion", getCatalogosEvaluacion);
export default router;
