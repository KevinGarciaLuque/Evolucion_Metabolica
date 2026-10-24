import pool from "../config/db.js";
import poolMaster from "../config/db.master.js";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { registrarLoginLog } from "../utils/loginLog.js";

const INSTITUCIONES_VALIDAS = ["HMEP", "IHSS", "HEU"];

function normalizarInstituciones(valor) {
  if (!Array.isArray(valor)) return null;
  const limpias = [...new Set(valor.map((v) => String(v || "").trim().toUpperCase()))]
    .filter((v) => INSTITUCIONES_VALIDAS.includes(v));
  return limpias.length ? limpias : null;
}

function parsearInstitucionesDB(valor) {
  if (!valor) return null;
  try {
    const arr = typeof valor === "string" ? JSON.parse(valor) : valor;
    return normalizarInstituciones(arr);
  } catch {
    return null;
  }
}

function construirPayloadUsuario(usuario, modulosHonduras) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    sexo: usuario.sexo ?? null,
    mostrar_info_graficas: usuario.mostrar_info_graficas ? 1 : 0,
    instituciones_acceso: parsearInstitucionesDB(usuario.instituciones_acceso) || INSTITUCIONES_VALIDAS,
    modulos: modulosHonduras ?? null,
    tipo: "evolucion",
  };
}

// Módulos habilitados para Honduras en el catálogo de países (Panel Super Admin).
// null = sin restricción (todos los módulos visibles).
async function obtenerModulosHonduras() {
  try {
    const [[tenant]] = await poolMaster.query(
      "SELECT modulos FROM tenants WHERE codigo = 'hn' AND activo = 1"
    );
    return tenant?.modulos ?? null;
  } catch {
    return null;
  }
}

// Busca el usuario en todos los tenants RENACED activos
async function buscarEnRenaced(email, password, req) {
  const [tenants] = await poolMaster.query(
    "SELECT * FROM tenants WHERE activo = 1"
  );

  for (const tenant of tenants) {
    try {
      const conn = await mysql.createConnection({
        host: tenant.db_host || process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: tenant.db_name,
        connectTimeout: 8000,
      });

      const [rows] = await conn.query(
        "SELECT * FROM usuario WHERE (username = ? OR email = ?) AND activo = 1",
        [email, email]
      );
      await conn.end();

      if (rows.length === 0) continue;
      const u = rows[0];
      const valido = await bcrypt.compare(password, u.password_hash);
      if (!valido) continue;

      // Actualizar último acceso (sin await para no bloquear)
      mysql.createConnection({
        host: tenant.db_host || process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: tenant.db_name,
      }).then((c) => {
        c.query("UPDATE usuario SET ultimo_acceso = NOW() WHERE id = ?", [u.id]);
        c.end();
      }).catch(() => {});

      registrarLoginLog({
        tenantId: tenant.id,
        tenantCodigo: tenant.codigo,
        usuarioId: u.id,
        usuarioNombre: u.nombre_completo,
        usuarioEmail: u.email || u.username,
        usuarioRol: `perfil_${u.perfil_id}`,
        exito: 1,
        ip: req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      });

      return {
        payload: {
          id: u.id,
          nombre: u.nombre_completo,
          email: u.email || u.username,
          perfil_id: u.perfil_id,
          tenant: tenant.codigo,
          tenant_nombre: tenant.nombre,
          db_name: tenant.db_name,
          db_host: tenant.db_host,
          modulos: tenant.modulos ?? null,
          tipo: "renaced",
        },
        tenant,
      };
    } catch (_) {
      // Si no se puede conectar a este tenant, continúa con el siguiente
      continue;
    }
  }
  return null;
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña son requeridos" });

  try {
    // ── 1. Buscar en Evolucion Metabólica ────────────────────────────────
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND estado = 1",
      [email]
    );

    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || null;
    const ua = req.headers["user-agent"] || null;

    if (rows.length > 0) {
      const usuario = rows[0];
      let valido = usuario.password.startsWith("$2")
        ? await bcrypt.compare(password, usuario.password)
        : password === usuario.password;

      if (valido) {
        const modulosHonduras = await obtenerModulosHonduras();
        const usuarioPayload = construirPayloadUsuario(usuario, modulosHonduras);
        const token = jwt.sign(usuarioPayload, process.env.JWT_SECRET, { expiresIn: "8h" });

        pool.query(
          "INSERT INTO auditoria_sesiones (usuario_id, usuario_nombre, usuario_email, usuario_rol, accion, descripcion, ip, user_agent) VALUES (?, ?, ?, ?, 'login', ?, ?, ?)",
          [usuario.id, usuario.nombre, usuario.email, usuario.rol, `Acceso desde ${ua?.split(" ").slice(-1)[0] || "navegador"}`, ip, ua]
        ).catch(() => {});
        registrarLoginLog({
          tenantCodigo: "hn", usuarioId: usuario.id, usuarioNombre: usuario.nombre,
          usuarioEmail: usuario.email, usuarioRol: usuario.rol, exito: 1, ip, userAgent: ua,
        });

        return res.json({ token, usuario: usuarioPayload, tipo: "evolucion" });
      }

      registrarLoginLog({
        tenantCodigo: "hn", usuarioId: usuario.id, usuarioNombre: usuario.nombre,
        usuarioEmail: usuario.email, usuarioRol: usuario.rol, exito: 0, ip, userAgent: ua,
      });
    }

    // ── 2. Buscar en tenants RENACED ─────────────────────────────────────
    const renacedResult = await buscarEnRenaced(email, password, req);
    if (renacedResult) {
      const token = jwt.sign(renacedResult.payload, process.env.JWT_SECRET, { expiresIn: "8h" });
      return res.json({ token, usuario: renacedResult.payload, tipo: "renaced" });
    }

    return res.status(401).json({ error: "Credenciales incorrectas" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
}

export async function me(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, sexo, mostrar_info_graficas, instituciones_acceso FROM usuarios WHERE id = ?",
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const modulosHonduras = await obtenerModulosHonduras();
    res.json(construirPayloadUsuario(rows[0], modulosHonduras));
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
