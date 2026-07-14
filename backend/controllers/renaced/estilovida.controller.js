
export const getEstiloVida = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM estilovida WHERE paciente_id = ? ORDER BY fecha_captura DESC",
      [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estilo de vida" });
  }
};

export const createEstiloVida = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body;
    const [result] = await req.db.query(
      `INSERT INTO estilovida (paciente_id, actividad_fisica, tipo_actividad, minutos_semana, dieta_especial, tipo_dieta, tabaquismo, cigarros_dia, alcoholismo, frecuencia_alcohol, usuario_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id,
        f.actividad_fisica || "NO",
        f.tipo_actividad   || null,
        f.minutos_semana   || null,
        f.dieta_especial   || "NO",
        f.tipo_dieta       || null,
        f.tabaquismo       || "NO",
        f.cigarros_dia     || null,
        f.alcoholismo      || "NO",
        f.frecuencia_alcohol || null,
        req.usuario?.id    || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear estilo de vida" });
  }
};

export const deleteEstiloVida = async (req, res) => {
  try {
    await req.db.query(
      "DELETE FROM estilovida WHERE id = ? AND paciente_id = ?",
      [req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};
