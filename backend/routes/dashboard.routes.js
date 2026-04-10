import { Router } from "express";
import {
  statsGlobales, porDepartamento, porGenero, porEdad, tendencias, recientes,
} from "../controllers/dashboard.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

router.use(verificarToken);

router.get("/stats",            statsGlobales);
router.get("/por-departamento", porDepartamento);
router.get("/por-genero",       porGenero);
router.get("/por-edad",         porEdad);
router.get("/tendencias",       tendencias);
router.get("/recientes",        recientes);

export default router;
