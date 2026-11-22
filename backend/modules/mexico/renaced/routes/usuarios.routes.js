import { Router } from "express";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { verificarModulo } from "../middlewares/verificarModulo.js";
import {
  getUsuarios, getMedicos, getUsuarioById, createUsuario, updateUsuario, toggleUsuario,
} from "../controllers/usuarios.controller.js";
import { getSaludCuentas } from "../controllers/saludCuentas.controller.js";

const router = Router();

// Solo el Super Admin, o un Administrador (1) / Administrador de Clínica (6) al que el Super Admin le dio el permiso.
async function soloAdminRenaced(req, res, next) {
  if (req.usuario?.super_admin) return next();
  try {
    if ([1, 6].includes(req.usuario?.perfil_id)) {
      await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
      const [[u]] = await req.db.query("SELECT gestiona_cuentas FROM usuario WHERE id = ? AND activo = 1", [req.usuario.id]);
      if (u?.gestiona_cuentas) return next();
    }
  } catch (e) { console.error(e); }
  return res.status(403).json({ error: "Acceso denegado: este módulo requiere permiso del Super Admin" });
}

router.use(verificarToken, resolverTenantDB, soloAdminRenaced, verificarModulo("usuarios"));

router.get("/",          getUsuarios);
router.get("/medicos",   getMedicos);   // antes de "/:id"
// Salud de cuentas: solo el Administrador del país (no el Administrador de Clínica).
router.get("/salud", (req, res, next) => (req.usuario?.super_admin ? next() : res.status(403).json({ error: "Acceso denegado: se requiere perfil Administrador" })), getSaludCuentas);
router.get("/:id",       getUsuarioById);
router.post("/",         createUsuario);
router.put("/:id",       updateUsuario);
router.patch("/:id/toggle", toggleUsuario);

export default router;
