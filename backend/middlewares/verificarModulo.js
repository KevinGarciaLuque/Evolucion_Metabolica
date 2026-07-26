// Aplica el toggle de módulos por país (tabla tenants.modulos) también en el
// servidor, no solo en el sidebar del frontend — así nadie accede a un módulo
// desactivado por URL directa, sea Administrador, Médico, Investigador, etc.
// modulos === null/undefined en el token significa "sin restricción" (todos
// habilitados), igual que ya asume el frontend.
export function verificarModulo(clave) {
  return (req, res, next) => {
    const modulos = req.usuario?.modulos;
    if (Array.isArray(modulos) && !modulos.includes(clave)) {
      return res.status(403).json({ error: "Este módulo no está habilitado para tu país" });
    }
    next();
  };
}
