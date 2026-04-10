import { Router } from "express";
import {
  listar, obtener, crear, actualizar, eliminar, historial, departamentos,
} from "../controllers/pacientes.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken);

router.get("/",                   listar);
router.get("/departamentos",      departamentos);
router.get("/:id",                obtener);
router.post("/",                  crear);
router.put("/:id",                actualizar);
router.delete("/:id",             eliminar);
router.get("/:id/historial",      historial);

export default router;
