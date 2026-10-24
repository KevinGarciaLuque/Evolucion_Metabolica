
export const getCatalogosEvaluacion = async (req, res) => {
  try {
    const [[retinopatia], [nefropatia], [neuropatia], [pie_diabetico], [cardiovascular]] =
      await Promise.all([
        req.db.query("SELECT id, descripcion FROM cat_retinopatia ORDER BY id"),
        req.db.query("SELECT id, descripcion FROM cat_nefropatia ORDER BY id"),
        req.db.query("SELECT id, descripcion FROM cat_neuropatia ORDER BY id"),
        req.db.query("SELECT id, descripcion FROM cat_pie_diabetico ORDER BY id"),
        req.db.query("SELECT id, descripcion FROM cat_enfermedad_cardiovascular_periferica ORDER BY id"),
      ]);
    res.json({ retinopatia, nefropatia, neuropatia, pie_diabetico, cardiovascular });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener catálogos de evaluación" });
  }
};

export const buscarColonias = async (req, res) => {
  try {
    const estado = String(req.query.estado || "").toUpperCase();
    const q = String(req.query.q || "").trim();
    if (!/^[A-Z]{2}$/.test(estado)) return res.json([]);

    const where = ["estado_cve = ?"];
    const params = [estado];
    if (/^\d{1,5}$/.test(q)) {
      where.push("cp LIKE ?");
      params.push(`${q}%`);
    } else if (q) {
      where.push("colonia LIKE ?");
      params.push(`%${q}%`);
    }
    const [rows] = await req.db.query(
      `SELECT colonia, cp, municipio, tipo_asenta
       FROM cat_codigo_postal
       WHERE ${where.join(" AND ")}
       ORDER BY colonia, municipio
       LIMIT 40`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar colonias" });
  }
};
