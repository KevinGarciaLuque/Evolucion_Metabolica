import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña son requeridos" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND estado = 1",
      [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];

    // Soporte para contraseñas en texto plano (migración) y bcrypt
    let valido = false;
    if (usuario.password.startsWith("$2")) {
      valido = await bcrypt.compare(password, usuario.password);
    } else {
      valido = password === usuario.password;
    }

    if (!valido)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, sexo: usuario.sexo ?? null },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Registrar auditoría de inicio de sesión
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || null;
    const ua = req.headers["user-agent"] || null;
    const desc = `Acceso al sistema desde ${ua ? ua.split(" ").slice(-1)[0] : "navegador desconocido"}`;
    pool.query(
      "INSERT INTO auditoria_sesiones (usuario_id, usuario_nombre, usuario_email, usuario_rol, accion, descripcion, ip, user_agent) VALUES (?, ?, ?, ?, 'login', ?, ?, ?)",
      [usuario.id, usuario.nombre, usuario.email, usuario.rol, desc, ip, ua]
    ).catch((e) => console.error("Auditoría login error:", e));

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, sexo: usuario.sexo ?? null },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
}

export async function me(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, sexo FROM usuarios WHERE id = ?",
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
}

export async function cambiarPassword(req, res) {
  const { passwordActual, passwordNuevo } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [req.usuario.id]);
    const usuario = rows[0];

    let valido = usuario.password.startsWith("$2")
      ? await bcrypt.compare(passwordActual, usuario.password)
      : passwordActual === usuario.password;

    if (!valido) return res.status(400).json({ error: "Contraseña actual incorrecta" });

    const hash = await bcrypt.hash(passwordNuevo, 10);
    await pool.query("UPDATE usuarios SET password = ? WHERE id = ?", [hash, usuario.id]);
    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
}
