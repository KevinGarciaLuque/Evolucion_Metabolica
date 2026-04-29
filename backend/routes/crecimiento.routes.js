import { Router } from "express";
import {
  listarCrecimiento,
  crearCrecimiento,
  actualizarCrecimiento,
  eliminarCrecimiento,
} from "../controllers/crecimiento.controller.js";
import { verificarToken, noAsistente } from "../middlewares/auth.js";

const router = Router();
router.use(verificarToken);

router.get("/:id/crecimiento",          listarCrecimiento);
router.post("/:id/crecimiento",         crearCrecimiento);
router.put("/:id/crecimiento/:regId",   noAsistente, actualizarCrecimiento);
router.delete("/:id/crecimiento/:regId", noAsistente, eliminarCrecimiento);

export default router;
