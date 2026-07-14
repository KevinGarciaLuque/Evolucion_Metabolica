import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import {
  getEvaluacionesByPaciente, createEvaluacion,
  getEvaluacionesComplementarias, createEvaluacionComplementaria,
  updateEvaluacionComplementaria, deleteEvaluacionComplementaria,
} from "../../controllers/renaced/evaluacion.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/complementarias",            getEvaluacionesComplementarias);
router.post("/complementarias",           createEvaluacionComplementaria);
router.put("/complementarias/:compId",    updateEvaluacionComplementaria);
router.delete("/complementarias/:compId", deleteEvaluacionComplementaria);
router.get("/",  getEvaluacionesByPaciente);
router.post("/", createEvaluacion);
export default router;
