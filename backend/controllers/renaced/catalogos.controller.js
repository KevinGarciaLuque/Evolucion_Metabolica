
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
