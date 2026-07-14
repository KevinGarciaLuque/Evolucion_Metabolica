import pool from "../../config/db.renaced.js";

export const getPatologia = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM patologia WHERE paciente_id = ? ORDER BY nombre",
      [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener patologías" });
  }
};

export const savePatologia = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const { enfermedades } = req.body;
    // enfermedades = [{ nombre, fecha_dx, activa, observaciones }, ...]
    await pool.query("DELETE FROM patologia WHERE paciente_id = ?", [paciente_id]);
    if (enfermedades?.length) {
      for (const e of enfermedades) {
        await pool.query(
          "INSERT INTO patologia (paciente_id, nombre, fecha_dx, activa, observaciones, usuario_id) VALUES (?,?,?,?,?,?)",
          [paciente_id, e.nombre, e.fecha_dx || null, e.activa ?? 1, e.observaciones || null, req.usuario?.id || null]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar patologías" });
  }
};
