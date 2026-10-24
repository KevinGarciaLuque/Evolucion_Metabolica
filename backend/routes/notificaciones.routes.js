import { Router } from "express";
import { verificarToken } from "../middlewares/auth.js";
import {
  obtenerNotificaciones, crearAviso, eliminarAviso,
  listarNovedades, crearNovedad, actualizarNovedad, eliminarNovedad,
} from "../controllers/notificaciones.controller.js";

const router = Router();

router.use(verificarToken);

router.get("/",              obtenerNotificaciones);
router.post("/avisos",       crearAviso);
router.delete("/avisos/:id", eliminarAviso);

router.get("/novedades",         listarNovedades);
router.post("/novedades",        crearNovedad);
router.put("/novedades/:id",     actualizarNovedad);
router.delete("/novedades/:id",  eliminarNovedad);

export default router;
