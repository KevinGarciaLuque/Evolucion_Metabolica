import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getCatalogosEvaluacion } from "../../controllers/renaced/catalogos.controller.js";

const router = Router();
router.use(verificarToken);
router.get("/evaluacion", getCatalogosEvaluacion);
export default router;
