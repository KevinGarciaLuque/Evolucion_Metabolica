import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import {
  getPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
} from "../../controllers/renaced/pacientes.controller.js";

const router = Router();

router.use(verificarToken, resolverTenantDB);

router.get("/",       getPacientes);
router.get("/:id",    getPacienteById);
router.post("/",      createPaciente);
router.put("/:id",    updatePaciente);

export default router;
