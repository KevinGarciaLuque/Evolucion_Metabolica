import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import {
  getConsultasByPaciente,
  createConsulta,
  createHojaConsulta,
  getHistorialConsultas,
} from "../controllers/consultas.controller.js";

const router = Router({ mergeParams: true });

router.use(verificarToken, resolverTenantDB);

router.get("/",   getConsultasByPaciente);
router.get("/historial", getHistorialConsultas); // visitas agrupadas por fecha (incluye datos del sistema anterior)
router.post("/",  createConsulta);
router.post("/hoja", createHojaConsulta); // consulta completa: visita + secciones con datos

export default router;
