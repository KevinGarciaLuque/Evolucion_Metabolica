import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { getEducacionByPaciente, createEducacion } from "../controllers/educacion.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",  getEducacionByPaciente);
router.post("/", createEducacion);
export default router;
