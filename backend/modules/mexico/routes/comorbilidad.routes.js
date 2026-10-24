import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getComorbilidad, saveComorbilidad } from "../../controllers/renaced/comorbilidad.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",  getComorbilidad);
router.put("/",  saveComorbilidad);
export default router;
