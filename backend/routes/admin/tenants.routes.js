import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getEstadisticasGlobales,
  impersonarTenant,
  listarBitacoraTenant,
  estadisticasBitacoraTenant,
} from "../../controllers/admin/tenants.controller.js";
import {
  listarUsuariosTenant,
  actualizarPermisosUsuarioTenant,
} from "../../controllers/admin/tenantUsuarios.controller.js";

const router = Router();

// Middleware: solo Super Admin puede acceder
const soloSuperAdmin = (req, res, next) => {
  if (req.usuario?.rol !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Acceso restringido a Super Admin" });
  }
  next();
};

router.use(verificarToken, soloSuperAdmin);

router.get("/",                    getTenants);
router.get("/estadisticas-globales", getEstadisticasGlobales);
router.get("/:id",                 getTenantById);
router.post("/by-codigo/:codigo/impersonate", impersonarTenant);
router.post("/",                   createTenant);
router.put("/:id",                 updateTenant);
router.delete("/:id",              deleteTenant);

router.get("/:id/usuarios",                       listarUsuariosTenant);
router.put("/:id/usuarios/:usuarioId/permisos",   actualizarPermisosUsuarioTenant);

router.get("/:id/bitacora",              listarBitacoraTenant);
router.get("/:id/bitacora/estadisticas", estadisticasBitacoraTenant);

export default router;
