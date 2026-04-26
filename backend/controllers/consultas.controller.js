import pool from "../config/db.js";
import { auditarAccion } from "../utils/helpers.js";

/* ── Listar ─────────────────────────────────────── */
export async function listar(req, res) {
  const { paciente_nombre, paciente_id, fecha_desde, fecha_hasta } = req.query;
  let sql = `
    SELECT b.*, p.nombre AS paciente_nombre, p.dni AS paciente_dni
    FROM consultas b
    JOIN pacientes p ON p.id = b.paciente_id
    WHERE 1=1
  `;
  const params = [];

  if (paciente_nombre) { sql += " AND p.nombre LIKE ?";    params.push(`%${paciente_nombre}%`); }
  if (paciente_id)     { sql += " AND b.paciente_id = ?";  params.push(paciente_id); }
  if (fecha_desde)     { sql += " AND b.fecha >= ?";        params.push(fecha_desde); }
  if (fecha_hasta)     { sql += " AND b.fecha <= ?";        params.push(`${fecha_hasta} 23:59:59`); }

  sql += " ORDER BY b.fecha DESC, b.created_at DESC";

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar bitácora" });
  }
}

/* ── Obtener uno ─────────────────────────────────── */
export async function obtener(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, p.nombre AS paciente_nombre, p.dni AS paciente_dni
       FROM consultas b
       JOIN pacientes p ON p.id = b.paciente_id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Entrada no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener entrada" });
  }
}

/* ── Crear ───────────────────────────────────────── */
export async function crear(req, res) {
  const {
    paciente_id, fecha, tipo_consulta, peso, talla, glucosa_ayunas,
    hba1c, tension_arterial, medicamentos, observaciones, plan_tratamiento, proxima_cita,
    tanner_mama, tanner_genitales, tanner_vello_pubico, tanner_observaciones,
  } = req.body;

  if (!paciente_id || !fecha)
    return res.status(400).json({ error: "Paciente y fecha son obligatorios" });

  try {
    const [result] = await pool.query(
      `INSERT INTO consultas
        (paciente_id, fecha, tipo_consulta, peso, talla, glucosa_ayunas,
         hba1c, tension_arterial, medicamentos, observaciones, plan_tratamiento, proxima_cita,
         tanner_mama, tanner_genitales, tanner_vello_pubico, tanner_observaciones, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id, fecha, tipo_consulta || "Presencial",
        peso || null, talla || null, glucosa_ayunas || null,
        hba1c || null, tension_arterial || null, medicamentos || null,
        observaciones || null, plan_tratamiento || null, proxima_cita || null,
        tanner_mama || null, tanner_genitales || null, tanner_vello_pubico || null,
        tanner_observaciones || null,
        req.usuario?.id || null,
      ]
    );    auditarAccion(pool, req, { accion: "crear_bitacora", entidad: "bitacora", entidad_id: result.insertId, descripcion: `Nueva entrada bitácora paciente ID ${paciente_id}` });    res.status(201).json({ id: result.insertId, mensaje: "Entrada registrada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear entrada" });
  }
}

/* ── Actualizar ──────────────────────────────────── */
export async function actualizar(req, res) {
  const {
    fecha, tipo_consulta, peso, talla, glucosa_ayunas, hba1c,
    tension_arterial, medicamentos, observaciones, plan_tratamiento, proxima_cita,
    tanner_mama, tanner_genitales, tanner_vello_pubico, tanner_observaciones,
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE consultas SET
        fecha = ?, tipo_consulta = ?, peso = ?, talla = ?, glucosa_ayunas = ?,
        hba1c = ?, tension_arterial = ?, medicamentos = ?, observaciones = ?,
        plan_tratamiento = ?, proxima_cita = ?,
        tanner_mama = ?, tanner_genitales = ?, tanner_vello_pubico = ?, tanner_observaciones = ?
       WHERE id = ?`,
      [
        fecha, tipo_consulta || "Presencial",
        peso || null, talla || null, glucosa_ayunas || null,
        hba1c || null, tension_arterial || null, medicamentos || null,
        observaciones || null, plan_tratamiento || null, proxima_cita || null,
        tanner_mama || null, tanner_genitales || null, tanner_vello_pubico || null,
        tanner_observaciones || null,
        req.params.id,
      ]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Entrada no encontrada" });    auditarAccion(pool, req, { accion: "editar_bitacora", entidad: "bitacora", entidad_id: Number(req.params.id), descripcion: `Editó entrada bitácora ID ${req.params.id}` });    res.json({ mensaje: "Entrada actualizada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar entrada" });
  }
}

/* ── Eliminar ────────────────────────────────────── */
export async function eliminar(req, res) {
  try {
    const [result] = await pool.query("DELETE FROM consultas WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Entrada no encontrada" });
    auditarAccion(pool, req, { accion: "eliminar_bitacora", entidad: "bitacora", entidad_id: Number(req.params.id), descripcion: `Eliminó entrada bitácora ID ${req.params.id}` });
    res.json({ mensaje: "Entrada eliminada" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar entrada" });
  }
}
