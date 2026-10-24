
const CAMPOS_PERMITIDOS = [
  "fecha_diagnostico","fecha_approx","fecha_approx_anio","fecha_approx_mes",
  "peso","estatura","imc",
  "pa_sistolica","pa_diastolica",
  "cetoacidosis","cetoacidosis_ph","cetoacidosis_bicarbonato",
  "glucemia_azar","hba1c","hba1c_fecha","peptido_c",
  "anti_gad","anti_gad_valor",
  "anti_insulina","anti_insulina_valor",
  "anti_islotes","anti_islotes_valor",
  "anti_ia2","anti_ia2_valor",
  "anti_zct8","anti_zct8_valor",
  "hospitalizacion","hospitalizacion_dias",
  "terapia_intensiva","terapia_intensiva_dias",
  "antec_dm1","antec_dm1_grado",
  "antec_dm2","antec_dm2_grado",
  "nacido_por","lactancia_materna","hipotiroidismo_dx",
  "terapia_id","esquema_insulina_id","calculo_dosis_id",
  "dosis_prescrita","dispositivo_id","institucion_id",
  "tipo_mody","confirmacion_genetica","mutacion",
  "lada_fecha_insulina","lada_fecha_approx",
  "edad_diagnostico","criterio_dx","tipo_diabetes_id","tipo_diabetes_otra_id",
];

const nullify = (v) => (v === "" || v === undefined ? null : v);

export async function getDiagnostico(req, res) {
  try {
    const { pacienteId } = req.params;
    const [[row]] = await req.db.query(
      `SELECT d.*,
              td.descripcion  AS tipo_diabetes,
              tdo.descripcion AS tipo_diabetes_otra,
              t.descripcion   AS terapia_desc,
              ei.descripcion  AS esquema_insulina_desc,
              cd.descripcion  AS calculo_dosis_desc,
              dv.descripcion  AS dispositivo_desc,
              ins.siglas      AS institucion_desc
       FROM diagnostico d
       LEFT JOIN cat_tipo_diabetes            td  ON td.id  = d.tipo_diabetes_id
       LEFT JOIN cat_tipo_diabetes_otras      tdo ON tdo.id = d.tipo_diabetes_otra_id
       LEFT JOIN cat_terapia                  t   ON t.id   = d.terapia_id
       LEFT JOIN cat_esquemas_insulinas       ei  ON ei.id  = d.esquema_insulina_id
       LEFT JOIN cat_calculo_dosis_insulinas  cd  ON cd.id  = d.calculo_dosis_id
       LEFT JOIN cat_dispositivo              dv  ON dv.id  = d.dispositivo_id
       LEFT JOIN cat_institucion_ss           ins ON ins.id = d.institucion_id
       WHERE d.paciente_id = ?
       ORDER BY d.fecha_captura ASC LIMIT 1`,
      [pacienteId]
    );
    res.json(row || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener diagnóstico" });
  }
}

export async function saveDiagnostico(req, res) {
  try {
    const { pacienteId } = req.params;
    const body = { ...req.body };

    // Auto-calcular IMC
    if (body.peso && body.estatura && !body.imc) {
      const h = parseFloat(body.estatura);
      if (h > 0) body.imc = +(parseFloat(body.peso) / (h * h)).toFixed(2);
    }

    // Auto-calcular edad al diagnóstico
    if (body.fecha_diagnostico) {
      const [[pac]] = await req.db.query(
        `SELECT fecha_nacimiento FROM paciente WHERE id = ?`,
        [pacienteId]
      );
      if (pac?.fecha_nacimiento) {
        const fnac = new Date(pac.fecha_nacimiento);
        const fdx  = new Date(body.fecha_diagnostico);
        let edad   = fdx.getFullYear() - fnac.getFullYear();
        const dm   = fdx.getMonth() - fnac.getMonth();
        if (dm < 0 || (dm === 0 && fdx.getDate() < fnac.getDate())) edad--;
        body.edad_diagnostico = edad >= 0 ? edad : null;
      }
    }

    // Filtrar solo campos permitidos presentes en el body
    const camposEnviados = CAMPOS_PERMITIDOS.filter((k) => k in body);
    if (!camposEnviados.length) {
      return res.status(400).json({ error: "Sin campos para guardar" });
    }
    const valores = camposEnviados.map((k) => nullify(body[k]));
    const userId  = req.usuario?.id || null;

    const [[existing]] = await req.db.query(
      `SELECT id FROM diagnostico WHERE paciente_id = ? LIMIT 1`,
      [pacienteId]
    );

    if (existing) {
      const sets = camposEnviados.map((k) => `${k} = ?`).join(", ");
      await req.db.query(
        `UPDATE diagnostico SET ${sets}, usuario_id = ? WHERE id = ?`,
        [...valores, userId, existing.id]
      );
    } else {
      const cols = ["paciente_id", ...camposEnviados, "usuario_id"].join(", ");
      const ph   = Array(camposEnviados.length + 2).fill("?").join(", ");
      await req.db.query(
        `INSERT INTO diagnostico (${cols}) VALUES (${ph})`,
        [pacienteId, ...valores, userId]
      );
    }

    res.json({ message: "Diagnóstico guardado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar diagnóstico" });
  }
}
