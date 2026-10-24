import { Router } from "express";
import { getEstadisticasPublicas } from "../../controllers/public/estadisticas.controller.js";

// Sin verificarToken a propósito: esta ruta alimenta la landing pública (ALAD).
const router = Router();
router.get("/estadisticas", getEstadisticasPublicas);
export default router;
