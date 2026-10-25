import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { verificarModulo } from "../middlewares/verificarModulo.js";
import {
  getUsuarios, getMedicos, getUsuarioById, createUsuario, updateUsuario, toggleUsuario,
} from "../controllers/usuarios.controller.js";

const router = Router();

function soloAdminRenaced(req, res, next) {
  if (req.usuario?.perfil_id !== 1) {
    return res.status(403).json({ error: "Acceso denegado: se requiere perfil Administrador" });
  }
  next();
}

router.use(verificarToken, resolverTenantDB, soloAdminRenaced, verificarModulo("usuarios"));

router.get("/",          getUsuarios);
router.get("/medicos",   getMedicos);   // antes de "/:id"
router.get("/:id",       getUsuarioById);
router.post("/",         createUsuario);
router.put("/:id",       updateUsuario);
router.patch("/:id/toggle", toggleUsuario);

export default router;
