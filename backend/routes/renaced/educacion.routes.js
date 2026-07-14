import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getEducacionByPaciente, createEducacion } from "../../controllers/renaced/educacion.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",  getEducacionByPaciente);
router.post("/", createEducacion);
export default router;
