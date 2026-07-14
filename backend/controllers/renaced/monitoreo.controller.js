import pool from "../../config/db.renaced.js";

// Columnas editables de monitoreo_periodo (id, paciente_id y fecha_captura se gestionan aparte)
const MON_COLS = [
  "fecha_registro",
  "automonitoreo", "automonitoreo_donde", "glucometro_id", "num_mediciones", "dsm",
  "cetonas", "cetonas_donde",
  "flash_libre", "flash_semanas", "flash_escaneos",
  "continuo", "continuo_marca", "continuo_sub", "continuo_semanas", "continuo_porcentaje",
  // periodo 2 semanas
  "glucosa_prom_2s", "tiempo_rango_2s", "tiempo_rango_obj_2s", "tiempo_rango_obj_emb_2s",
  "per_250_2s", "per_180_2s", "per_140_2s", "per_70_2s", "per_63_2s", "per_54_2s",
  "img_2s", "sensor_2s", "desv_std_2s", "cohef_var_2s",
  // periodo 3 meses
  "glucosa_prom_3m", "tiempo_rango_3m", "tiempo_rango_obj_3m", "tiempo_rango_obj_emb_3m",
  "per_250_3m", "per_180_3m", "per_140_3m", "per_70_3m", "per_63_3m", "per_54_3m",
  "img_3m", "sensor_3m", "desv_std_3m", "cohef_var_3m",
];

// Monitoreo por periodo: automonitoreo capilar, MCG flash/continuo y métricas
export const getMonitoreoByPaciente = async (req, res) => {
  const { paciente_id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM monitoreo_periodo
       WHERE paciente_id = ?
       ORDER BY fecha_registro DESC, id DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener monitoreo" });
  }
};

export const createMonitoreo = async (req, res) => {
  const { paciente_id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ m: id }]] = await conn.query("SELECT COALESCE(MAX(id),0)+1 AS m FROM monitoreo_periodo");
    const cols = ["id", "paciente_id"], ph = ["?", "?"], vals = [id, paciente_id];
    for (const c of MON_COLS) {
      if (c in req.body) { cols.push(c); ph.push("?"); vals.push(req.body[c] === "" ? null : req.body[c]); }
    }
    cols.push("fecha_captura"); ph.push("NOW()");
    await conn.query(`INSERT INTO monitoreo_periodo (${cols.join(",")}) VALUES (${ph.join(",")})`, vals);
    await conn.commit();
    res.status(201).json({ id });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Error al guardar monitoreo" });
  } finally {
    conn.release();
  }
};

export const updateMonitoreo = async (req, res) => {
  const { monId } = req.params;
  const sets = [], vals = [];
  for (const c of MON_COLS) {
    if (c in req.body) { sets.push(`${c}=?`); vals.push(req.body[c] === "" ? null : req.body[c]); }
  }
  if (!sets.length) return res.json({ updated: 0 });
  vals.push(monId);
  try {
    await pool.query(`UPDATE monitoreo_periodo SET ${sets.join(",")} WHERE id=?`, vals);
    res.json({ updated: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar monitoreo" });
  }
};

export const deleteMonitoreo = async (req, res) => {
  try {
    await pool.query("DELETE FROM monitoreo_periodo WHERE id=?", [req.params.monId]);
    res.json({ deleted: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar monitoreo" });
  }
};
