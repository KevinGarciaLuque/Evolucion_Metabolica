import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { getComorbilidad, saveComorbilidad } from "../controllers/comorbilidad.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",  getComorbilidad);
router.put("/",  saveComorbilidad);
export default router;
