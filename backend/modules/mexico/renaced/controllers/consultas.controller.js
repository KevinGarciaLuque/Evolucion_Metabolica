import { armarHistorial } from "../services/historialConsultas.js";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";
import { guardarHojaConsulta } from "../services/hojaConsulta.js";

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

// Guarda la consulta completa (visita + secciones con datos) en una sola transacción.
export const createHojaConsulta = async (req, res) => {
  const { paciente_id } = req.params;
  let conn;
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const medico = await medicoDelUsuario(req.db, req.usuario?.id);
    conn = await req.db.getConnection();
    await conn.beginTransaction();
    const r = await guardarHojaConsulta(conn, {
      pacienteId: paciente_id,
      usuarioId: req.usuario?.id || null,
      medicoCurp: req.body?.medico_curp || medico?.curp || "",
      datos: req.body,
    });
    await conn.commit();
    res.status(201).json({ ...r, message: "Consulta registrada" });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Error al registrar la consulta" });
  } finally {
    if (conn) conn.release();
  }
};

// Historial: una visita por fecha con visita, laboratorio, tratamiento, complicaciones y educación.
export const getHistorialConsultas = async (req, res) => {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    res.json(await armarHistorial(req.db, req.params.paciente_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el historial de consultas" });
  }
};

// Médico vinculado al usuario que está capturando (usuario.recurso_humano_curp → medico).
async function medicoDelUsuario(db, usuarioId) {
  if (!usuarioId) return null;
  const [[m]] = await db.query(
    `SELECT m.curp, CONCAT_WS(' ', m.nombre, m.ap_pat, m.ap_mat) AS nombre
     FROM usuario u JOIN medico m ON m.curp = u.recurso_humano_curp WHERE u.id = ?`,
    [usuarioId]
  );
  return m || null;
}

// Para mostrar en la hoja quién quedará registrado como médico de la consulta.
export const getMedicoActual = async (req, res) => {
  try {
    res.json(await medicoDelUsuario(req.db, req.usuario?.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el médico" });
  }
};
