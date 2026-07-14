import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import {
  getConsultasByPaciente,
  createConsulta,
} from "../../controllers/renaced/consultas.controller.js";

const router = Router({ mergeParams: true });

router.use(verificarToken);

router.get("/",   getConsultasByPaciente);
router.post("/",  createConsulta);

export default router;
