import { Router } from "express";
import { listar, estadisticas } from "../controllers/auditoria.controller.js";
import { verificarToken, soloAdmin } from "../../../../shared/middlewares/auth.js";

const router = Router();

// Todas las rutas requieren token válido + rol admin
router.use(verificarToken, soloAdmin);

router.get("/",            listar);
router.get("/estadisticas", estadisticas);

export default router;
