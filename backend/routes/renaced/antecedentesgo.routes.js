import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getAntecedentesGO, saveAntecedentesGO } from "../../controllers/renaced/antecedentesgo.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",  getAntecedentesGO);
router.put("/",  saveAntecedentesGO);
export default router;
