import { Router } from "express";
import { getEstadisticasPublicas } from "../controllers/estadisticas.controller.js";
import { getPaginaPublica } from "../controllers/paginaWeb.controller.js";

// Sin verificarToken a propósito: esta ruta alimenta la landing pública (ALAD).
const router = Router();
router.get("/estadisticas", getEstadisticasPublicas);
router.get("/pagina/:pais/:sistema", getPaginaPublica);
export default router;
