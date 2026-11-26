import { Router } from "express";
import { verificarToken, soloAdmin } from "../../../../shared/middlewares/auth.js";
import { obtenerMiPagina, guardarMiPagina } from "../controllers/miPaginaWeb.controller.js";

const router = Router();
router.use(verificarToken, soloAdmin);
router.get("/", obtenerMiPagina);
router.put("/", guardarMiPagina);

export default router;
