import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import {
  getClinicas, getEstablecimientosDisponibles, createClinica, updateClinica, toggleClinica,
} from "../../controllers/renaced/clinicas.controller.js";

const router = Router();

function soloAdminRenaced(req, res, next) {
  if (req.usuario?.perfil_id !== 1) {
    return res.status(403).json({ error: "Acceso denegado: se requiere perfil Administrador" });
  }
  next();
}

router.use(verificarToken, resolverTenantDB, soloAdminRenaced);

router.get("/",                       getClinicas);
router.get("/establecimientos",       getEstablecimientosDisponibles);
router.post("/",                      createClinica);
router.put("/:id",                    updateClinica);
router.patch("/:id/toggle",           toggleClinica);

export default router;
