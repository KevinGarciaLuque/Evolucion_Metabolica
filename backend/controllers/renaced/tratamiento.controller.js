
export const getTratamientoByPaciente = async (req, res) => {
  const { paciente_id } = req.params;
  try {
    const [rows] = await req.db.query(
      `SELECT t.*,
              ct.descripcion AS terapia,
              ce.descripcion AS esquema_insulina,
              cd.descripcion AS dispositivo
       FROM tratamiento t
       LEFT JOIN cat_terapia        ct ON ct.id = t.terapia_id
       LEFT JOIN cat_esquemas_insulinas ce ON ce.id = t.esquema_insulina_id
       LEFT JOIN cat_dispositivo    cd ON cd.id = t.dispositivo_id
       WHERE t.paciente_id = ?
       ORDER BY t.fecha_captura DESC`,
      [paciente_id]
    );

    const [insulinas] = await req.db.query(
      `SELECT tid.*, ci.nombre AS insulina
       FROM tratamiento_insulina_detalle tid
       JOIN cat_insulina ci ON ci.id = tid.insulina_id
       WHERE tid.tratamiento_id IN (
         SELECT id FROM tratamiento WHERE paciente_id = ?
       )`,
      [paciente_id]
    );

    const [orales] = await req.db.query(
      `SELECT tor.*, ca.nombre AS antidiabetico
       FROM tratamiento_oral tor
       LEFT JOIN cat_antidiabetico ca ON ca.id = tor.antidiabetico_id
       WHERE tor.paciente_id = ?
       ORDER BY tor.fecha_inicio DESC`,
      [paciente_id]
    );

    // Otros tratamientos (betabloqueadores, IECA, estatinas, etc.) — opcional
    let otros = [];
    try {
      [otros] = await req.db.query(
        `SELECT * FROM tratamiento_otx
         WHERE paciente_id = ?
         ORDER BY fecha_inicio DESC, id DESC`,
        [paciente_id]
      );
    } catch (_) { otros = []; }

    // Ajustes de dosis de insulina (cabecera + detalle por insulina) — opcional
    let ajustes = [];
    try {
      [ajustes] = await req.db.query(
        `SELECT * FROM tratamiento_ajuste_dosis
         WHERE paciente_id = ?
         ORDER BY fecha_ajuste DESC, id DESC`,
        [paciente_id]
      );
      if (ajustes.length) {
        const ids = ajustes.map((a) => a.id);
        const [det] = await req.db.query(
          `SELECT dt.ajuste_id, dt.insulina_id, dt.dosis, dt.inyecciones, ci.nombre AS insulina
           FROM tratamiento_ajuste_dosis_detalle dt
           JOIN cat_insulina ci ON ci.id = dt.insulina_id
           WHERE dt.ajuste_id IN (?)`,
          [ids]
        );
        const porAjuste = {};
        for (const dd of det) (porAjuste[dd.ajuste_id] ||= []).push(dd);
        for (const a of ajustes) a.detalle = porAjuste[a.id] || [];
      }
    } catch (_) { ajustes = []; }

    res.json({ tratamientos: rows, insulinas, orales, otros, ajustes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener tratamiento" });
  }
};

export const createTratamiento = async (req, res) => {
  const { paciente_id } = req.params;
  const { terapia_id, esquema_insulina_id, dispositivo_id, fecha_inicio, insulinas = [], orales = [] } = req.body;
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO tratamiento (paciente_id, terapia_id, esquema_insulina_id, dispositivo_id, fecha_inicio, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [paciente_id, terapia_id || null, esquema_insulina_id || null, dispositivo_id || null, fecha_inicio || null]
    );
    const tratamiento_id = result.insertId;

    for (const ins of insulinas) {
      if (ins.insulina_id) {
        await conn.query(
          `INSERT INTO tratamiento_insulina_detalle (tratamiento_id, insulina_id, dosis_unidades, frecuencia, momento)
           VALUES (?, ?, ?, ?, ?)`,
          [tratamiento_id, ins.insulina_id, ins.dosis_unidades || null, ins.frecuencia || null, ins.momento || null]
        );
      }
    }

    for (const oral of orales) {
      if (oral.antidiabetico_id) {
        await conn.query(
          `INSERT INTO tratamiento_oral (paciente_id, antidiabetico_id, dosis_mg, frecuencia, fecha_inicio)
           VALUES (?, ?, ?, ?, ?)`,
          [paciente_id, oral.antidiabetico_id, oral.dosis_mg || null, oral.frecuencia || null, oral.fecha_inicio || null]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: tratamiento_id });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al guardar tratamiento" });
  } finally {
    conn.release();
  }
};

// ── Otros tratamientos (tratamiento_otx) ──────────────────────────────────────
const OTX_COLS = ["descripcion", "dosis", "fecha_inicio", "fecha_fin", "activo"];

export const createTratamientoOtx = async (req, res) => {
  const { paciente_id } = req.params;
  const cols = ["paciente_id"], ph = ["?"], vals = [paciente_id];
  for (const c of OTX_COLS) {
    if (c in req.body) { cols.push(c); ph.push("?"); vals.push(req.body[c] === "" ? null : req.body[c]); }
  }
  cols.push("usuario_id"); ph.push("?"); vals.push(req.usuario?.id || null);
  cols.push("fecha_captura"); ph.push("NOW()");
  try {
    const [r] = await req.db.query(`INSERT INTO tratamiento_otx (${cols.join(",")}) VALUES (${ph.join(",")})`, vals);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar otro tratamiento" });
  }
};

export const updateTratamientoOtx = async (req, res) => {
  const { otxId } = req.params;
  const sets = [], vals = [];
  for (const c of OTX_COLS) {
    if (c in req.body) { sets.push(`${c}=?`); vals.push(req.body[c] === "" ? null : req.body[c]); }
  }
  if (!sets.length) return res.json({ updated: 0 });
  vals.push(otxId);
  try {
    await req.db.query(`UPDATE tratamiento_otx SET ${sets.join(",")} WHERE id=?`, vals);
    res.json({ updated: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar otro tratamiento" });
  }
};

export const deleteTratamientoOtx = async (req, res) => {
  try {
    await req.db.query("DELETE FROM tratamiento_otx WHERE id=?", [req.params.otxId]);
    res.json({ deleted: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar otro tratamiento" });
  }
};

// ── Ajustes de dosis de insulina (cabecera + detalle) ─────────────────────────
async function siguienteId(conn, tabla) {
  const [[{ m }]] = await conn.query(`SELECT COALESCE(MAX(id),0)+1 AS m FROM ${tabla}`);
  return m;
}

export const createAjusteDosis = async (req, res) => {
  const { paciente_id } = req.params;
  const { fecha_ajuste, dosis_total_dia, dosis_total_kg_dia, detalle = [] } = req.body;
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();
    const id = await siguienteId(conn, "tratamiento_ajuste_dosis");
    await conn.query(
      `INSERT INTO tratamiento_ajuste_dosis (id, paciente_id, fecha_ajuste, dosis_total_dia, dosis_total_kg_dia, fecha_captura)
       VALUES (?,?,?,?,?,NOW())`,
      [id, paciente_id, fecha_ajuste || null, dosis_total_dia || null, dosis_total_kg_dia || null]
    );
    for (const d of detalle) {
      if (d.insulina_id) {
        await conn.query(
          `INSERT INTO tratamiento_ajuste_dosis_detalle (ajuste_id, insulina_id, dosis, inyecciones) VALUES (?,?,?,?)`,
          [id, d.insulina_id, d.dosis || null, d.inyecciones || null]
        );
      }
    }
    await conn.commit();
    res.status(201).json({ id });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al guardar ajuste de dosis" });
  } finally {
    conn.release();
  }
};

export const updateAjusteDosis = async (req, res) => {
  const { ajusteId } = req.params;
  const { fecha_ajuste, dosis_total_dia, dosis_total_kg_dia, detalle } = req.body;
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE tratamiento_ajuste_dosis
       SET fecha_ajuste=?, dosis_total_dia=?, dosis_total_kg_dia=?
       WHERE id=?`,
      [fecha_ajuste || null, dosis_total_dia || null, dosis_total_kg_dia || null, ajusteId]
    );
    if (Array.isArray(detalle)) {
      await conn.query("DELETE FROM tratamiento_ajuste_dosis_detalle WHERE ajuste_id=?", [ajusteId]);
      for (const d of detalle) {
        if (d.insulina_id) {
          await conn.query(
            `INSERT INTO tratamiento_ajuste_dosis_detalle (ajuste_id, insulina_id, dosis, inyecciones) VALUES (?,?,?,?)`,
            [ajusteId, d.insulina_id, d.dosis || null, d.inyecciones || null]
          );
        }
      }
    }
    await conn.commit();
    res.json({ updated: 1 });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al actualizar ajuste de dosis" });
  } finally {
    conn.release();
  }
};

export const deleteAjusteDosis = async (req, res) => {
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM tratamiento_ajuste_dosis_detalle WHERE ajuste_id=?", [req.params.ajusteId]);
    await conn.query("DELETE FROM tratamiento_ajuste_dosis WHERE id=?", [req.params.ajusteId]);
    await conn.commit();
    res.json({ deleted: 1 });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al eliminar ajuste de dosis" });
  } finally {
    conn.release();
  }
};
