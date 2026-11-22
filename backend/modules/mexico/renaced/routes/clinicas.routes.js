import { Router } from "express";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { verificarModulo } from "../middlewares/verificarModulo.js";
import {
  getClinicas, getEstablecimientosDisponibles, createClinica, updateClinica, toggleClinica,
} from "../controllers/clinicas.controller.js";

const router = Router();

// Solo el Super Admin, o un Administrador (1) / Administrador de Clínica (6) al que el Super Admin le dio el permiso.
async function soloAdminRenaced(req, res, next) {
  if (req.usuario?.super_admin) return next();
  try {
    if ([1].includes(req.usuario?.perfil_id)) {
      await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
      const [[u]] = await req.db.query("SELECT gestiona_cuentas FROM usuario WHERE id = ? AND activo = 1", [req.usuario.id]);
      if (u?.gestiona_cuentas) return next();
    }
  } catch (e) { console.error(e); }
  return res.status(403).json({ error: "Acceso denegado: este módulo requiere permiso del Super Admin" });
}

router.use(verificarToken, resolverTenantDB, soloAdminRenaced, verificarModulo("clinicas"));

router.get("/",                       getClinicas);
router.get("/establecimientos",       getEstablecimientosDisponibles);
router.post("/",                      createClinica);
router.put("/:id",                    updateClinica);
router.patch("/:id/toggle",           toggleClinica);

export default router;
