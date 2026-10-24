import pool from "../../config/db.master.js";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const getTenants = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, codigo, subdominio, db_name, activo,
              modulos, configuracion, fecha_creacion
       FROM tenants ORDER BY nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener países" });
  }
};

// Honduras (SAAPD) usa el esquema original de Evolución Metabólica (tabla `pacientes`,
// columna `estado`); los demás tenants usan el esquema RENACED (tabla `paciente`, `estatus_id`).
// Exportada para reutilizarse en el endpoint público de estadísticas (landing ALAD).
export async function consultarStatsTenant(dbPool, tenant) {
  if (tenant.codigo === "hn") {
    const [[s]] = await dbPool.query(
      `SELECT COUNT(*) AS total_pacientes, SUM(sexo='F') AS mujeres, SUM(sexo='M') AS hombres
       FROM pacientes WHERE estado = 1`
    );
    return s;
  }
  const [[s]] = await dbPool.query(
    `SELECT COUNT(*) AS total_pacientes, SUM(sexo='F') AS mujeres, SUM(sexo='M') AS hombres
     FROM paciente WHERE estatus_id = 1`
  );
  return s;
}

export const getTenantById = async (req, res) => {
  try {
    const [[tenant]] = await pool.query(
      `SELECT * FROM tenants WHERE id = ?`, [req.params.id]
    );
    if (!tenant) return res.status(404).json({ error: "País no encontrado" });

    // Estadísticas del tenant (conecta a su DB)
    let stats = null;
    try {
      const tenantPool = mysql.createPool({
        host: tenant.db_host || process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: tenant.db_name,
        port: process.env.DB_PORT,
        connectionLimit: 2,
      });
      stats = await consultarStatsTenant(tenantPool, tenant);
      await tenantPool.end();
    } catch (_) {
      stats = { total_pacientes: null, error: "DB no disponible" };
    }

    res.json({ ...tenant, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener país" });
  }
};

export const createTenant = async (req, res) => {
  try {
    const { nombre, codigo, subdominio, db_name, db_host, modulos, configuracion,
            admin_nombre, admin_email, admin_password } = req.body;

    if (!nombre || !codigo || !db_name) {
      return res.status(400).json({ error: "nombre, codigo y db_name son requeridos" });
    }
    if (!admin_nombre || !admin_email || !admin_password) {
      return res.status(400).json({ error: "Datos del administrador inicial son requeridos" });
    }

    const [result] = await pool.query(
      `INSERT INTO tenants (nombre, codigo, subdominio, db_name, db_host, modulos, configuracion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, codigo.toLowerCase(), subdominio || null, db_name,
        db_host || process.env.DB_HOST,
        modulos ? JSON.stringify(modulos) : null,
        configuracion ? JSON.stringify(configuracion) : null,
      ]
    );

    // Conectar a la DB del tenant y crear perfiles + admin inicial
    let adminCreado = false;
    try {
      const bcrypt = await import("bcryptjs");
      const tenantConn = await mysql.createConnection({
        host: db_host || process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: db_name,
        connectTimeout: 15000,
      });

      // Insertar perfiles por defecto si no existen
      await tenantConn.query(`
        INSERT IGNORE INTO perfil (id, nombre, nivel) VALUES
        (1, 'Administrador', 1),
        (2, 'Médico', 2),
        (3, 'Asistente', 3),
        (4, 'Enfermera', 4),
        (5, 'Investigador de Clínica', 2)
      `);

      // Crear usuario administrador inicial
      const hash = await bcrypt.default.hash(admin_password, 10);
      await tenantConn.query(
        `INSERT INTO usuario (username, password_hash, nombre_completo, email, perfil_id, activo)
         VALUES (?, ?, ?, ?, 1, 1)`,
        [admin_email, hash, admin_nombre, admin_email]
      );

      await tenantConn.end();
      adminCreado = true;
    } catch (dbErr) {
      console.error("Error al crear admin en tenant DB:", dbErr.message);
    }

    await pool.query(
      `INSERT INTO auditoria_global (tenant_id, usuario_id, rol, accion, detalle)
       VALUES (?, ?, 'SUPER_ADMIN', 'CREAR_TENANT', ?)`,
      [result.insertId, req.usuario?.id || null, `País ${nombre} (${codigo}) creado. Admin: ${admin_email}`]
    );

    res.status(201).json({
      id: result.insertId,
      admin_creado: adminCreado,
      admin_email,
      message: adminCreado
        ? `País ${nombre} registrado y administrador creado correctamente.`
        : `País ${nombre} registrado, pero no se pudo crear el admin (verifica que la DB exista).`,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un país con ese código" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear país" });
  }
};

export const impersonarTenant = async (req, res) => {
  try {
    const { codigo } = req.params;
    const [[tenant]] = await pool.query(
      `SELECT * FROM tenants WHERE codigo = ? AND activo = 1`, [codigo]
    );
    if (!tenant) return res.status(404).json({ error: "País no encontrado o inactivo" });

    // id: 0 — no corresponde a un usuario real del tenant, marca sesión de Super Admin
    const payload = {
      id: 0,
      nombre: `Super Admin (${req.usuario?.nombre || req.usuario?.email || "Global"})`,
      email: req.usuario?.email || null,
      perfil_id: 1,
      tenant: tenant.codigo,
      tenant_nombre: tenant.nombre,
      db_name: tenant.db_name,
      db_host: tenant.db_host,
      modulos: tenant.modulos ?? null,
      tipo: "renaced",
      super_admin: true,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

    await pool.query(
      `INSERT INTO auditoria_global (tenant_id, usuario_id, rol, accion, detalle)
       VALUES (?, ?, 'SUPER_ADMIN', 'IMPERSONAR_TENANT', ?)`,
      [tenant.id, req.usuario?.id || null, `Super Admin accedió al país ${tenant.nombre} (${tenant.codigo})`]
    );

    res.json({ token, usuario: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar acceso al país" });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, subdominio, activo, modulos, configuracion } = req.body;

    await pool.query(
      `UPDATE tenants SET
        nombre = COALESCE(?, nombre),
        subdominio = COALESCE(?, subdominio),
        activo = COALESCE(?, activo),
        modulos = COALESCE(?, modulos),
        configuracion = COALESCE(?, configuracion)
       WHERE id = ?`,
      [
        nombre || null, subdominio || null, activo ?? null,
        modulos ? JSON.stringify(modulos) : null,
        configuracion ? JSON.stringify(configuracion) : null,
        id
      ]
    );

    res.json({ message: "País actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar país" });
  }
};

export const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const [[tenant]] = await pool.query(`SELECT nombre, codigo FROM tenants WHERE id = ?`, [id]);
    if (!tenant) return res.status(404).json({ error: "País no encontrado" });

    await pool.query(`DELETE FROM tenants WHERE id = ?`, [id]);

    await pool.query(
      `INSERT INTO auditoria_global (tenant_id, usuario_id, rol, accion, detalle)
       VALUES (NULL, ?, 'SUPER_ADMIN', 'ELIMINAR_TENANT', ?)`,
      [req.usuario?.id || null, `País ${tenant.nombre} (${tenant.codigo}) eliminado`]
    );

    res.json({ message: "País eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar país" });
  }
};

/**
 * GET /admin/tenants/:id/bitacora
 * Bitácora de inicios de sesión (éxito y fallidos) de un país específico.
 *
 * Query params: page, limit, usuario (nombre/email parcial), exito (0|1), desde, hasta
 */
export const listarBitacoraTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const page   = Math.max(1, parseInt(req.query.page  || "1",  10));
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const offset = (page - 1) * limit;
    const usuario = req.query.usuario?.trim() || "";
    const exito   = req.query.exito?.trim();
    const desde   = req.query.desde?.trim() || "";
    const hasta   = req.query.hasta?.trim() || "";

    const where  = ["tenant_id = ?"];
    const params = [id];

    if (usuario) {
      where.push("(usuario_nombre LIKE ? OR usuario_email LIKE ?)");
      params.push(`%${usuario}%`, `%${usuario}%`);
    }
    if (exito === "0" || exito === "1") {
      where.push("exito = ?");
      params.push(exito);
    }
    if (desde) {
      where.push("fecha >= ?");
      params.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      where.push("fecha <= ?");
      params.push(`${hasta} 23:59:59`);
    }

    const whereStr = where.join(" AND ");

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM login_logs WHERE ${whereStr}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT id, tenant_id, tenant_codigo, usuario_id, usuario_nombre, usuario_email,
              usuario_rol, exito, ip, navegador, fecha
         FROM login_logs
        WHERE ${whereStr}
        ORDER BY fecha DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ total, page, limit, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bitácora" });
  }
};

/**
 * GET /admin/tenants/:id/bitacora/estadisticas
 * Resumen rápido de la bitácora de un país: logins hoy, últimos 7 días,
 * fallidos hoy y usuarios únicos hoy.
 */
export const estadisticasBitacoraTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const [[hoy]] = await pool.query(
      "SELECT COUNT(*) AS total FROM login_logs WHERE tenant_id = ? AND exito = 1 AND DATE(fecha) = CURDATE()",
      [id]
    );
    const [[semana]] = await pool.query(
      "SELECT COUNT(*) AS total FROM login_logs WHERE tenant_id = ? AND exito = 1 AND fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
      [id]
    );
    const [[fallidosHoy]] = await pool.query(
      "SELECT COUNT(*) AS total FROM login_logs WHERE tenant_id = ? AND exito = 0 AND DATE(fecha) = CURDATE()",
      [id]
    );
    const [[unicos]] = await pool.query(
      "SELECT COUNT(DISTINCT usuario_email) AS total FROM login_logs WHERE tenant_id = ? AND exito = 1 AND DATE(fecha) = CURDATE()",
      [id]
    );

    res.json({
      loginsHoy: hoy.total,
      loginsSemana: semana.total,
      fallidosHoy: fallidosHoy.total,
      usuariosUnicosHoy: unicos.total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estadísticas de bitácora" });
  }
};

export const getEstadisticasGlobales = async (req, res) => {
  try {
    const [tenants] = await pool.query(`SELECT * FROM tenants WHERE activo = 1`);

    const estadisticas = await Promise.all(
      tenants.map(async (t) => {
        try {
          const tp = mysql.createPool({
            host: t.db_host || process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: t.db_name,
            port: process.env.DB_PORT,
            connectionLimit: 1,
          });
          const s = await consultarStatsTenant(tp, t);
          await tp.end();
          return { pais: t.nombre, codigo: t.codigo, ...s };
        } catch (_) {
          return { pais: t.nombre, codigo: t.codigo, total_pacientes: null, error: true };
        }
      })
    );

    res.json(estadisticas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estadísticas globales" });
  }
};
