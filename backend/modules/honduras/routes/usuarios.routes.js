import { Router } from "express";
import { listar, obtener, crear, actualizar, eliminar } from "../controllers/usuarios.controller.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken, soloAdmin);

router.get("/",      listar);
router.get("/:id",   obtener);
router.post("/",     crear);
router.put("/:id",   actualizar);
router.delete("/:id", eliminar);

export default router;
