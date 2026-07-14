import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getToxicomanias, createToxicomanias, deleteToxicomanias } from "../../controllers/renaced/toxicomanias.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",       getToxicomanias);
router.post("/",      createToxicomanias);
router.delete("/:id", deleteToxicomanias);
export default router;
