import { Router } from "express";
import { listar, obtener, crear, actualizar, eliminar } from "../controllers/analisis.controller.js";
import { verificarToken, noAsistente } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken);

router.get("/",      listar);
router.get("/:id",   obtener);
router.post("/",     crear);
router.put("/:id",   noAsistente, actualizar);
router.delete("/:id", noAsistente, eliminar);

export default router;
