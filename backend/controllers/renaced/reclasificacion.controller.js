import pool from "../../config/db.renaced.js";

export const getReclasificaciones = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM reclasificacion WHERE paciente_id = ? ORDER BY fecha_captura DESC",
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
    const [result] = await pool.query(
      `INSERT INTO reclasificacion (
        paciente_id,
        glucosa_ayuno, fecha_glucosa,
        insulina_ayuno, fecha_insulina,
        hba1c, fecha_hba1c,
        ctog_ayuno, ctog_30min, ctog_60min, ctog_90min, ctog_120min,
        ctog_ayuno_insul, ctog_30min_insul, ctog_60min_insul, ctog_90min_insul, ctog_120min_insul,
        fecha_ctog, resultado, usuario_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id,
        f.glucosa_ayuno||null, f.fecha_glucosa||null,
        f.insulina_ayuno||null, f.fecha_insulina||null,
        f.hba1c||null, f.fecha_hba1c||null,
        f.ctog_ayuno||null, f.ctog_30min||null, f.ctog_60min||null, f.ctog_90min||null, f.ctog_120min||null,
        f.ctog_ayuno_insul||null, f.ctog_30min_insul||null, f.ctog_60min_insul||null, f.ctog_90min_insul||null, f.ctog_120min_insul||null,
        f.fecha_ctog||null, f.resultado||"SI",
        req.usuario?.id||null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear reclasificación" });
  }
};

export const deleteReclasificacion = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM reclasificacion WHERE id = ? AND paciente_id = ?",
      [req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar reclasificación" });
  }
};
