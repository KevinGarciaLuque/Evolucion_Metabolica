// Embarazos. Tabla: num_gesta, fecha_ultima_mens, fecha_probable_parto, semanas_gestacion,
// terapia_gest_id, activo, resultado (EMBARAZADA | NACIMIENTO | ABORTO), fecha_parto, observaciones.

const COLS = [
  "num_gesta", "fecha_ultima_mens", "fecha_probable_parto", "semanas_gestacion",
  "terapia_gest_id", "resultado", "fecha_parto", "observaciones",
];
const v = (x) => (x === "" || x === undefined ? null : x);

export const getEmbarazos = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      `SELECT e.*, t.descripcion AS terapia_gest
       FROM embarazo e LEFT JOIN cat_terapia_gest t ON t.id = e.terapia_gest_id
       WHERE e.paciente_id = ? ORDER BY e.fecha_ultima_mens DESC, e.id DESC`,
      [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener embarazos" });
  }
};

export const createEmbarazo = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body;
    const cols = ["paciente_id", ...COLS, "activo", "usuario_id"];
    const [result] = await req.db.query(
      `INSERT INTO embarazo (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
      [paciente_id, ...COLS.map((c) => v(f[c])), f.resultado === "EMBARAZADA" ? 1 : (f.activo ?? 1), req.usuario?.id || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar el embarazo" });
  }
};

export const updateEmbarazo = async (req, res) => {
  try {
    const f = req.body;
    await req.db.query(
      `UPDATE embarazo SET ${COLS.map((c) => `${c}=?`).join(",")} WHERE id = ? AND paciente_id = ?`,
      [...COLS.map((c) => v(f[c])), req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el embarazo" });
  }
};

export const deleteEmbarazo = async (req, res) => {
  try {
    await req.db.query("DELETE FROM embarazo WHERE id = ? AND paciente_id = ?", [req.params.id, req.params.paciente_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el embarazo" });
  }
};
