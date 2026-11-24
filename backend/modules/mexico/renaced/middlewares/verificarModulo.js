import poolMaster from "../../../../shared/config/db.master.js";

// Aplica el toggle de módulos por país (tabla tenants.modulos) también en el
// servidor, no solo en el sidebar del frontend — así nadie accede a un módulo
// desactivado por URL directa, sea Administrador, Médico, Investigador, etc.
// modulos === null/undefined en el token significa "sin restricción" (todos
// habilitados), igual que ya asume el frontend.
export function verificarModulo(clave) {
  return (req, res, next) => {
    // El Super Admin (sesión de impersonación) siempre debe poder ver todos los
    // módulos de cualquier país — el toggle solo aplica a usuarios reales del tenant.
    if (req.usuario?.super_admin) return next();

    const modulos = req.usuario?.modulos;
    if (Array.isArray(modulos) && !modulos.includes(clave)) {
      return res.status(403).json({ error: "Este módulo no está habilitado para tu país" });
    }
    next();
  };
}

// Igual que verificarModulo, pero consulta los permisos VIGENTES (país ∩ usuario) en cada
// petición en lugar de fiarse del token: así, una función que el Super Admin apaga deja
// de funcionar de inmediato, sin esperar a que la persona vuelva a iniciar sesión.
// Úsalo en funciones puntuales (p. ej. "importar_pdf"); verificarModulo basta para pantallas.
export function verificarModuloVigente(clave) {
  return async (req, res, next) => {
    if (req.usuario?.super_admin) return next();
    try {
      let modulos = null;
      try {
        const [[t]] = await poolMaster.query("SELECT modulos FROM tenants WHERE codigo = ?", [req.usuario?.tenant || "mx"]);
        modulos = t?.modulos ?? null;
      } catch (_) { modulos = req.usuario?.modulos ?? null; }

      try {
        const [rows] = await req.db.query("SELECT modulo FROM permisos_modulos WHERE usuario_id = ?", [req.usuario.id]);
        if (rows.length > 0) {
          const propios = rows.map((r) => r.modulo);
          modulos = Array.isArray(modulos) ? modulos.filter((m) => propios.includes(m)) : propios;
        }
      } catch (_) { /* la tabla aún no existe: sin restricción individual */ }

      if (Array.isArray(modulos) && !modulos.includes(clave)) {
        return res.status(403).json({ error: "Esta función no está habilitada para tu usuario" });
      }
      next();
    } catch (err) { next(err); }
  };
}

// Funciones exclusivas del Super Admin: ningún permiso de país o usuario las habilita.
export function soloSuperAdmin(req, res, next) {
  if (!req.usuario?.super_admin) return res.status(403).json({ error: "Acceso exclusivo del Super Admin" });
  next();
}
