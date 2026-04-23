import { Router } from "express";
import {
  listarTodos,
  misPermisos,
  obtenerPorUsuario,
  actualizarPermisos,
} from "../controllers/permisos.controller.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken);

// Cualquier usuario autenticado puede consultar sus propios módulos
router.get("/mios", misPermisos);

// Solo admin puede gestionar permisos de otros usuarios
router.get("/",             soloAdmin, listarTodos);
router.get("/:usuarioId",   soloAdmin, obtenerPorUsuario);
router.put("/:usuarioId",   soloAdmin, actualizarPermisos);

export default router;
