// Agrupa pacientes por municipio (o estado, si falta el municipio) para el
// mapa interactivo de RENACED México. No usa geocodificación por paciente
// individual — usa el centroide de su municipio de residencia (cat_municipio),
// cacheado previamente por geocodificar_municipios_mexico.cjs.
//
// Expone dos vistas, igual que el sistema anterior:
//   - "residencia": estado/municipio donde vive el paciente (granularidad municipio)
//   - "atencion":   estado del establecimiento de salud que lo atiende (solo estado,
//                   el catálogo de establecimientos no tiene municipio)

const NOMBRES_ESTADO = {
  AS: "Aguascalientes", BC: "Baja California", BS: "Baja California Sur",
  CC: "Campeche", CL: "Coahuila", CM: "Colima", CS: "Chiapas", CH: "Chihuahua",
  DF: "Ciudad de México", DG: "Durango", GT: "Guanajuato", GR: "Guerrero",
  HG: "Hidalgo", JC: "Jalisco", MC: "México", MN: "Michoacán", MS: "Morelos",
  NT: "Nayarit", NL: "Nuevo León", OC: "Oaxaca", PL: "Puebla", QT: "Querétaro",
  QR: "Quintana Roo", SP: "San Luis Potosí", SL: "Sinaloa", SR: "Sonora",
  TC: "Tabasco", TS: "Tamaulipas", TL: "Tlaxcala", VZ: "Veracruz",
  YN: "Yucatán", ZS: "Zacatecas",
};

// El catálogo establecimiento_salud usa la clave numérica INEGI ('01'..'32'),
// mientras que paciente.estado_residencia / cat_municipio usan la clave CURP.
const NUMERICO_A_CURP = {
  "01": "AS", "02": "BC", "03": "BS", "04": "CC", "05": "CL", "06": "CM",
  "07": "CS", "08": "CH", "09": "DF", "10": "DG", "11": "GT", "12": "GR",
  "13": "HG", "14": "JC", "15": "MC", "16": "MN", "17": "MS", "18": "NT",
  "19": "NL", "20": "OC", "21": "PL", "22": "QT", "23": "QR", "24": "SP",
  "25": "SL", "26": "SR", "27": "TC", "28": "TS", "29": "TL", "30": "VZ",
  "31": "YN", "32": "ZS",
};

const ULTIMA_HBA1C_CTE = `
  SELECT l.paciente_id, l.hba1c,
         ROW_NUMBER() OVER (PARTITION BY l.paciente_id ORDER BY l.fecha_muestra DESC) AS rn
  FROM laboratorio l
  WHERE l.hba1c IS NOT NULL
`;

function mapPunto(r, tipo) {
  return {
    tipo,
    estado: r.estado,
    municipio: r.municipio ?? null,
    estado_nombre: NOMBRES_ESTADO[r.estado] || r.estado,
    municipio_nombre: r.municipio_nombre ?? null,
    lat: Number(r.lat), lng: Number(r.lng),
    total: Number(r.total),
    optimo: Number(r.optimo), moderado: Number(r.moderado),
    alto: Number(r.alto), sin_datos: Number(r.sin_datos),
    promedio_hba1c: r.promedio_hba1c != null ? Number(r.promedio_hba1c) : null,
  };
}

async function getVistaResidencia(db, unidadId) {
  const filtroUnidad = unidadId ? "AND p.unidad_servicio_id = ?" : "";
  const paramsUnidad = unidadId ? [unidadId] : [];

  const [conMunicipio] = await db.query(`
    SELECT
      p.estado_residencia AS estado, p.municipio_residencia AS municipio,
      m.nombre AS municipio_nombre, m.lat, m.lng,
      COUNT(*) AS total,
      SUM(CASE WHEN u.hba1c < 7 THEN 1 ELSE 0 END)             AS optimo,
      SUM(CASE WHEN u.hba1c BETWEEN 7 AND 9 THEN 1 ELSE 0 END) AS moderado,
      SUM(CASE WHEN u.hba1c > 9 THEN 1 ELSE 0 END)             AS alto,
      SUM(CASE WHEN u.hba1c IS NULL THEN 1 ELSE 0 END)         AS sin_datos,
      ROUND(AVG(u.hba1c), 1)                                   AS promedio_hba1c
    FROM paciente p
    JOIN cat_municipio m
      ON m.estado_cve = p.estado_residencia AND m.clave = p.municipio_residencia
    LEFT JOIN (${ULTIMA_HBA1C_CTE}) u ON u.paciente_id = p.id AND u.rn = 1
    WHERE m.lat IS NOT NULL AND m.lng IS NOT NULL ${filtroUnidad}
    GROUP BY p.estado_residencia, p.municipio_residencia, m.nombre, m.lat, m.lng
  `, paramsUnidad);

  const [sinMunicipio] = await db.query(`
    SELECT
      p.estado_residencia AS estado,
      AVG(m2.lat) AS lat, AVG(m2.lng) AS lng,
      COUNT(DISTINCT p.id) AS total,
      SUM(CASE WHEN u.hba1c < 7 THEN 1 ELSE 0 END)             AS optimo,
      SUM(CASE WHEN u.hba1c BETWEEN 7 AND 9 THEN 1 ELSE 0 END) AS moderado,
      SUM(CASE WHEN u.hba1c > 9 THEN 1 ELSE 0 END)             AS alto,
      SUM(CASE WHEN u.hba1c IS NULL THEN 1 ELSE 0 END)         AS sin_datos,
      ROUND(AVG(u.hba1c), 1)                                   AS promedio_hba1c
    FROM paciente p
    LEFT JOIN cat_municipio m ON m.estado_cve = p.estado_residencia AND m.clave = p.municipio_residencia
    LEFT JOIN cat_municipio m2 ON m2.estado_cve = p.estado_residencia AND m2.lat IS NOT NULL
    LEFT JOIN (${ULTIMA_HBA1C_CTE}) u ON u.paciente_id = p.id AND u.rn = 1
    WHERE p.estado_residencia IS NOT NULL AND p.estado_residencia <> ''
      AND (m.lat IS NULL OR p.municipio_residencia IS NULL OR p.municipio_residencia = '')
      ${filtroUnidad}
    GROUP BY p.estado_residencia
    HAVING lat IS NOT NULL
  `, paramsUnidad);

  const [topEstados] = await db.query(`
    SELECT p.estado_residencia AS estado, COUNT(*) AS total
    FROM paciente p
    WHERE p.estado_residencia IS NOT NULL AND p.estado_residencia <> '' ${filtroUnidad}
    GROUP BY p.estado_residencia
    ORDER BY total DESC
    LIMIT 10
  `, paramsUnidad);

  const puntos = [
    ...conMunicipio.map((r) => mapPunto(r, "municipio")),
    ...sinMunicipio.map((r) => mapPunto(r, "estado")),
  ];

  return {
    puntos,
    total_georreferenciados: puntos.reduce((a, p) => a + p.total, 0),
    top_estados: topEstados.map((e) => ({ estado: e.estado, nombre: NOMBRES_ESTADO[e.estado] || e.estado, total: Number(e.total) })),
  };
}

async function getVistaAtencion(db, unidadId) {
  const filtroUnidad = unidadId ? "AND p.unidad_servicio_id = ?" : "";
  const paramsUnidad = unidadId ? [unidadId] : [];

  const [rows] = await db.query(`
    SELECT
      e.estado_cve AS estado_num,
      COUNT(*) AS total,
      SUM(CASE WHEN u.hba1c < 7 THEN 1 ELSE 0 END)             AS optimo,
      SUM(CASE WHEN u.hba1c BETWEEN 7 AND 9 THEN 1 ELSE 0 END) AS moderado,
      SUM(CASE WHEN u.hba1c > 9 THEN 1 ELSE 0 END)             AS alto,
      SUM(CASE WHEN u.hba1c IS NULL THEN 1 ELSE 0 END)         AS sin_datos,
      ROUND(AVG(u.hba1c), 1)                                   AS promedio_hba1c
    FROM paciente p
    JOIN unidad_servicio_salud us ON us.id = p.unidad_servicio_id
    JOIN establecimiento_salud e ON e.clave = us.establecimiento_cve
    LEFT JOIN (${ULTIMA_HBA1C_CTE}) u ON u.paciente_id = p.id AND u.rn = 1
    WHERE e.estado_cve IS NOT NULL AND e.estado_cve <> '' ${filtroUnidad}
    GROUP BY e.estado_cve
  `, paramsUnidad);

  const estadosCurp = [...new Set(rows.map((r) => NUMERICO_A_CURP[r.estado_num]).filter(Boolean))];
  const centroides = new Map();
  if (estadosCurp.length) {
    const marks = estadosCurp.map(() => "?").join(",");
    const [centros] = await db.query(
      `SELECT estado_cve, AVG(lat) AS lat, AVG(lng) AS lng FROM cat_municipio WHERE estado_cve IN (${marks}) AND lat IS NOT NULL GROUP BY estado_cve`,
      estadosCurp
    );
    for (const c of centros) centroides.set(c.estado_cve, { lat: Number(c.lat), lng: Number(c.lng) });
  }

  const puntos = rows
    .map((r) => {
      const curp = NUMERICO_A_CURP[r.estado_num];
      const centro = curp ? centroides.get(curp) : null;
      if (!centro) return null;
      return mapPunto({ ...r, estado: curp, lat: centro.lat, lng: centro.lng }, "estado");
    })
    .filter(Boolean);

  return {
    puntos,
    total_georreferenciados: puntos.reduce((a, p) => a + p.total, 0),
    top_estados: [...puntos]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((p) => ({ estado: p.estado, nombre: p.estado_nombre, total: p.total })),
  };
}

export const getMapaPacientes = async (req, res) => {
  try {
    const unidadId = req.alcance.esAdmin ? null : req.alcance.unidadId;
    const [residencia, atencion] = await Promise.all([
      getVistaResidencia(req.db, unidadId),
      getVistaAtencion(req.db, unidadId),
    ]);

    const [[{ total_pacientes }]] = await req.db.query(
      `SELECT COUNT(*) AS total_pacientes FROM paciente ${unidadId ? "WHERE unidad_servicio_id = ?" : ""}`,
      unidadId ? [unidadId] : []
    );

    res.json({
      total_pacientes: Number(total_pacientes),
      residencia,
      atencion,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener datos del mapa" });
  }
};
