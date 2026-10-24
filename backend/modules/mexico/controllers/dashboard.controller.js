
export const getResumen = async (req, res) => {
  try {
    // El admin de país puede filtrar opcionalmente por clínica (drill-down) o ver
    // el agregado nacional; cualquier otro perfil queda forzado a su propia unidad.
    const unidad_id = req.alcance.esAdmin ? (req.query.unidad_id || null) : req.alcance.unidadId;
    const filtro = unidad_id ? "WHERE p.unidad_servicio_id = ?" : "";
    const params = unidad_id ? [unidad_id] : [];

    // ── Totales básicos ─────────────────────────────────────────────────────
    const [[totales]] = await req.db.query(
      `SELECT
        COUNT(*)                             AS total_pacientes,
        SUM(p.sexo = 'F')                    AS mujeres,
        SUM(p.sexo = 'M')                    AS hombres,
        SUM(p.estatus_id = 1)                AS activos,
        SUM(p.estatus_id = 2)                AS baja,
        SUM(p.estatus_id = 3)                AS inactivos,
        SUM(p.fecha_alta >= DATE_SUB(NOW(), INTERVAL 30 DAY))  AS nuevos_30d,
        SUM(p.fecha_alta >= DATE_SUB(NOW(), INTERVAL 365 DAY)) AS nuevos_anio
       FROM paciente p ${filtro}`,
      params
    );

    // ── Distribución por tipo de diabetes ───────────────────────────────────
    const [por_tipo] = await req.db.query(
      `SELECT td.descripcion AS tipo, COUNT(*) AS total
       FROM diagnostico d
       JOIN paciente p ON p.id = d.paciente_id
       JOIN cat_tipo_diabetes td ON td.id = d.tipo_diabetes_id
       ${unidad_id ? "WHERE p.unidad_servicio_id = ?" : ""}
       GROUP BY td.id ORDER BY total DESC`,
      params
    );

    // ── Control glucémico (último HbA1c por paciente) ───────────────────────
    const [[control_hba1c]] = await req.db.query(
      `SELECT
        ROUND(AVG(hba1c), 1)              AS promedio,
        SUM(hba1c < 7)                    AS optimo,
        SUM(hba1c BETWEEN 7 AND 9)        AS moderado,
        SUM(hba1c > 9)                    AS alto,
        COUNT(*)                          AS total_medidos
       FROM (
         SELECT l.paciente_id, l.hba1c,
                ROW_NUMBER() OVER (PARTITION BY l.paciente_id ORDER BY l.fecha_muestra DESC) AS rn
         FROM laboratorio l
         JOIN paciente p ON p.id = l.paciente_id
         WHERE l.hba1c IS NOT NULL ${unidad_id ? "AND p.unidad_servicio_id = ?" : ""}
       ) t WHERE rn = 1`,
      params
    );

    // ── Pacientes sin consulta en los últimos 6 meses ──────────────────────
    const [[{ sin_consulta }]] = await req.db.query(
      `SELECT COUNT(DISTINCT p.id) AS sin_consulta
       FROM paciente p
       LEFT JOIN consulta c
         ON c.paciente_id = p.id
         AND c.fecha_consulta >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       WHERE p.estatus_id = 1
         AND c.paciente_id IS NULL
         ${unidad_id ? "AND p.unidad_servicio_id = ?" : ""}`,
      params
    );

    // ── Eventos adversos totales ────────────────────────────────────────────
    const [[eventos_resumen]] = await req.db.query(
      `SELECT
        SUM(tipo = 'CETOACIDOSIS')        AS cetoacidosis,
        SUM(tipo = 'HIPOGLUCEMIA_SEVERA') AS hipo_severa,
        SUM(tipo = 'HIPOGLUCEMIA_LEVE')   AS hipo_leve,
        SUM(tipo = 'HOSPITALIZACION')     AS hospitalizaciones
       FROM evento ev
       JOIN paciente p ON p.id = ev.paciente_id
       ${unidad_id ? "WHERE p.unidad_servicio_id = ?" : ""}`,
      params
    );

    // ── Calidad de datos ────────────────────────────────────────────────────
    const [[calidad_datos]] = await req.db.query(
      `SELECT
        COUNT(*)                                                     AS total,
        SUM(p.expediente IS NOT NULL AND p.expediente <> '')         AS con_expediente,
        SUM(p.unidad_servicio_id IS NOT NULL)                        AS con_unidad,
        SUM(EXISTS (
          SELECT 1 FROM diagnostico d
          WHERE d.paciente_id = p.id
            AND (d.anti_gad IS NOT NULL OR d.anti_ia2 IS NOT NULL
                 OR d.anti_islotes IS NOT NULL OR d.anti_zct8 IS NOT NULL)
        ))                                                            AS con_autoanticuerpos,
        SUM(EXISTS (
          SELECT 1 FROM laboratorio l
          WHERE l.paciente_id = p.id
            AND l.hba1c IS NOT NULL
            AND l.fecha_muestra >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        ))                                                            AS con_hba1c_reciente
       FROM paciente p ${filtro}`,
      params
    );

    // ── Distribución por edad al diagnóstico ────────────────────────────────
    const [edad_dx] = await req.db.query(
      `SELECT
        CASE
          WHEN edad_diagnostico < 1  THEN '< 1'
          WHEN edad_diagnostico < 5  THEN '1-4'
          WHEN edad_diagnostico < 10 THEN '5-9'
          WHEN edad_diagnostico < 15 THEN '10-14'
          WHEN edad_diagnostico < 20 THEN '15-19'
          WHEN edad_diagnostico < 30 THEN '20-29'
          ELSE '30+'
        END AS rango,
        COUNT(*) AS n,
        MIN(edad_diagnostico) AS orden
       FROM diagnostico d
       JOIN paciente p ON p.id = d.paciente_id
       WHERE edad_diagnostico IS NOT NULL
         ${unidad_id ? "AND p.unidad_servicio_id = ?" : ""}
       GROUP BY rango ORDER BY orden`,
      params
    );

    // ── Nuevos pacientes por mes (últimos 12 meses) ─────────────────────────
    const [nuevos_por_mes] = await req.db.query(
      `SELECT DATE_FORMAT(fecha_alta, '%Y-%m')        AS mes,
              MIN(DATE_FORMAT(fecha_alta, '%b %Y'))   AS mes_label,
              COUNT(*) AS n
       FROM paciente p
       WHERE fecha_alta >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         ${unidad_id ? "AND p.unidad_servicio_id = ?" : ""}
       GROUP BY mes ORDER BY mes`,
      params
    );

    // ── Top unidades por pacientes (comparativo entre clínicas — solo admin país) ──
    const [top_unidades] = req.alcance.esAdmin
      ? await req.db.query(
          `SELECT u.nombre AS unidad, COUNT(*) AS n
           FROM paciente p
           JOIN unidad_servicio_salud u ON u.id = p.unidad_servicio_id
           WHERE p.estatus_id = 1
           GROUP BY u.id ORDER BY n DESC LIMIT 8`
        )
      : [[]];

    // ── HbA1c recientes (para la lista del lado derecho) ───────────────────
    const [hba1c_recientes] = await req.db.query(
      `SELECT l.paciente_id, l.hba1c, l.fecha_muestra,
              p.nombre, p.ap_pat
       FROM laboratorio l
       JOIN paciente p ON p.id = l.paciente_id
       WHERE l.hba1c IS NOT NULL
         ${unidad_id ? "AND p.unidad_servicio_id = ?" : ""}
       ORDER BY l.fecha_muestra DESC LIMIT 8`,
      params
    );

    res.json({
      totales: { ...totales, sin_consulta },
      calidad_datos,
      por_tipo,
      control_hba1c,
      edad_dx,
      nuevos_por_mes,
      top_unidades,
      hba1c_recientes,
      eventos_resumen,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
};
