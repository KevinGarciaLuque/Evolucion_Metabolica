import pool from "../../config/db.renaced.js";

export const getLaboratoriosByPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const [rows] = await pool.query(
      `SELECT * FROM laboratorio WHERE paciente_id = ? ORDER BY fecha_muestra DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener laboratorios" });
  }
};

export const createLaboratorio = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const {
      consulta_id, fecha_muestra, hba1c, glucosa_ayuno, glucosa_postprandial,
      colesterol_total, hdl, ldl, trigliceridos, creatinina,
      tasa_filtracion, microalbuminuria, tsh, c_peptido,
      anti_gad, anti_ia2, insulinemia, observaciones
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO laboratorio (
        paciente_id, consulta_id, fecha_muestra, hba1c, glucosa_ayuno,
        glucosa_postprandial, colesterol_total, hdl, ldl, trigliceridos,
        creatinina, tasa_filtracion, microalbuminuria, tsh, c_peptido,
        anti_gad, anti_ia2, insulinemia, observaciones, usuario_id
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id, consulta_id || null, fecha_muestra,
        hba1c || null, glucosa_ayuno || null, glucosa_postprandial || null,
        colesterol_total || null, hdl || null, ldl || null, trigliceridos || null,
        creatinina || null, tasa_filtracion || null, microalbuminuria || null,
        tsh || null, c_peptido || null, anti_gad || null, anti_ia2 || null,
        insulinemia || null, observaciones || null,
        req.usuario?.id || null
      ]
    );
    res.status(201).json({ id: result.insertId, message: "Laboratorio registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar laboratorio" });
  }
};
