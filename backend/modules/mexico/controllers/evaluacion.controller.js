
export const getEvaluacionesByPaciente = async (req, res) => {
  const { paciente_id } = req.params;
  try {
    const [rows] = await req.db.query(
      `SELECT e.*,
              cr.descripcion  AS retinopatia,
              cn.descripcion  AS nefropatia,
              cne.descripcion AS neuropatia,
              cp.descripcion  AS pie_diabetico,
              cc.descripcion  AS enf_cardiovascular
       FROM evaluacion e
       LEFT JOIN cat_retinopatia                          cr  ON cr.id  = e.retinopatia_id
       LEFT JOIN cat_nefropatia                           cn  ON cn.id  = e.nefropatia_id
       LEFT JOIN cat_neuropatia                           cne ON cne.id = e.neuropatia_id
       LEFT JOIN cat_pie_diabetico                        cp  ON cp.id  = e.pie_diabetico_id
       LEFT JOIN cat_enfermedad_cardiovascular_periferica cc  ON cc.id  = e.enf_cardiovascular_id
       WHERE e.paciente_id = ?
       ORDER BY e.fecha_evaluacion DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener evaluaciones" });
  }
};

// ── Evaluaciones complementarias (oftalmología y revisión de pies) ────────────
const COMP_COLS = [
  "fecha_ojos",
  "ret_sin_d", "ret_sin_i", "ret_no_prolif_d", "ret_no_prolif_i", "ret_prolif_d", "ret_prolif_i",
  "fotocoagulacion_d", "fotocoagulacion_i", "vitrectomia_d", "vitrectomia_i",
  "cataratas_d", "cataratas_i", "glaucoma_d", "glaucoma_i", "macula_d", "macula_i",
  "fecha_pies",
  "deformado_d", "deformado_i", "piel_seca_d", "piel_seca_i", "callosidades_d", "callosidades_i",
  "infeccion_d", "infeccion_i", "fisuras_d", "fisuras_i",
  "ulceracion_aguda_d", "ulceracion_aguda_i", "ulceracion_curada_d", "ulceracion_curada_i",
  "angioplastia_d", "angioplastia_i", "onicomicosis_d", "onicomicosis_i",
  "vibracion_d", "vibracion_i", "monofilamento_d", "monofilamento_i",
  "aquiliano_d", "aquiliano_i", "pedio_d", "pedio_i",
];

export const getEvaluacionesComplementarias = async (req, res) => {
  const { paciente_id } = req.params;
  try {
    const [rows] = await req.db.query(
      `SELECT * FROM evaluacion_complementaria
       WHERE paciente_id = ?
       ORDER BY COALESCE(fecha_ojos, fecha_pies) DESC, id DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener evaluaciones complementarias" });
  }
};

export const createEvaluacionComplementaria = async (req, res) => {
  const { paciente_id } = req.params;
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ m: id }]] = await conn.query("SELECT COALESCE(MAX(id),0)+1 AS m FROM evaluacion_complementaria");
    const cols = ["id", "paciente_id"], ph = ["?", "?"], vals = [id, paciente_id];
    for (const c of COMP_COLS) {
      if (c in req.body) { cols.push(c); ph.push("?"); vals.push(req.body[c] === "" ? null : req.body[c]); }
    }
    cols.push("fecha_captura"); ph.push("NOW()");
    await conn.query(`INSERT INTO evaluacion_complementaria (${cols.join(",")}) VALUES (${ph.join(",")})`, vals);
    await conn.commit();
    res.status(201).json({ id });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al guardar evaluación complementaria" });
  } finally {
    conn.release();
  }
};

export const updateEvaluacionComplementaria = async (req, res) => {
  const { compId } = req.params;
  const sets = [], vals = [];
  for (const c of COMP_COLS) {
    if (c in req.body) { sets.push(`${c}=?`); vals.push(req.body[c] === "" ? null : req.body[c]); }
  }
  if (!sets.length) return res.json({ updated: 0 });
  vals.push(compId);
  try {
    await req.db.query(`UPDATE evaluacion_complementaria SET ${sets.join(",")} WHERE id=?`, vals);
    res.json({ updated: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar evaluación complementaria" });
  }
};

export const deleteEvaluacionComplementaria = async (req, res) => {
  try {
    await req.db.query("DELETE FROM evaluacion_complementaria WHERE id=?", [req.params.compId]);
    res.json({ deleted: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar evaluación complementaria" });
  }
};

export const createEvaluacion = async (req, res) => {
  const { paciente_id } = req.params;
  const {
    fecha_evaluacion, retinopatia_id, nefropatia_id, neuropatia_id,
    neuropatia_autonomica_id, pie_diabetico_id, enf_cardiovascular_id,
    enf_vascular_id, observaciones,
  } = req.body;
  try {
    const [result] = await req.db.query(
      `INSERT INTO evaluacion (paciente_id, fecha_evaluacion, retinopatia_id, nefropatia_id,
        neuropatia_id, neuropatia_autonomica_id, pie_diabetico_id, enf_cardiovascular_id,
        enf_vascular_id, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id, fecha_evaluacion || null,
        retinopatia_id || null, nefropatia_id || null,
        neuropatia_id || null, neuropatia_autonomica_id || null,
        pie_diabetico_id || null, enf_cardiovascular_id || null,
        enf_vascular_id || null, observaciones || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar evaluación" });
  }
};
