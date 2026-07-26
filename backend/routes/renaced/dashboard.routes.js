import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { resolverAlcanceClinica } from "../../middlewares/scopeClinica.js";
import { getResumen } from "../../controllers/renaced/dashboard.controller.js";

const router = Router();

router.use(verificarToken, resolverTenantDB, resolverAlcanceClinica);
router.get("/resumen", getResumen);

export default router;
