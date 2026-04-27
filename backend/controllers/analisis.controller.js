import pool from "../config/db.js";
import { clasificarISPAD } from "../utils/helpers.js";

export async function listar(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, p.nombre AS paciente_nombre, p.sexo, p.departamento, p.edad
       FROM analisis a
       JOIN pacientes p ON p.id = a.paciente_id
       ORDER BY a.fecha DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al listar análisis" });
  }
}

export async function obtener(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, p.nombre AS paciente_nombre, p.sexo, p.departamento, p.edad, p.tipo_diabetes
       FROM analisis a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Análisis no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener análisis" });
  }
}

export async function crear(req, res) {
  const {
    paciente_id, fecha, fecha_colocacion, tir, tar, tar_muy_alto, tar_alto,
    tbr, tbr_bajo, tbr_muy_bajo, gmi, cv, tiempo_activo, glucosa_promedio, gri,
    eventos_hipoglucemia, duracion_hipoglucemia, archivo_pdf,
    dosis_insulina_post, se_modifico_dosis, dosis_modificada, hba1c_post_mcg,
    limitacion_internet, limitacion_alergias, limitacion_economica,
    calidad_vida, comentarios,
  } = req.body;

  if (!paciente_id || !fecha)
    return res.status(400).json({ error: "Paciente y fecha son obligatorios" });

  const clasificacion = clasificarISPAD(
    parseFloat(tir) || 0,
    parseFloat(tar) || 0,
    parseFloat(tbr) || 0,
    gmi ? parseFloat(gmi) : null
  );

  try {
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM analisis WHERE paciente_id = ?",
      [paciente_id]
    );
    const numero_registro = total + 1;

    const [result] = await pool.query(
      `INSERT INTO analisis
        (paciente_id, numero_registro, fecha, fecha_colocacion, tir, tar, tar_muy_alto, tar_alto,
         tbr, tbr_bajo, tbr_muy_bajo, gmi, cv, tiempo_activo, glucosa_promedio, gri,
         eventos_hipoglucemia, duracion_hipoglucemia, clasificacion, archivo_pdf,
         dosis_insulina_post, se_modifico_dosis, dosis_modificada, hba1c_post_mcg,
         limitacion_internet, limitacion_alergias, limitacion_economica,
         calidad_vida, comentarios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id, numero_registro, fecha, fecha_colocacion || null,
        tir, tar, tar_muy_alto || null, tar_alto || null,
        tbr, tbr_bajo || null, tbr_muy_bajo || null,
        gmi, cv, tiempo_activo, glucosa_promedio, gri,
        eventos_hipoglucemia, duracion_hipoglucemia, clasificacion, archivo_pdf,
        dosis_insulina_post || null, se_modifico_dosis ?? null, dosis_modificada || null,
        hba1c_post_mcg || null, limitacion_internet ? 1 : 0, limitacion_alergias ? 1 : 0,
        limitacion_economica ? 1 : 0, calidad_vida || null, comentarios || null,
      ]
    );

    // Guardar en historial_resumen
    await pool.query(
      "INSERT INTO historial_resumen (paciente_id, fecha, tir, gmi, cv) VALUES (?, ?, ?, ?, ?)",
      [paciente_id, fecha, tir, gmi, cv]
    );

    res.status(201).json({ id: result.insertId, clasificacion, mensaje: "Análisis guardado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar análisis" });
  }
}

export async function actualizar(req, res) {
  const {
    numero_registro,
    fecha, fecha_colocacion, tir, tar, tar_muy_alto, tar_alto,
    tbr, tbr_bajo, tbr_muy_bajo, gmi, cv, tiempo_activo,
    glucosa_promedio, gri, eventos_hipoglucemia, duracion_hipoglucemia,
    dosis_insulina_post, se_modifico_dosis, dosis_modificada, hba1c_post_mcg,
    limitacion_internet, limitacion_alergias, limitacion_economica,
    calidad_vida, comentarios,
  } = req.body;

  const clasificacion = clasificarISPAD(
    parseFloat(tir) || 0,
    parseFloat(tar) || 0,
    parseFloat(tbr) || 0,
    gmi ? parseFloat(gmi) : null
  );

  try {
    await pool.query(
      `UPDATE analisis SET
        numero_registro=?,
        fecha=?, fecha_colocacion=?, tir=?, tar=?, tar_muy_alto=?, tar_alto=?,
        tbr=?, tbr_bajo=?, tbr_muy_bajo=?, gmi=?, cv=?, tiempo_activo=?,
        glucosa_promedio=?, gri=?, eventos_hipoglucemia=?, duracion_hipoglucemia=?,
        clasificacion=?, dosis_insulina_post=?, se_modifico_dosis=?, dosis_modificada=?,
        hba1c_post_mcg=?, limitacion_internet=?, limitacion_alergias=?,
        limitacion_economica=?, calidad_vida=?, comentarios=?
       WHERE id=?`,
      [
        numero_registro || null,
        fecha, fecha_colocacion || null,
        tir, tar, tar_muy_alto || null, tar_alto || null,
        tbr, tbr_bajo || null, tbr_muy_bajo || null,
        gmi, cv, tiempo_activo, glucosa_promedio, gri,
        eventos_hipoglucemia, duracion_hipoglucemia, clasificacion,
        dosis_insulina_post || null, se_modifico_dosis ?? null, dosis_modificada || null,
        hba1c_post_mcg || null, limitacion_internet ? 1 : 0, limitacion_alergias ? 1 : 0,
        limitacion_economica ? 1 : 0, calidad_vida || null, comentarios || null,
        req.params.id,
      ]
    );
    res.json({ clasificacion, mensaje: "Análisis actualizado" });
  } catch (err) {
    console.error("Error al actualizar análisis:", err);
    res.status(500).json({ error: "Error al actualizar análisis", detalle: err.message });
  }
}

export async function eliminar(req, res) {
  try {
    await pool.query("DELETE FROM analisis WHERE id = ?", [req.params.id]);
    res.json({ mensaje: "Análisis eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar análisis" });
  }
}
