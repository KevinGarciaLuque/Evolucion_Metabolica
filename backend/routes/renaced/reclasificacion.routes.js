import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getReclasificaciones, createReclasificacion, deleteReclasificacion } from "../../controllers/renaced/reclasificacion.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",       getReclasificaciones);
router.post("/",      createReclasificacion);
router.delete("/:id", deleteReclasificacion);
export default router;
