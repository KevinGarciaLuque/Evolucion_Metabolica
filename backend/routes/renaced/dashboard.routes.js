import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getResumen } from "../../controllers/renaced/dashboard.controller.js";

const router = Router();

router.use(verificarToken);
router.get("/resumen", getResumen);

export default router;
