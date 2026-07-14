import pool from "../../config/db.renaced.js";

export const getEventos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM evento WHERE paciente_id = ? ORDER BY fecha_captura DESC",
      [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener eventos" });
  }
};

export const createEvento = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body;
    const [result] = await pool.query(
      `INSERT INTO evento (
        paciente_id,
        hipo_leve, hipo_leve_num,
        hipo_severa, hipo_severa_fecha, hipo_severa_causa,
        convulsiones, coma, perd_conocimiento,
        glucagon_disp, glucagon_uso,
        cetoacidosis, cetoacidosis_fecha, cetoacidosis_causa,
        hospitalizacion, hospitalizacion_fecha, hospitalizacion_dias, hospitalizacion_causa,
        usuario_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id,
        f.hipo_leve||null, f.hipo_leve_num||null,
        f.hipo_severa||null, f.hipo_severa_fecha||null, f.hipo_severa_causa||null,
        f.convulsiones||null, f.coma||null, f.perd_conocimiento||null,
        f.glucagon_disp||null, f.glucagon_uso||null,
        f.cetoacidosis||null, f.cetoacidosis_fecha||null, f.cetoacidosis_causa||null,
        f.hospitalizacion||null, f.hospitalizacion_fecha||null, f.hospitalizacion_dias||null, f.hospitalizacion_causa||null,
        req.usuario?.id || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear evento" });
  }
};

export const deleteEvento = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM evento WHERE id = ? AND paciente_id = ?",
      [req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar evento" });
  }
};
