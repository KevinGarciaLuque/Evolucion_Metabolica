
export const getComorbilidad = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      `SELECT c.*,
        CASE c.retinopatia_tipo WHEN 1 THEN 'No proliferativa' WHEN 2 THEN 'Proliferativa' WHEN 3 THEN 'Macular' END AS retinopatia_tipo_label,
        CASE c.nefropatia_tipo  WHEN 1 THEN 'Microalbuminuria' WHEN 2 THEN 'Macroalbuminuria' WHEN 3 THEN 'IRC' END AS nefropatia_tipo_label,
        CASE c.neuropatia_tipo  WHEN 1 THEN 'Periférica' WHEN 2 THEN 'Autonómica' END AS neuropatia_tipo_label
       FROM comorbilidad c WHERE c.paciente_id = ?`,
      [req.params.paciente_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener comorbilidades" });
  }
};

export const saveComorbilidad = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const f = req.body;
    await req.db.query(
      `INSERT INTO comorbilidad (
        paciente_id,
        retinopatia, retinopatia_fecha, retinopatia_tipo, retinopatia_laser,
        nefropatia,  nefropatia_fecha,  nefropatia_tipo,
        neuropatia,  neuropatia_fecha,  neuropatia_tipo, neuropatia_auto_tipo,
        vascular_perif, vascular_perif_fecha, vascular_perif_tipo,
        cardiovascular, cardiovascular_fecha, cardiovascular_tipo,
        pie_diabetico,  pie_diabetico_fecha,  pie_diabetico_tipo
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        retinopatia=VALUES(retinopatia), retinopatia_fecha=VALUES(retinopatia_fecha),
        retinopatia_tipo=VALUES(retinopatia_tipo), retinopatia_laser=VALUES(retinopatia_laser),
        nefropatia=VALUES(nefropatia), nefropatia_fecha=VALUES(nefropatia_fecha),
        nefropatia_tipo=VALUES(nefropatia_tipo),
        neuropatia=VALUES(neuropatia), neuropatia_fecha=VALUES(neuropatia_fecha),
        neuropatia_tipo=VALUES(neuropatia_tipo), neuropatia_auto_tipo=VALUES(neuropatia_auto_tipo),
        vascular_perif=VALUES(vascular_perif), vascular_perif_fecha=VALUES(vascular_perif_fecha),
        vascular_perif_tipo=VALUES(vascular_perif_tipo),
        cardiovascular=VALUES(cardiovascular), cardiovascular_fecha=VALUES(cardiovascular_fecha),
        cardiovascular_tipo=VALUES(cardiovascular_tipo),
        pie_diabetico=VALUES(pie_diabetico), pie_diabetico_fecha=VALUES(pie_diabetico_fecha),
        pie_diabetico_tipo=VALUES(pie_diabetico_tipo)`,
      [
        paciente_id,
        f.retinopatia||"NO", f.retinopatia_fecha||null, f.retinopatia_tipo||null, f.retinopatia_laser||null,
        f.nefropatia||"NO",  f.nefropatia_fecha||null,  f.nefropatia_tipo||null,
        f.neuropatia||"NO",  f.neuropatia_fecha||null,  f.neuropatia_tipo||null, f.neuropatia_auto_tipo||null,
        f.vascular_perif||"NO", f.vascular_perif_fecha||null, f.vascular_perif_tipo||null,
        f.cardiovascular||"NO", f.cardiovascular_fecha||null, f.cardiovascular_tipo||null,
        f.pie_diabetico||"NO",  f.pie_diabetico_fecha||null,  f.pie_diabetico_tipo||null,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar comorbilidades" });
  }
};
