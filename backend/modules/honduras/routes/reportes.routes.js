import { Router } from "express";
import { verificarToken } from "../middlewares/auth.js";
import {
  exportarPacienteExcel,
  exportarPacientePdf,
  exportarTodosZip,
} from "../controllers/reportes.controller.js";

const router = Router();

router.use(verificarToken);

router.get("/paciente/:id/excel", exportarPacienteExcel);
router.get("/paciente/:id/pdf", exportarPacientePdf);
router.get("/todos/zip", exportarTodosZip);

export default router;
