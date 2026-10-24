import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { getEventos, createEvento, deleteEvento } from "../controllers/evento.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",       getEventos);
router.post("/",      createEvento);
router.delete("/:id", deleteEvento);
export default router;
