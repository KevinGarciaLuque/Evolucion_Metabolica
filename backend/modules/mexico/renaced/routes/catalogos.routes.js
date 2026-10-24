import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { getCatalogosEvaluacion, buscarColonias } from "../controllers/catalogos.controller.js";

const router = Router();
router.use(verificarToken, resolverTenantDB);
router.get("/evaluacion", getCatalogosEvaluacion);
router.get("/colonias", buscarColonias);
export default router;
