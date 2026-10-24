import pool from "../config/db.js";

// ── helpers: clasificación Z-score ──────────────────────────────────────────
function clasificarZ(z, tipo = "general") {
  if (z == null || isNaN(z)) return null;
  if (tipo === "talla") {
    if (z < -3)  return "Talla baja severa";
    if (z < -2)  return "Talla baja";
    if (z <= 2)  return "Normal";
    return "Talla alta";
  }
  if (tipo === "imc") {
    if (z < -3)  return "Delgadez severa";
    if (z < -2)  return "Delgadez";
    if (z <= 1)  return "Normal";
    if (z <= 2)  return "Sobrepeso";
    if (z <= 3)  return "Obesidad";
    return "Obesidad severa";
  }
  if (tipo === "pc") {
    if (z < -2)  return "Microcefalia";
    if (z <= 2)  return "Normal";
    return "Macrocefalia";
  }
  // peso/edad general
  if (z < -3)  return "Desnutrición severa";
  if (z < -2)  return "Desnutrición moderada";
  if (z < -1)  return "Riesgo de desnutrición";
  if (z <= 1)  return "Normal";
  if (z <= 2)  return "Riesgo de sobrepeso";
  if (z <= 3)  return "Sobrepeso";
  return "Obesidad";
}

// Percentil aproximado a partir de Z-score (función normal estándar)
function zToPercentil(z) {
  if (z == null || isNaN(z)) return null;
  // Aproximación de la función de distribución normal acumulada
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  const cdf = 0.5 * (1.0 + sign * y);
  const pct = Math.round(cdf * 100);
  return pct < 1 ? "P0" : pct >= 100 ? "P99" : `P${pct}`;
}

export async function listarCrecimiento(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM historial_crecimiento WHERE paciente_id = ? ORDER BY fecha DESC, id DESC`,
      [req.params.id]
    );
    // Añadir percentil en respuesta
    const data = rows.map(r => ({
      ...r,
      percentil_peso_edad:  zToPercentil(r.zscore_peso_edad),
      percentil_talla_edad: zToPercentil(r.zscore_talla_edad),
      percentil_imc_edad:   zToPercentil(r.zscore_imc_edad),
      percentil_pc_edad:    zToPercentil(r.zscore_pc_edad),
    }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener historial de crecimiento" });
  }
}

export async function crearCrecimiento(req, res) {
  const {
    fecha, peso_kg, talla_cm, pc_cm, edad_meses,
    zscore_peso_edad, zscore_talla_edad, zscore_imc_edad, zscore_pc_edad,
    observaciones,
  } = req.body;

  if (!fecha) return res.status(400).json({ error: "La fecha es obligatoria" });

  // Calcular IMC si hay peso y talla
  let imc = null;
  if (peso_kg && talla_cm) {
    const tallaMt = Number(talla_cm) / 100;
    imc = parseFloat((Number(peso_kg) / (tallaMt * tallaMt)).toFixed(2));
  }

  // Clasificaciones automáticas si hay z-scores
  const estado_peso_edad  = clasificarZ(zscore_peso_edad,  "general");
  const estado_talla_edad = clasificarZ(zscore_talla_edad, "talla");
  const estado_imc_edad   = clasificarZ(zscore_imc_edad,   "imc");
  const estado_pc_edad    = clasificarZ(zscore_pc_edad,    "pc");

  try {
    const [result] = await pool.query(
      `INSERT INTO historial_crecimiento
        (paciente_id, fecha, peso_kg, talla_cm, imc, pc_cm, edad_meses,
         zscore_peso_edad, zscore_talla_edad, zscore_imc_edad, zscore_pc_edad,
         estado_peso_edad, estado_talla_edad, estado_imc_edad, estado_pc_edad,
         observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.params.id, fecha,
        peso_kg || null, talla_cm || null, imc, pc_cm || null,
        edad_meses || null,
        zscore_peso_edad  != null ? zscore_peso_edad  : null,
        zscore_talla_edad != null ? zscore_talla_edad : null,
        zscore_imc_edad   != null ? zscore_imc_edad   : null,
        zscore_pc_edad    != null ? zscore_pc_edad    : null,
        estado_peso_edad, estado_talla_edad, estado_imc_edad, estado_pc_edad,
        observaciones || null,
      ]
    );
    res.status(201).json({
      id: result.insertId, imc,
      estado_peso_edad, estado_talla_edad, estado_imc_edad, estado_pc_edad,
      percentil_peso_edad:  zToPercentil(zscore_peso_edad),
      percentil_talla_edad: zToPercentil(zscore_talla_edad),
      percentil_imc_edad:   zToPercentil(zscore_imc_edad),
      percentil_pc_edad:    zToPercentil(zscore_pc_edad),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar registro de crecimiento" });
  }
}

export async function actualizarCrecimiento(req, res) {
  const {
    fecha, peso_kg, talla_cm, pc_cm, edad_meses,
    zscore_peso_edad, zscore_talla_edad, zscore_imc_edad, zscore_pc_edad,
    observaciones,
  } = req.body;

  let imc = null;
  if (peso_kg && talla_cm) {
    const tallaMt = Number(talla_cm) / 100;
    imc = parseFloat((Number(peso_kg) / (tallaMt * tallaMt)).toFixed(2));
  }

  const estado_peso_edad  = clasificarZ(zscore_peso_edad,  "general");
  const estado_talla_edad = clasificarZ(zscore_talla_edad, "talla");
  const estado_imc_edad   = clasificarZ(zscore_imc_edad,   "imc");
  const estado_pc_edad    = clasificarZ(zscore_pc_edad,    "pc");

  try {
    await pool.query(
      `UPDATE historial_crecimiento SET
        fecha=?, peso_kg=?, talla_cm=?, imc=?, pc_cm=?, edad_meses=?,
        zscore_peso_edad=?, zscore_talla_edad=?, zscore_imc_edad=?, zscore_pc_edad=?,
        estado_peso_edad=?, estado_talla_edad=?, estado_imc_edad=?, estado_pc_edad=?,
        observaciones=?
       WHERE id=? AND paciente_id=?`,
      [
        fecha,
        peso_kg || null, talla_cm || null, imc, pc_cm || null,
        edad_meses || null,
        zscore_peso_edad  != null ? zscore_peso_edad  : null,
        zscore_talla_edad != null ? zscore_talla_edad : null,
        zscore_imc_edad   != null ? zscore_imc_edad   : null,
        zscore_pc_edad    != null ? zscore_pc_edad    : null,
        estado_peso_edad, estado_talla_edad, estado_imc_edad, estado_pc_edad,
        observaciones || null,
        req.params.regId, req.params.id,
      ]
    );
    res.json({
      imc,
      estado_peso_edad, estado_talla_edad, estado_imc_edad, estado_pc_edad,
      percentil_peso_edad:  zToPercentil(zscore_peso_edad),
      percentil_talla_edad: zToPercentil(zscore_talla_edad),
      percentil_imc_edad:   zToPercentil(zscore_imc_edad),
      percentil_pc_edad:    zToPercentil(zscore_pc_edad),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar registro de crecimiento" });
  }
}

export async function eliminarCrecimiento(req, res) {
  try {
    await pool.query(
      "DELETE FROM historial_crecimiento WHERE id=? AND paciente_id=?",
      [req.params.regId, req.params.id]
    );
    res.json({ mensaje: "Registro eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar registro de crecimiento" });
  }
}
