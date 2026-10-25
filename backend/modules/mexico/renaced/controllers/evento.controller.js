// Eventos agudos (hipoglucemia, cetoacidosis, hospitalización, uso de glucagón…).
// Tabla evento: tipo, fecha, descripcion, gravedad, requirio_hospitalizacion (+ consulta_id opcional).

export const TIPOS_EVENTO = [
  "HIPOGLUCEMIA_LEVE", "HIPOGLUCEMIA_NIVEL1", "HIPOGLUCEMIA_NIVEL2", "HIPOGLUCEMIA_SEVERA",
  "HIPOGLUCEMIA_INADVERTIDA", "CETOACIDOSIS", "HOSPITALIZACION", "USO_GLUCAGON",
];

// Misma convención que la importación del sistema anterior
export const GRAVEDAD_POR_TIPO = {
  HIPOGLUCEMIA_LEVE: "LEVE", HIPOGLUCEMIA_NIVEL1: "NIVEL 1",
  HIPOGLUCEMIA_NIVEL2: "NIVEL 2", HIPOGLUCEMIA_INADVERTIDA: "INADVERTIDA",
};

export const getEventos = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM evento WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
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
    if (!f.tipo || !f.fecha) return res.status(400).json({ error: "Tipo y fecha del evento son obligatorios" });
    const [result] = await req.db.query(
      `INSERT INTO evento (paciente_id, tipo, fecha, descripcion, gravedad, requirio_hospitalizacion, usuario_id)
       VALUES (?,?,?,?,?,?,?)`,
      [paciente_id, f.tipo, f.fecha, f.descripcion || null, GRAVEDAD_POR_TIPO[f.tipo] || null,
        f.requirio_hospitalizacion ? 1 : 0, req.usuario?.id || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear evento" });
  }
};

export const deleteEvento = async (req, res) => {
  try {
    await req.db.query(
      "DELETE FROM evento WHERE id = ? AND paciente_id = ?",
      [req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar evento" });
  }
};
