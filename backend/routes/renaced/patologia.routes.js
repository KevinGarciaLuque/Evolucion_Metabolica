import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getPatologia, savePatologia } from "../../controllers/renaced/patologia.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",  getPatologia);
router.put("/",  savePatologia);
export default router;
