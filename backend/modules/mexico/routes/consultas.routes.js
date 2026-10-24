import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import {
  getConsultasByPaciente,
  createConsulta,
} from "../controllers/consultas.controller.js";

const router = Router({ mergeParams: true });

router.use(verificarToken, resolverTenantDB);

router.get("/",   getConsultasByPaciente);
router.post("/",  createConsulta);

export default router;
