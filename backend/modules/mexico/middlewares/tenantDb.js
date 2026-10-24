import { getTenantPool } from "../config/db.renaced.js";

// Resuelve la base de datos del país (tenant) del usuario autenticado
// y la expone en req.db. Debe usarse después de verificarToken en
// todas las rutas /api/renaced/*.
export function resolverTenantDB(req, res, next) {
  if (req.usuario?.tipo !== "renaced" || !req.usuario?.db_name) {
    return res.status(403).json({ error: "Acceso restringido a usuarios RENACED" });
  }
  req.db = getTenantPool(req.usuario.db_name, req.usuario.db_host);
  next();
}
