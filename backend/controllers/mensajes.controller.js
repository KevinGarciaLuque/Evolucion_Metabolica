import pool from "../config/db.js";
import { enviarWhatsApp } from "../services/twilio.js";
import { auditarAccion } from "../utils/helpers.js";

/**
 * GET /api/mensajes
 * Lista el historial de mensajes enviados.
 */
export async function listar(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || "1",  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM mensajes_whatsapp"
    );

    const [rows] = await pool.query(
      `SELECT id, paciente_id, paciente_nombre, telefono, mensaje,
              estado, error_detalle, enviado_por_nombre, fecha
       FROM mensajes_whatsapp
       ORDER BY fecha DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({ total, page, limit, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar mensajes" });
  }
}

function generarMensajeClasificacion(paciente, clasificacion) {
  const trato = paciente.sexo === "F" ? "Estimada" : "Estimado";
  const hospital =
    paciente.institucion === "HMEP"
      ? "Hospital María de Especialidades Pediátricas"
      : paciente.institucion === "IHSS"
        ? "Instituto Hondureño de Seguridad Social"
        : paciente.institucion || "la institución";

  if (clasificacion === "ALTO_RIESGO") {
    return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Hemos detectado alteraciones en las métricas de tu monitor, vemos alertas con niveles altos en la glucosa, por favor revisa:\n1.- Tu Plan de alimentación\n2.- Cumplimiento de Ejercicio\n3.- Revisa tu dosis de insulina que sean las adecuadas\nSi persiste, por favor comuníquese con su médico tratante para coordinar su próxima cita. Gracias.`;
  } else if (clasificacion === "MODERADO") {
    return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Hemos detectado que las métricas de tu monitor se encuentran en un nivel MODERADO. Te recomendamos revisar:\n1.- Tu Plan de alimentación\n2.- Cumplimiento de Ejercicio\n3.- Tu dosis de insulina\nPor favor comuníquese con su médico tratante para seguimiento. Gracias.`;
  } else {
    return `${trato} ${paciente.nombre}, le contactamos de la consulta de diabetes de Endocrinología de (${hospital}). Sus métricas de monitoreo continuo de glucosa muestran un control ÓPTIMO. ¡Felicitaciones, siga con su excelente manejo! Recuerde mantener sus citas de seguimiento. Gracias.`;
  }
}

/**
 * POST /api/mensajes/enviar-alto-riesgo
 * Envía mensajes personalizados de WhatsApp a todos los pacientes con la clasificación
 * indicada que tengan teléfono registrado.
 */
export async function enviarAltoRiesgo(req, res) {
  const clasificacion = ["OPTIMO", "MODERADO", "ALTO_RIESGO"].includes(req.body.clasificacion)
    ? req.body.clasificacion
    : "ALTO_RIESGO";

  try {
    const [pacientes] = await pool.query(`
      SELECT p.id, p.nombre, p.sexo, p.institucion,
             COALESCE(NULLIF(p.telefono,''), NULLIF(p.telefono_tutor,'')) AS telefono
      FROM pacientes p
      INNER JOIN (
        SELECT a.paciente_id, a.clasificacion
        FROM analisis a
        INNER JOIN (
          SELECT paciente_id, MAX(fecha) AS ultima_fecha
          FROM analisis
          GROUP BY paciente_id
        ) ult ON ult.paciente_id = a.paciente_id AND ult.ultima_fecha = a.fecha
      ) ult_analisis ON ult_analisis.paciente_id = p.id
      WHERE ult_analisis.clasificacion = ?
        AND p.estado = 1
        AND COALESCE(NULLIF(p.telefono,''), NULLIF(p.telefono_tutor,'')) IS NOT NULL
    `, [clasificacion]);

    if (pacientes.length === 0) {
      return res.json({ enviados: 0, errores: 0, total: 0, mensaje: `No hay pacientes en ${clasificacion} con teléfono registrado.` });
    }

    const u = req.usuario;
    let enviados = 0;
    let errores  = 0;

    for (const p of pacientes) {
      // Si viene mensaje personalizado del frontend, se reemplaza {nombre}; si no, se genera automáticamente
      const base = req.body.mensaje?.trim();
      const mensajeTexto = base
        ? base.replace(/\{nombre\}/gi, p.nombre)
        : generarMensajeClasificacion(p, clasificacion);
      let estado = "enviado";
      let errorDetalle = null;

      try {
        await enviarWhatsApp(p.telefono, mensajeTexto);
        enviados++;
      } catch (err) {
        estado = "error";
        errorDetalle = err.message;
        errores++;
      }

      await pool.query(
        `INSERT INTO mensajes_whatsapp
           (paciente_id, paciente_nombre, telefono, mensaje, estado, error_detalle, enviado_por_id, enviado_por_nombre)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.nombre, p.telefono, mensajeTexto, estado, errorDetalle, u?.id || null, u?.nombre || null]
      );
    }

    auditarAccion(pool, req, {
      accion: "envio_masivo_whatsapp",
      entidad: "mensaje",
      descripcion: `Envío masivo a pacientes ${clasificacion}: ${enviados} enviados, ${errores} errores`,
    });

    res.json({ enviados, errores, total: pacientes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al enviar mensajes" });
  }
}

/**
 * POST /api/mensajes/enviar/:paciente_id
 * Envía un mensaje individual a un paciente específico.
 */
export async function enviarIndividual(req, res) {
  const { paciente_id } = req.params;
  const { mensaje } = req.body;

  if (!mensaje?.trim()) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, nombre,
              COALESCE(NULLIF(telefono,''), NULLIF(telefono_tutor,'')) AS telefono
       FROM pacientes WHERE id = ? AND estado = 1`,
      [paciente_id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Paciente no encontrado" });

    const p = rows[0];
    if (!p.telefono) return res.status(400).json({ error: "El paciente no tiene teléfono registrado" });

    const u = req.usuario;
    let estado = "enviado";
    let errorDetalle = null;

    try {
      await enviarWhatsApp(p.telefono, mensaje.trim());
    } catch (err) {
      estado = "error";
      errorDetalle = err.message;
    }

    await pool.query(
      `INSERT INTO mensajes_whatsapp
         (paciente_id, paciente_nombre, telefono, mensaje, estado, error_detalle, enviado_por_id, enviado_por_nombre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.nombre, p.telefono, mensaje.trim(), estado, errorDetalle, u?.id || null, u?.nombre || null]
    );

    if (estado === "error") {
      return res.status(502).json({ error: "No se pudo enviar el mensaje", detalle: errorDetalle });
    }

    res.json({ ok: true, paciente: p.nombre, telefono: p.telefono });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
}
