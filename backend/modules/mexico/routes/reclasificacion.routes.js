import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { getReclasificaciones, createReclasificacion, deleteReclasificacion } from "../../controllers/renaced/reclasificacion.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",       getReclasificaciones);
router.post("/",      createReclasificacion);
router.delete("/:id", deleteReclasificacion);
export default router;
