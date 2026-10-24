import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import {
  obtenerNotificaciones, crearAviso, eliminarAviso,
} from "../controllers/notificaciones.controller.js";

const router = Router();

router.use(verificarToken);

router.get("/",              obtenerNotificaciones);
router.post("/avisos",       crearAviso);
router.delete("/avisos/:id", eliminarAviso);


export default router;
