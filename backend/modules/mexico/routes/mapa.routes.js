import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { resolverAlcanceClinica } from "../../middlewares/scopeClinica.js";
import { verificarModulo } from "../../middlewares/verificarModulo.js";
import { getMapaPacientes } from "../../controllers/renaced/mapa.controller.js";

const router = Router();

router.use(verificarToken, resolverTenantDB, resolverAlcanceClinica, verificarModulo("mapa"));
router.get("/", getMapaPacientes);

export default router;
