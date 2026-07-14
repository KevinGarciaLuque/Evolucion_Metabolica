import pool from "../../config/db.renaced.js";

export const getToxicomanias = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM toxicomanias WHERE paciente_id = ? ORDER BY fecha_captura DESC",
      [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener toxicomanías" });
  }
};

export const createToxicomanias = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body;
    const [result] = await pool.query(
      `INSERT INTO toxicomanias (paciente_id, tabaco, alcohol, drogas, observaciones, usuario_id)
       VALUES (?,?,?,?,?,?)`,
      [
        paciente_id,
        f.tabaco        || "NO",
        f.alcohol       || "NO",
        f.drogas        || "NO",
        f.observaciones || null,
        req.usuario?.id || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear toxicomanías" });
  }
};

export const deleteToxicomanias = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM toxicomanias WHERE id = ? AND paciente_id = ?",
      [req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};
