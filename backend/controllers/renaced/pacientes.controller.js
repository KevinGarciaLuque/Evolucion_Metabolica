
export const getPacientes = async (req, res) => {
  try {
    const { busqueda, unidad_id, estatus_id, estado_residencia, municipio_residencia, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = "WHERE 1=1";
    const params = [];

    if (busqueda) {
      where += ` AND (p.nombre LIKE ? OR p.ap_pat LIKE ? OR p.curp LIKE ? OR p.expediente LIKE ?)`;
      const q = `%${busqueda}%`;
      params.push(q, q, q, q);
    }
    // El admin de país puede filtrar por cualquier clínica (drill-down); el resto
    // queda forzado a su propia unidad sin importar lo que envíe el cliente.
    if (!req.alcance.esAdmin) {
      where += " AND p.unidad_servicio_id = ?";
      params.push(req.alcance.unidadId);
    } else if (unidad_id) {
      where += " AND p.unidad_servicio_id = ?"; params.push(unidad_id);
    }
    if (estatus_id) { where += " AND p.estatus_id = ?";        params.push(estatus_id); }
    if (estado_residencia)     { where += " AND p.estado_residencia = ?";     params.push(estado_residencia); }
    if (municipio_residencia) { where += " AND p.municipio_residencia = ?"; params.push(municipio_residencia); }

    const [rows] = await req.db.query(
      `SELECT p.id, p.expediente, p.iniciales, p.nombre, p.ap_pat, p.ap_mat,
              p.sexo, p.fecha_nacimiento, p.curp,
              TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
              pe.descripcion AS estatus, p.estatus_id, p.fecha_alta, p.unidad_servicio_id,
              u.nombre AS unidad,
              (SELECT td.descripcion
               FROM diagnostico d
               JOIN cat_tipo_diabetes td ON td.id = d.tipo_diabetes_id
               WHERE d.paciente_id = p.id
               ORDER BY d.fecha_captura DESC LIMIT 1) AS tipo_diabetes
       FROM paciente p
       LEFT JOIN cat_paciente_estatus pe ON pe.id = p.estatus_id
       LEFT JOIN unidad_servicio_salud u  ON u.id  = p.unidad_servicio_id
       ${where}
       ORDER BY p.fecha_alta DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await req.db.query(
      `SELECT COUNT(*) AS total FROM paciente p ${where}`,
      params
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pacientes" });
  }
};

export const checkCurp = async (req, res) => {
  try {
    const curp = String(req.params.curp || "").toUpperCase().trim();
    const excludeId = req.query.exclude_id ? Number(req.query.exclude_id) : null;
    if (curp.length < 4) return res.json({ existe: false });

    const [[paciente]] = await req.db.query(
      `SELECT id, nombre, ap_pat, ap_mat, curp, unidad_servicio_id
       FROM paciente
       WHERE curp = ? ${excludeId ? "AND id != ?" : ""}
       LIMIT 1`,
      excludeId ? [curp, excludeId] : [curp]
    );

    if (!paciente) return res.json({ existe: false });

    // Si el CURP pertenece a otra clínica, no se revela identidad del paciente
    // a un investigador que no debería verla — solo que el CURP ya está en uso.
    if (!req.alcance.esAdmin && paciente.unidad_servicio_id !== req.alcance.unidadId) {
      return res.json({ existe: true, paciente: { id: paciente.id, curp: paciente.curp } });
    }
    res.json({ existe: true, paciente });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al validar CURP" });
  }
};

export const getPacienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[paciente]] = await req.db.query(
      `SELECT p.*,
              TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
              pe.descripcion AS estatus,
              u.nombre AS unidad
       FROM paciente p
       LEFT JOIN cat_paciente_estatus pe ON pe.id = p.estatus_id
       LEFT JOIN unidad_servicio_salud u  ON u.id  = p.unidad_servicio_id
       WHERE p.id = ?`,
      [id]
    );
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado" });
    if (!req.alcance.esAdmin && paciente.unidad_servicio_id !== req.alcance.unidadId) {
      return res.status(403).json({ error: "No tienes acceso a pacientes de otra clínica" });
    }

    const [diagnostico] = await req.db.query(
      `SELECT d.*, td.descripcion AS tipo_diabetes,
              tdo.descripcion AS tipo_diabetes_otra
       FROM diagnostico d
       LEFT JOIN cat_tipo_diabetes       td  ON td.id  = d.tipo_diabetes_id
       LEFT JOIN cat_tipo_diabetes_otras tdo ON tdo.id = d.tipo_diabetes_otra_id
       WHERE d.paciente_id = ?
       ORDER BY d.fecha_captura ASC LIMIT 1`,
      [id]
    );

    res.json({ ...paciente, diagnostico: diagnostico[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener paciente" });
  }
};

export const createPaciente = async (req, res) => {
  const conn = await req.db.getConnection();
  try {
    const {
      tipo_diabetes_id, tipo_diabetes_otra_id,
      expediente, iniciales, nombre, ap_pat, ap_mat, sexo, fecha_nacimiento, curp,
      estado_nacimiento, municipio_nacimiento, pais_nacimiento_id,
      nivel_ingresos_id, nivel_educativo_id, estado_residencia,
      municipio_residencia, colonia, calle_num, codigo_postal,
      telefonos, email, seguro_medico_id, establecimiento_cve,
      unidad_servicio_id, tiene_aviso_privacidad, tiene_consentimiento,
    } = req.body;

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO paciente (
        expediente, iniciales, nombre, ap_pat, ap_mat, sexo, fecha_nacimiento, curp,
        estado_nacimiento, municipio_nacimiento, pais_nacimiento_id,
        nivel_ingresos_id, nivel_educativo_id, estado_residencia,
        municipio_residencia, colonia, calle_num, codigo_postal,
        telefonos, email, seguro_medico_id, establecimiento_cve,
        unidad_servicio_id, tiene_aviso_privacidad, tiene_consentimiento, estatus_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        expediente || null,
        iniciales  || null,
        nombre, ap_pat, ap_mat || null, sexo,
        fecha_nacimiento || null,
        curp ? curp.toUpperCase().trim() : null,
        estado_nacimiento    || null, municipio_nacimiento || null,
        pais_nacimiento_id   || null,
        nivel_ingresos_id    || null, nivel_educativo_id || null,
        estado_residencia    || null, municipio_residencia || null,
        colonia              || null, calle_num  || null, codigo_postal || null,
        telefonos            || null, email      || null,
        seguro_medico_id     || null, establecimiento_cve || null,
        // El médico/asistente/enfermera solo puede registrar pacientes en su propia
        // clínica; solo el admin de país puede asignar libremente la unidad.
        req.alcance.esAdmin ? (unidad_servicio_id || null) : req.alcance.unidadId,
        tiene_aviso_privacidad ? 1 : 0,
        tiene_consentimiento   ? 1 : 0,
      ]
    );

    const pacienteId = result.insertId;

    if (tipo_diabetes_id) {
      await conn.query(
        `INSERT INTO diagnostico (paciente_id, tipo_diabetes_id, tipo_diabetes_otra_id, usuario_id)
         VALUES (?, ?, ?, ?)`,
        [pacienteId, tipo_diabetes_id, tipo_diabetes_otra_id || null, req.usuario?.id || null]
      );
    }

    await conn.commit();
    res.status(201).json({ id: pacienteId, message: "Paciente registrado correctamente" });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un paciente con ese CURP" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al registrar paciente" });
  } finally {
    conn.release();
  }
};

export const updatePaciente = async (req, res) => {
  const conn = await req.db.getConnection();
  try {
    const { id } = req.params;
    const campos = req.body;
    const { tipo_diabetes_id, tipo_diabetes_otra_id } = campos;

    const [[actual]] = await conn.query("SELECT unidad_servicio_id FROM paciente WHERE id = ?", [id]);
    if (!actual) { conn.release(); return res.status(404).json({ error: "Paciente no encontrado" }); }
    if (!req.alcance.esAdmin && actual.unidad_servicio_id !== req.alcance.unidadId) {
      conn.release();
      return res.status(403).json({ error: "No tienes acceso a pacientes de otra clínica" });
    }

    const permitidos = [
      "expediente","iniciales","nombre","ap_pat","ap_mat","sexo",
      "fecha_nacimiento","curp","estado_nacimiento","municipio_nacimiento",
      "pais_nacimiento_id","nivel_ingresos_id","nivel_educativo_id",
      "estado_residencia","municipio_residencia","colonia","calle_num",
      "codigo_postal","telefonos","email","seguro_medico_id",
      "establecimiento_cve",
      // Solo el admin de país puede reasignar la clínica de un paciente.
      ...(req.alcance.esAdmin ? ["unidad_servicio_id"] : []),
      "tiene_aviso_privacidad","tiene_consentimiento","estatus_id",
    ];

    const sets = [];
    const vals = [];
    for (const k of permitidos) {
      if (k in campos) {
        sets.push(`${k} = ?`);
        vals.push(k === "curp" && campos[k] ? campos[k].toUpperCase().trim() : campos[k]);
      }
    }
    if (!sets.length && tipo_diabetes_id === undefined) {
      return res.status(400).json({ error: "Sin campos para actualizar" });
    }

    await conn.beginTransaction();

    if (sets.length) {
      vals.push(id);
      await conn.query(`UPDATE paciente SET ${sets.join(", ")} WHERE id = ?`, vals);
    }

    if (tipo_diabetes_id !== undefined) {
      const [[existing]] = await conn.query(
        `SELECT id FROM diagnostico WHERE paciente_id = ? ORDER BY fecha_captura ASC LIMIT 1`,
        [id]
      );
      if (existing) {
        await conn.query(
          `UPDATE diagnostico
           SET tipo_diabetes_id = ?, tipo_diabetes_otra_id = ?
           WHERE id = ?`,
          [tipo_diabetes_id || null, tipo_diabetes_otra_id || null, existing.id]
        );
      } else {
        await conn.query(
          `INSERT INTO diagnostico (paciente_id, tipo_diabetes_id, tipo_diabetes_otra_id, usuario_id)
           VALUES (?, ?, ?, ?)`,
          [id, tipo_diabetes_id || null, tipo_diabetes_otra_id || null, req.usuario?.id || null]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Paciente actualizado" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al actualizar paciente" });
  } finally {
    conn.release();
  }
};
