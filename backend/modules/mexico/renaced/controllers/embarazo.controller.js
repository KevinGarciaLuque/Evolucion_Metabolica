
export const getEmbarazos = async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM embarazo WHERE paciente_id = ? ORDER BY fecha_captura DESC",
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
    const [result] = await req.db.query(
      `INSERT INTO embarazo (
        paciente_id, fecha_um, fecha_pp, tipo_embarazo, logro_embarazo, estatus_embarazo,
        hba1c_dx, fecha_hba1c_dx, glucosa_ayunas, glucosa_50gr,
        ctog75_ayuno, ctog75_1hr, ctog75_2hr, fecha_ctog75,
        ctog100_ayuno, ctog100_1hr, ctog100_2hr, ctog100_3hr, fecha_ctog100,
        hipertension, preeclampsia, eclampsia, hellp,
        oligohidramnios, polihidramnios, desprendimiento_placenta,
        insuficiencia_placentaria, placenta_previa, placenta_acreta,
        semanas_gestacion, via_parto, peso_rn, macrosomia,
        hipoglucemia_rn, sdr, ictericia, malformacion, malformacion_desc, obito,
        usuario_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        paciente_id, f.fecha_um||null, f.fecha_pp||null, f.tipo_embarazo||null, f.logro_embarazo||null, f.estatus_embarazo||null,
        f.hba1c_dx||null, f.fecha_hba1c_dx||null, f.glucosa_ayunas||null, f.glucosa_50gr||null,
        f.ctog75_ayuno||null, f.ctog75_1hr||null, f.ctog75_2hr||null, f.fecha_ctog75||null,
        f.ctog100_ayuno||null, f.ctog100_1hr||null, f.ctog100_2hr||null, f.ctog100_3hr||null, f.fecha_ctog100||null,
        f.hipertension||null, f.preeclampsia||null, f.eclampsia||null, f.hellp||null,
        f.oligohidramnios||null, f.polihidramnios||null, f.desprendimiento_placenta||null,
        f.insuficiencia_placentaria||null, f.placenta_previa||null, f.placenta_acreta||null,
        f.semanas_gestacion||null, f.via_parto||null, f.peso_rn||null, f.macrosomia||null,
        f.hipoglucemia_rn||null, f.sdr||null, f.ictericia||null, f.malformacion||null, f.malformacion_desc||null, f.obito||null,
        req.usuario?.id||null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear embarazo" });
  }
};

export const updateEmbarazo = async (req, res) => {
  try {
    const { paciente_id, id } = req.params;
    const f = req.body;
    await req.db.query(
      `UPDATE embarazo SET
        fecha_um=?, fecha_pp=?, tipo_embarazo=?, logro_embarazo=?, estatus_embarazo=?,
        hba1c_dx=?, fecha_hba1c_dx=?, glucosa_ayunas=?, glucosa_50gr=?,
        ctog75_ayuno=?, ctog75_1hr=?, ctog75_2hr=?, fecha_ctog75=?,
        ctog100_ayuno=?, ctog100_1hr=?, ctog100_2hr=?, ctog100_3hr=?, fecha_ctog100=?,
        hipertension=?, preeclampsia=?, eclampsia=?, hellp=?,
        oligohidramnios=?, polihidramnios=?, desprendimiento_placenta=?,
        insuficiencia_placentaria=?, placenta_previa=?, placenta_acreta=?,
        semanas_gestacion=?, via_parto=?, peso_rn=?, macrosomia=?,
        hipoglucemia_rn=?, sdr=?, ictericia=?, malformacion=?, malformacion_desc=?, obito=?
       WHERE id=? AND paciente_id=?`,
      [
        f.fecha_um||null, f.fecha_pp||null, f.tipo_embarazo||null, f.logro_embarazo||null, f.estatus_embarazo||null,
        f.hba1c_dx||null, f.fecha_hba1c_dx||null, f.glucosa_ayunas||null, f.glucosa_50gr||null,
        f.ctog75_ayuno||null, f.ctog75_1hr||null, f.ctog75_2hr||null, f.fecha_ctog75||null,
        f.ctog100_ayuno||null, f.ctog100_1hr||null, f.ctog100_2hr||null, f.ctog100_3hr||null, f.fecha_ctog100||null,
        f.hipertension||null, f.preeclampsia||null, f.eclampsia||null, f.hellp||null,
        f.oligohidramnios||null, f.polihidramnios||null, f.desprendimiento_placenta||null,
        f.insuficiencia_placentaria||null, f.placenta_previa||null, f.placenta_acreta||null,
        f.semanas_gestacion||null, f.via_parto||null, f.peso_rn||null, f.macrosomia||null,
        f.hipoglucemia_rn||null, f.sdr||null, f.ictericia||null, f.malformacion||null, f.malformacion_desc||null, f.obito||null,
        id, paciente_id,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar embarazo" });
  }
};

export const deleteEmbarazo = async (req, res) => {
  try {
    await req.db.query(
      "DELETE FROM embarazo WHERE id = ? AND paciente_id = ?",
      [req.params.id, req.params.paciente_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar embarazo" });
  }
};
