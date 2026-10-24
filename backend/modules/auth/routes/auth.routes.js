import { Router } from "express";
import { login, me, cambiarPassword } from "../controllers/auth.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", verificarToken, me);
router.put("/cambiar-password", verificarToken, cambiarPassword);

export default router;
