import { Router } from "express";
import { listar, obtener, crear, actualizar, eliminar } from "../controllers/analisis.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken);

router.get("/",      listar);
router.get("/:id",   obtener);
router.post("/",     crear);
router.put("/:id",   actualizar);
router.delete("/:id", eliminar);

export default router;
