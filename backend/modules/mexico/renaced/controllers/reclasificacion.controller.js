// Reclasificación del tipo de diabetes. Tabla: tipo_diabetes_anterior_id, tipo_diabetes_nuevo_id, motivo, fecha.

export const getReclasificaciones = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      `SELECT r.*, ca.descripcion AS tipo_anterior, cn.descripcion AS tipo_nuevo
       FROM reclasificacion r
       LEFT JOIN cat_tipo_diabetes ca ON ca.id = r.tipo_diabetes_anterior_id
       LEFT JOIN cat_tipo_diabetes cn ON cn.id = r.tipo_diabetes_nuevo_id
       WHERE r.paciente_id = ? ORDER BY r.fecha DESC, r.id DESC`,
      [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener reclasificaciones" });
  }
};

export const createReclasificacion = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body;
    if (!f.tipo_diabetes_nuevo_id) return res.status(400).json({ error: "Indica el nuevo tipo de diabetes" });
    const [result] = await req.db.query(
      `INSERT INTO reclasificacion (paciente_id, tipo_diabetes_anterior_id, tipo_diabetes_nuevo_id, motivo, fecha, usuario_id)
       VALUES (?,?,?,?,?,?)`,
      [paciente_id, f.tipo_diabetes_anterior_id || null, f.tipo_diabetes_nuevo_id, f.motivo || null,
        f.fecha || new Date().toISOString().slice(0, 10), req.usuario?.id || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar la reclasificación" });
  }
};

export const deleteReclasificacion = async (req, res) => {
  try {
    await req.db.query("DELETE FROM reclasificacion WHERE id = ? AND paciente_id = ?", [req.params.id, req.params.paciente_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar reclasificación" });
  }
};
