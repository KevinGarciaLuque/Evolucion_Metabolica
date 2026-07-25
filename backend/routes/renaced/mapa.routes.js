import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getMapaPacientes } from "../../controllers/renaced/mapa.controller.js";

const router = Router();

router.use(verificarToken, resolverTenantDB);
router.get("/", getMapaPacientes);

export default router;
