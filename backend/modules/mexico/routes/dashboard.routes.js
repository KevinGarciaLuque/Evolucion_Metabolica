import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { resolverAlcanceClinica } from "../middlewares/scopeClinica.js";
import { verificarModulo } from "../middlewares/verificarModulo.js";
import { getResumen } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verificarToken, resolverTenantDB, resolverAlcanceClinica, verificarModulo("dashboard"));
router.get("/resumen", getResumen);

export default router;
