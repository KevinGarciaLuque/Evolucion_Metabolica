import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import {
  getConsultasByPaciente,
  createConsulta,
} from "../../controllers/renaced/consultas.controller.js";

const router = Router({ mergeParams: true });

router.use(verificarToken, resolverTenantDB);

router.get("/",   getConsultasByPaciente);
router.post("/",  createConsulta);

export default router;
