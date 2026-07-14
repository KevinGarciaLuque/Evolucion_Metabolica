import pool from "../../config/db.renaced.js";

export const getCatalogosEvaluacion = async (req, res) => {
  try {
    const [[retinopatia], [nefropatia], [neuropatia], [pie_diabetico], [cardiovascular]] =
      await Promise.all([
        pool.query("SELECT id, descripcion FROM cat_retinopatia ORDER BY id"),
        pool.query("SELECT id, descripcion FROM cat_nefropatia ORDER BY id"),
        pool.query("SELECT id, descripcion FROM cat_neuropatia ORDER BY id"),
        pool.query("SELECT id, descripcion FROM cat_pie_diabetico ORDER BY id"),
        pool.query("SELECT id, descripcion FROM cat_enfermedad_cardiovascular_periferica ORDER BY id"),
      ]);
    res.json({ retinopatia, nefropatia, neuropatia, pie_diabetico, cardiovascular });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener catálogos de evaluación" });
  }
};
