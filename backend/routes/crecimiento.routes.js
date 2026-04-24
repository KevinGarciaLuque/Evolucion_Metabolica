import { Router } from "express";
import {
  listarCrecimiento,
  crearCrecimiento,
  actualizarCrecimiento,
  eliminarCrecimiento,
} from "../controllers/crecimiento.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();
router.use(verificarToken);

router.get("/:id/crecimiento",          listarCrecimiento);
router.post("/:id/crecimiento",         crearCrecimiento);
router.put("/:id/crecimiento/:regId",   actualizarCrecimiento);
router.delete("/:id/crecimiento/:regId",eliminarCrecimiento);

export default router;
