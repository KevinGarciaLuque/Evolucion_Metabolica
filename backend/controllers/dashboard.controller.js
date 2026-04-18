import pool from "../config/db.js";
import { grupoEtario } from "../utils/helpers.js";

export async function statsGlobales(req, res) {
  try {
    const { institucion } = req.query;
    const where = institucion ? `AND p.institucion = '${institucion}'` : "";
    const [[totales]] = await pool.query(`
      SELECT
        COUNT(DISTINCT p.id) AS total_pacientes,
        COUNT(a.id)          AS total_analisis,
        ROUND(AVG(a.tir), 1) AS tir_promedio,
        ROUND(AVG(a.gmi), 2) AS gmi_promedio,
        ROUND(AVG(a.cv), 1)  AS cv_promedio,
        ROUND(AVG(a.glucosa_promedio), 1) AS glucosa_promedio,
        SUM(a.clasificacion = 'OPTIMO')      AS en_control,
        SUM(a.clasificacion = 'MODERADO')    AS moderado,
        SUM(a.clasificacion = 'ALTO_RIESGO') AS alto_riesgo
      FROM pacientes p
      LEFT JOIN analisis a ON a.paciente_id = p.id
      WHERE p.estado = 1 ${where}
    `);
    res.json(totales);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas globales" });
  }
}

export async function porDepartamento(req, res) {
  try {
    const { institucion } = req.query;
    const where = institucion ? `AND p.institucion = '${institucion}'` : "";
    const [rows] = await pool.query(`
      SELECT
        p.departamento,
        COUNT(DISTINCT p.id)  AS total_pacientes,
        ROUND(AVG(a.tir), 1)  AS tir_promedio,
        ROUND(AVG(a.gmi), 2)  AS gmi_promedio,
        ROUND(AVG(a.cv), 1)   AS cv_promedio,
        SUM(a.clasificacion = 'OPTIMO')      AS en_control,
        SUM(a.clasificacion = 'ALTO_RIESGO') AS alto_riesgo
      FROM pacientes p
      LEFT JOIN analisis a ON a.paciente_id = p.id
      WHERE p.estado = 1 ${where}
      GROUP BY p.departamento
      ORDER BY p.departamento
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener datos por departamento" });
  }
}

export async function porGenero(req, res) {
  try {
    const { institucion } = req.query;
    const where = institucion ? `AND p.institucion = '${institucion}'` : "";
    const [rows] = await pool.query(`
      SELECT
        p.sexo,
        COUNT(DISTINCT p.id)  AS total_pacientes,
        ROUND(AVG(a.tir), 1)  AS tir_promedio,
        ROUND(AVG(a.gmi), 2)  AS gmi_promedio,
        ROUND(AVG(a.cv), 1)   AS cv_promedio,
        ROUND(AVG(a.glucosa_promedio), 1) AS glucosa_promedio
      FROM pacientes p
      LEFT JOIN analisis a ON a.paciente_id = p.id
      WHERE p.estado = 1 AND p.sexo IS NOT NULL ${where}
      GROUP BY p.sexo
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener datos por género" });
  }
}

export async function porEdad(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id, p.edad, p.sexo, p.departamento,
        a.tir, a.gmi, a.cv, a.tar, a.tbr, a.clasificacion
      FROM pacientes p
      LEFT JOIN analisis a ON a.paciente_id = p.id
      WHERE p.estado = 1 AND p.edad IS NOT NULL
      ORDER BY p.edad
    `);

    // Agrupar en rangos etarios
    const grupos = {};
    for (const row of rows) {
      const grupo = grupoEtario(row.edad);
      if (!grupos[grupo]) grupos[grupo] = { grupo, count: 0, tir_sum: 0, gmi_sum: 0, cv_sum: 0, n: 0 };
      grupos[grupo].count++;
      if (row.tir !== null) { grupos[grupo].tir_sum += Number(row.tir); grupos[grupo].n++; }
      if (row.gmi !== null)  grupos[grupo].gmi_sum += Number(row.gmi);
      if (row.cv !== null)   grupos[grupo].cv_sum  += Number(row.cv);
    }

    const resultado = Object.values(grupos).map((g) => ({
      grupo: g.grupo,
      total_pacientes: g.count,
      tir_promedio: g.n ? (g.tir_sum / g.n).toFixed(1) : null,
      gmi_promedio: g.n ? (g.gmi_sum / g.n).toFixed(2) : null,
      cv_promedio:  g.n ? (g.cv_sum  / g.n).toFixed(1) : null,
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener datos por edad" });
  }
}

export async function tendencias(req, res) {
  try {
    const { institucion } = req.query;
    const join  = institucion ? "JOIN pacientes p ON p.id = a.paciente_id" : "";
    const where = institucion ? `WHERE p.institucion = '${institucion}'` : "";
    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(a.fecha, '%Y-%m') AS mes,
        COUNT(*)                       AS total,
        ROUND(AVG(a.tir), 1)           AS tir_promedio,
        ROUND(AVG(a.gmi), 2)           AS gmi_promedio,
        ROUND(AVG(a.cv), 1)            AS cv_promedio,
        ROUND(AVG(a.glucosa_promedio), 1) AS glucosa_promedio
      FROM analisis a
      ${join}
      ${where}
      GROUP BY DATE_FORMAT(a.fecha, '%Y-%m')
      ORDER BY mes DESC
      LIMIT 12
    `);
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: "Error al obtener tendencias" });
  }
}

export async function distribucionGlucosa(req, res) {
  try {
    const { institucion } = req.query;
    const join  = institucion ? "JOIN pacientes p ON p.id = a.paciente_id" : "";
    const where = institucion ? `WHERE p.institucion = '${institucion}'` : "";
    const [[rows]] = await pool.query(`
      SELECT
        ROUND(AVG(a.tar_muy_alto), 1) AS muy_alto,
        ROUND(AVG(a.tar_alto), 1)     AS alto,
        ROUND(AVG(a.tir), 1)          AS objetivo,
        ROUND(AVG(a.tbr_bajo), 1)     AS bajo,
        ROUND(AVG(a.tbr_muy_bajo), 1) AS muy_bajo
      FROM analisis a
      ${join}
      ${where}
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener distribución de glucosa" });
  }
}

export async function recientes(req, res) {
  try {
    const { institucion } = req.query;
    const where = institucion ? `AND p.institucion = '${institucion}'` : "";
    const [rows] = await pool.query(`
      SELECT a.id, a.fecha, a.tir, a.gmi, a.clasificacion, a.archivo_pdf,
             p.nombre AS paciente_nombre, p.sexo, p.departamento
      FROM analisis a
      JOIN pacientes p ON p.id = a.paciente_id
      WHERE 1=1 ${where}
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener análisis recientes" });
  }
}
