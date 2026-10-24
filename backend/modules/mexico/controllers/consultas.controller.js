
export const getConsultasByPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const [rows] = await req.db.query(
      `SELECT c.*, m.nombre AS medico_nombre, m.ap_pat AS medico_ap_pat
       FROM consulta c
       LEFT JOIN medico m ON m.curp = c.medico_curp
       WHERE c.paciente_id = ?
       ORDER BY c.fecha_consulta DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener consultas" });
  }
};

export const createConsulta = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const {
      medico_curp, fecha_consulta, peso, estatura, imc,
      percentil, cintura, cadera, indice_cc, pa_sistolica, pa_diastolica
    } = req.body;

    const imcCalc = imc || (peso && estatura ? (peso / (estatura * estatura)).toFixed(2) : null);

    const [result] = await req.db.query(
      `INSERT INTO consulta (
        paciente_id, medico_curp, fecha_consulta, peso, estatura, imc,
        percentil, cintura, cadera, indice_cc, pa_sistolica, pa_diastolica, usuario_id
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id, medico_curp, fecha_consulta,
        peso || null, estatura || null, imcCalc || null,
        percentil || null, cintura || null, cadera || null, indice_cc || null,
        pa_sistolica || null, pa_diastolica || null,
        req.usuario?.id || null
      ]
    );
    res.status(201).json({ id: result.insertId, message: "Consulta registrada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar consulta" });
  }
};
