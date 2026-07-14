import pool from "../../config/db.renaced.js";

export const getAntecedentesGO = async (req, res) => {
  try {
    const [rows] = await pool.query(
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
    const f = req.body;

    // Serializar embarazos previos (hasta 10)
    const embFields = [];
    const embVals   = [];
    for (let i = 1; i <= 10; i++) {
      embFields.push(`emb_previo${i}_des`, `emb_previo${i}_fecha`, `emb_previo${i}_diabetes`);
      embVals.push(f[`emb_previo${i}_des`]||null, f[`emb_previo${i}_fecha`]||null, f[`emb_previo${i}_diabetes`]||null);
    }

    const cols   = ["paciente_id","menarca","fum","visa","mac","peso_4000","menopausia","menopausia_fecha","tipo_menopausia","trh",...embFields];
    const vals   = [paciente_id, f.menarca||null, f.fum||null, f.visa||null, f.mac||null, f.peso_4000||null, f.menopausia||null, f.menopausia_fecha||null, f.tipo_menopausia||null, f.trh||null,...embVals];
    const ph     = cols.map(() => "?").join(",");
    const onDup  = cols.filter(c => c !== "paciente_id").map(c => `${c}=VALUES(${c})`).join(",");

    await pool.query(
      `INSERT INTO antecedentes_go (${cols.join(",")}) VALUES (${ph}) ON DUPLICATE KEY UPDATE ${onDup}`,
      vals
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar antecedentes G.O." });
  }
};
