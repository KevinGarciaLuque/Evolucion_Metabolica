import pool from "../config/db.js";

/**
 * GET /api/auditoria
 * Lista los registros de auditoría de sesiones y acciones.
 * Solo accesible para administradores.
 *
 * Query params:
 *   page     (default 1)
 *   limit    (default 50)
 *   usuario  (filtra por nombre o email, parcial)
 *   accion   (texto parcial, ej: 'login', 'paciente', 'bitacora')
 *   entidad  (sesion | paciente | bitacora | usuario | pdf)
 *   desde    (fecha ISO yyyy-mm-dd)
 *   hasta    (fecha ISO yyyy-mm-dd)
 */
export async function listar(req, res) {
  try {
    const page    = Math.max(1, parseInt(req.query.page  || "1",  10));
    const limit   = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const offset  = (page - 1) * limit;
    const usuario = req.query.usuario?.trim() || "";
    const accion  = req.query.accion?.trim()  || "";
    const entidad = req.query.entidad?.trim() || "";
    const desde   = req.query.desde?.trim()   || "";
    const hasta   = req.query.hasta?.trim()   || "";

    const where  = ["1=1"];
    const params = [];

    if (usuario) {
      where.push("(usuario_nombre LIKE ? OR usuario_email LIKE ?)");
      params.push(`%${usuario}%`, `%${usuario}%`);
    }
    if (accion) {
      where.push("accion LIKE ?");
      params.push(`%${accion}%`);
    }
    if (entidad) {
      where.push("entidad = ?");
      params.push(entidad);
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
      `SELECT COUNT(*) AS total FROM auditoria_sesiones WHERE ${whereStr}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT id, usuario_id, usuario_nombre, usuario_email, usuario_rol,
              accion, entidad, entidad_id, descripcion, ip, user_agent, fecha
         FROM auditoria_sesiones
        WHERE ${whereStr}
        ORDER BY fecha DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ total, page, limit, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener auditoría" });
  }
}

/**
 * GET /api/auditoria/estadisticas
 * Resumen rápido: total logins hoy, esta semana, usuarios únicos hoy.
 */
export async function estadisticas(req, res) {
  try {
    const [[hoy]]    = await pool.query(
      "SELECT COUNT(*) AS total FROM auditoria_sesiones WHERE accion='login' AND DATE(fecha)=CURDATE()"
    );
    const [[semana]] = await pool.query(
      "SELECT COUNT(*) AS total FROM auditoria_sesiones WHERE accion='login' AND fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
    const [[unicos]] = await pool.query(
      "SELECT COUNT(DISTINCT usuario_id) AS total FROM auditoria_sesiones WHERE accion='login' AND DATE(fecha)=CURDATE()"
    );

    res.json({
      loginsHoy:       hoy.total,
      loginsSemana:    semana.total,
      usuariosUnicosHoy: unicos.total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
}
