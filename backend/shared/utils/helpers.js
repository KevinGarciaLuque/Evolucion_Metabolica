/**
 * Clasifica al paciente según los criterios ISPAD de tiempo en rango (TIR/TAR/TBR).
 * @param {number} tir  Tiempo en rango (%)
 * @param {number} tar  Tiempo arriba del rango (%)
 * @param {number} tbr  Tiempo abajo del rango (%)
 * @param {number|null} gmi GMI (%)
 * @returns {'OPTIMO'|'MODERADO'|'ALTO_RIESGO'}
 */
export function clasificarISPAD(tir, tar, tbr, gmi = null) {
  if (
    tir >= 70 &&
    tar <= 25 &&
    tbr <= 4 &&
    (gmi === null || gmi <= 7)
  ) {
    return "OPTIMO";
  }
  if (tir >= 50 && tar <= 35 && tbr <= 8) {
    return "MODERADO";
  }
  return "ALTO_RIESGO";
}

/**
 * Calcula edad en años a partir de fecha de nacimiento.
 * @param {string|Date} fechaNacimiento
 * @returns {number}
 */
export function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

/**
 * Agrupa una lista de pacientes en rangos etarios clínicos útiles.
 * @param {number} edad
 * @returns {string}
 */
export function grupoEtario(edad) {
  if (edad <= 5)  return "0-5 años";
  if (edad <= 9)  return "6-9 años";
  if (edad <= 12) return "10-12 años";
  if (edad <= 17) return "13-17 años";
  return "18+ años";
}

/**
 * Registra una acción de auditoría de forma asíncrona (no bloquea la respuesta).
 *
 * @param {object} pool        - Conexión de mysql2/promise
 * @param {object} req         - Request de Express (para extraer usuario, IP, UA)
 * @param {object} opts
 * @param {string} opts.accion        - Código de acción: 'crear_paciente', 'editar_bitacora', etc.
 * @param {string} opts.entidad       - Entidad afectada: 'paciente', 'bitacora', 'usuario', 'pdf'
 * @param {number} [opts.entidad_id]  - ID del registro afectado
 * @param {string} [opts.descripcion] - Texto descriptivo breve
 */
export function auditarAccion(pool, req, { accion, entidad, entidad_id = null, descripcion = null }) {
  const u   = req.usuario;
  if (!u) return;
  const ip  = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || null;
  const ua  = req.headers["user-agent"] || null;
  pool.query(
    `INSERT INTO auditoria_sesiones
       (usuario_id, usuario_nombre, usuario_email, usuario_rol, accion, entidad, entidad_id, descripcion, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [u.id, u.nombre, u.email, u.rol, accion, entidad, entidad_id, descripcion, ip, ua]
  ).catch((e) => console.error("Auditoría error:", e));
}
