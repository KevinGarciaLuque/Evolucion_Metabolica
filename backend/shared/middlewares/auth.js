import jwt from "jsonwebtoken";

export function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token no proporcionado" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== "admin" && req.usuario?.rol !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol administrador" });
  }
  next();
}

export function noAsistente(req, res, next) {
  if (req.usuario?.rol === "asistente") {
    return res.status(403).json({ error: "Acceso denegado: el rol asistente no puede modificar ni eliminar registros" });
  }
  next();
}
