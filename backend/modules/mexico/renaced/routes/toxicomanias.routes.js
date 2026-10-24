import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { getToxicomanias, createToxicomanias, deleteToxicomanias } from "../controllers/toxicomanias.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",       getToxicomanias);
router.post("/",      createToxicomanias);
router.delete("/:id", deleteToxicomanias);
export default router;
