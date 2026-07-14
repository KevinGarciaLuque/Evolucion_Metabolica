import pool from "../../config/db.renaced.js";

export const getEducacionByPaciente = async (req, res) => {
  const { paciente_id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM educacion WHERE paciente_id = ? ORDER BY fecha DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener educación" });
  }
};

export const createEducacion = async (req, res) => {
  const { paciente_id } = req.params;
  const { fecha, tema, modalidad, duracion_min, educador, observaciones } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO educacion (paciente_id, fecha, tema, modalidad, duracion_min, educador, observaciones)
       VALUES (?,?,?,?,?,?,?)`,
      [
        paciente_id,
        fecha         || null,
        tema          || "",
        modalidad     || null,
        duracion_min  || null,
        educador      || null,
        observaciones || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar sesión de educación" });
  }
};
