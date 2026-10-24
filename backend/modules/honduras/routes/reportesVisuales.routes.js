import { Router } from "express";
import { verificarToken } from "../middlewares/auth.js";
import { listar, exportarExcel } from "../controllers/reportesVisuales.controller.js";

const router = Router();

router.use(verificarToken);
router.get("/", listar);
router.get("/export-excel", exportarExcel);

export default router;
