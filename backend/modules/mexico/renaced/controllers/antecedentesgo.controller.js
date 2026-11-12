
// Campos que se guardan en antecedentes_go. Los embarazos previos NO van aquí:
// se registran en la sección Embarazo (tabla antecedente_embarazo).
const CAMPOS = [
  "menarca", "fum", "visa", "mac", "peso_4000",
  "menopausia", "menopausia_fecha", "tipo_menopausia", "trh", "observaciones",
];

export const getAntecedentesGO = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM antecedentes_go WHERE paciente_id = ?",
      [req.params.paciente_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener antecedentes G.O." });
  }
};

export const saveAntecedentesGO = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body || {};

    // Solo columnas que realmente existen (la tabla puede variar según la importación)
    const [info] = await req.db.query("SHOW COLUMNS FROM antecedentes_go");
    const existentes = new Set(info.map((c) => c.Field));
    const campos = CAMPOS.filter((c) => existentes.has(c));

    const cols  = ["paciente_id", ...campos];
    const vals  = [paciente_id, ...campos.map((c) => (f[c] === "" || f[c] === undefined ? null : f[c]))];
    const ph    = cols.map(() => "?").join(",");
    const onDup = campos.map((c) => `${c}=VALUES(${c})`).join(",");

    await req.db.query(
      `INSERT INTO antecedentes_go (${cols.join(",")}) VALUES (${ph}) ON DUPLICATE KEY UPDATE ${onDup}`,
      vals
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar antecedentes G.O." });
  }
};
