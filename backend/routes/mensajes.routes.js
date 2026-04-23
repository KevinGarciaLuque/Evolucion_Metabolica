import { Router } from "express";
import { listar, enviarAltoRiesgo, enviarIndividual } from "../controllers/mensajes.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken);

router.get("/",                          listar);
router.post("/enviar-alto-riesgo",       enviarAltoRiesgo);
router.post("/enviar/:paciente_id",      enviarIndividual);

export default router;
