import pool from "../config/db.js";

// ══════════════════════════════════════════════════════════
//  HISTORIAL DE INSULINA
// ══════════════════════════════════════════════════════════

export async function listarInsulina(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM historial_insulina WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener historial de insulina" });
  }
}

export async function crearInsulina(req, res) {
  const {
    fecha, insulina_prolongada, insulina_corta,
    dosis_prolongada, dosis_corta, dosis_prolongada_u, dosis_corta_u,
    via_administracion, motivo_cambio, observaciones,
  } = req.body;

  if (!fecha) return res.status(400).json({ error: "La fecha es obligatoria" });

  try {
    const [result] = await pool.query(
      `INSERT INTO historial_insulina
        (paciente_id, fecha, insulina_prolongada, insulina_corta,
         dosis_prolongada, dosis_corta, dosis_prolongada_u, dosis_corta_u,
         via_administracion, motivo_cambio, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        fecha,
        insulina_prolongada || null,
        insulina_corta      || null,
        dosis_prolongada    || null,
        dosis_corta         || null,
        dosis_prolongada_u  ? Number(dosis_prolongada_u) : null,
        dosis_corta_u       ? Number(dosis_corta_u)      : null,
        via_administracion  || "Subcutánea",
        motivo_cambio       || null,
        observaciones       || null,
      ]
    );
    res.status(201).json({ id: result.insertId, mensaje: "Registro de insulina creado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear registro de insulina" });
  }
}

export async function actualizarInsulina(req, res) {
  const {
    fecha, insulina_prolongada, insulina_corta,
    dosis_prolongada, dosis_corta, dosis_prolongada_u, dosis_corta_u,
    via_administracion, motivo_cambio, observaciones,
  } = req.body;

  try {
    await pool.query(
      `UPDATE historial_insulina
       SET fecha=?, insulina_prolongada=?, insulina_corta=?,
           dosis_prolongada=?, dosis_corta=?, dosis_prolongada_u=?, dosis_corta_u=?,
           via_administracion=?, motivo_cambio=?, observaciones=?
       WHERE id=? AND paciente_id=?`,
      [
        fecha,
        insulina_prolongada || null,
        insulina_corta      || null,
        dosis_prolongada    || null,
        dosis_corta         || null,
        dosis_prolongada_u  ? Number(dosis_prolongada_u) : null,
        dosis_corta_u       ? Number(dosis_corta_u)      : null,
        via_administracion  || "Subcutánea",
        motivo_cambio       || null,
        observaciones       || null,
        req.params.regId,
        req.params.id,
      ]
    );
    res.json({ mensaje: "Registro de insulina actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar registro de insulina" });
  }
}

export async function eliminarInsulina(req, res) {
  try {
    await pool.query(
      "DELETE FROM historial_insulina WHERE id=? AND paciente_id=?",
      [req.params.regId, req.params.id]
    );
    res.json({ mensaje: "Registro de insulina eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar registro de insulina" });
  }
}

// ══════════════════════════════════════════════════════════
//  PLANES DE ALIMENTACIÓN
// ══════════════════════════════════════════════════════════

export async function listarAlimentacion(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM planes_alimentacion WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener planes de alimentación" });
  }
}

export async function crearAlimentacion(req, res) {
  const {
    fecha, tipo_dieta, calorias_dia,
    carbohidratos_g, proteinas_g, grasas_g, fibra_g,
    distribucion, restricciones, observaciones, elaborado_por,
  } = req.body;

  if (!fecha) return res.status(400).json({ error: "La fecha es obligatoria" });

  try {
    const [result] = await pool.query(
      `INSERT INTO planes_alimentacion
        (paciente_id, fecha, tipo_dieta, calorias_dia,
         carbohidratos_g, proteinas_g, grasas_g, fibra_g,
         distribucion, restricciones, observaciones, elaborado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        fecha,
        tipo_dieta     || null,
        calorias_dia   ? Number(calorias_dia)   : null,
        carbohidratos_g ? Number(carbohidratos_g) : null,
        proteinas_g    ? Number(proteinas_g)    : null,
        grasas_g       ? Number(grasas_g)       : null,
        fibra_g        ? Number(fibra_g)        : null,
        distribucion   || null,
        restricciones  || null,
        observaciones  || null,
        elaborado_por  || null,
      ]
    );
    res.status(201).json({ id: result.insertId, mensaje: "Plan de alimentación creado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear plan de alimentación" });
  }
}

export async function actualizarAlimentacion(req, res) {
  const {
    fecha, tipo_dieta, calorias_dia,
    carbohidratos_g, proteinas_g, grasas_g, fibra_g,
    distribucion, restricciones, observaciones, elaborado_por,
  } = req.body;

  try {
    await pool.query(
      `UPDATE planes_alimentacion
       SET fecha=?, tipo_dieta=?, calorias_dia=?,
           carbohidratos_g=?, proteinas_g=?, grasas_g=?, fibra_g=?,
           distribucion=?, restricciones=?, observaciones=?, elaborado_por=?
       WHERE id=? AND paciente_id=?`,
      [
        fecha,
        tipo_dieta     || null,
        calorias_dia   ? Number(calorias_dia)   : null,
        carbohidratos_g ? Number(carbohidratos_g) : null,
        proteinas_g    ? Number(proteinas_g)    : null,
        grasas_g       ? Number(grasas_g)       : null,
        fibra_g        ? Number(fibra_g)        : null,
        distribucion   || null,
        restricciones  || null,
        observaciones  || null,
        elaborado_por  || null,
        req.params.regId,
        req.params.id,
      ]
    );
    res.json({ mensaje: "Plan de alimentación actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar plan de alimentación" });
  }
}

export async function eliminarAlimentacion(req, res) {
  try {
    await pool.query(
      "DELETE FROM planes_alimentacion WHERE id=? AND paciente_id=?",
      [req.params.regId, req.params.id]
    );
    res.json({ mensaje: "Plan de alimentación eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar plan de alimentación" });
  }
}

// ══════════════════════════════════════════════════════════
//  HISTORIAL DE ANTICUERPOS
// ══════════════════════════════════════════════════════════

export async function listarAnticuerpos(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM historial_anticuerpos WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener historial de anticuerpos" });
  }
}

export async function crearAnticuerpos(req, res) {
  const { fecha, iaa, anti_gad65, anti_ia2, znt8, ica, observaciones, elaborado_por } = req.body;
  if (!fecha) return res.status(400).json({ error: "La fecha es obligatoria" });
  try {
    const [result] = await pool.query(
      `INSERT INTO historial_anticuerpos
        (paciente_id, fecha, iaa, anti_gad65, anti_ia2, znt8, ica, observaciones, elaborado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id, fecha,
        iaa           || null,
        anti_gad65    || null,
        anti_ia2      || null,
        znt8          || null,
        ica           || null,
        observaciones || null,
        elaborado_por || null,
      ]
    );
    res.status(201).json({ id: result.insertId, mensaje: "Registro de anticuerpos creado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear registro de anticuerpos" });
  }
}

export async function actualizarAnticuerpos(req, res) {
  const { fecha, iaa, anti_gad65, anti_ia2, znt8, ica, observaciones, elaborado_por } = req.body;
  try {
    await pool.query(
      `UPDATE historial_anticuerpos
       SET fecha=?, iaa=?, anti_gad65=?, anti_ia2=?, znt8=?, ica=?, observaciones=?, elaborado_por=?
       WHERE id=? AND paciente_id=?`,
      [
        fecha,
        iaa           || null,
        anti_gad65    || null,
        anti_ia2      || null,
        znt8          || null,
        ica           || null,
        observaciones || null,
        elaborado_por || null,
        req.params.regId,
        req.params.id,
      ]
    );
    res.json({ mensaje: "Registro de anticuerpos actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar registro de anticuerpos" });
  }
}

export async function eliminarAnticuerpos(req, res) {
  try {
    await pool.query(
      "DELETE FROM historial_anticuerpos WHERE id=? AND paciente_id=?",
      [req.params.regId, req.params.id]
    );
    res.json({ mensaje: "Registro de anticuerpos eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar registro de anticuerpos" });
  }
}

// ════════════════════════════════════════════════════════
//  RELACIÓN INSULINA:CARBOHIDRATOS (ICR)
// ════════════════════════════════════════════════════════

/**
 * Devuelve la evolución de la relación Insulina:Carbohidratos (ICR).
 * Por cada registro de insulina que tenga dosis_corta_u, busca el plan de
 * alimentación más cercano en fecha (±15 días) y calcula:
 *   icr = carbohidratos_g / dosis_corta_u  (g de CHO por unidad de insulina)
 */
export async function relacionIC(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
         i.id,
         i.fecha,
         i.insulina_corta,
         i.dosis_corta_u,
         i.dosis_prolongada_u,
         i.motivo_cambio,
         a.carbohidratos_g,
         a.calorias_dia,
         a.tipo_dieta,
         CASE
           WHEN i.dosis_corta_u > 0 AND a.carbohidratos_g > 0
           THEN ROUND(a.carbohidratos_g / i.dosis_corta_u, 1)
           ELSE NULL
         END AS icr
       FROM historial_insulina i
       LEFT JOIN planes_alimentacion a
         ON a.paciente_id = i.paciente_id
         AND ABS(DATEDIFF(a.fecha, i.fecha)) = (
           SELECT MIN(ABS(DATEDIFF(a2.fecha, i.fecha)))
           FROM planes_alimentacion a2
           WHERE a2.paciente_id = i.paciente_id
             AND ABS(DATEDIFF(a2.fecha, i.fecha)) <= 30
         )
       WHERE i.paciente_id = ?
       ORDER BY i.fecha ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al calcular relación IC" });
  }
}
