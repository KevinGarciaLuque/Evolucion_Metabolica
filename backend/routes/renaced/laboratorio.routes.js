import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import {
  getLaboratoriosByPaciente,
  createLaboratorio,
} from "../../controllers/renaced/laboratorio.controller.js";

const router = Router({ mergeParams: true });

router.use(verificarToken, resolverTenantDB);

router.get("/",   getLaboratoriosByPaciente);
router.post("/",  createLaboratorio);

export default router;
