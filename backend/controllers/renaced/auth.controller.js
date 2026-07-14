import poolRenaced from "../../config/db.renaced.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function loginRenaced(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña son requeridos" });

  try {
    const [rows] = await poolRenaced.query(
      "SELECT * FROM usuario WHERE (username = ? OR email = ?) AND activo = 1",
      [email, email]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];
    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    // Actualizar último acceso
    poolRenaced.query("UPDATE usuario SET ultimo_acceso = NOW() WHERE id = ?", [usuario.id]).catch(() => {});

    const payload = {
      id: usuario.id,
      nombre: usuario.nombre_completo,
      email: usuario.email || usuario.username,
      perfil_id: usuario.perfil_id,
      tenant: "mx",
      tipo: "renaced",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({ token, usuario: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
}

export async function meRenaced(req, res) {
  // Sesión de Super Admin (impersonación) — no corresponde a un usuario real del tenant
  if (req.usuario?.super_admin) {
    const { id, nombre, email, perfil_id, tenant, tenant_nombre, db_name, db_host, modulos } = req.usuario;
    return res.json({ id, nombre, email, perfil_id, tenant, tenant_nombre, db_name, db_host, modulos: modulos ?? null, tipo: "renaced" });
  }
  try {
    const [rows] = await req.db.query(
      "SELECT id, username, nombre_completo, email, perfil_id FROM usuario WHERE id = ? AND activo = 1",
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const u = rows[0];
    res.json({
      id: u.id, nombre: u.nombre_completo, email: u.email || u.username, perfil_id: u.perfil_id,
      tenant: req.usuario.tenant, tenant_nombre: req.usuario.tenant_nombre,
      db_name: req.usuario.db_name, db_host: req.usuario.db_host,
      modulos: req.usuario.modulos ?? null, tipo: "renaced",
    });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
}
