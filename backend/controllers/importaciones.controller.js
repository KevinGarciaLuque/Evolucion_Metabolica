import XLSX from "xlsx";
import pool from "../config/db.js";

async function ensureImportTables() {
  await ensurePacientesInstitucionSupportsHEU();
  await normalizeHEUPatientsInstitution();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS import_heu_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      archivo_nombre VARCHAR(255) NOT NULL,
      estado VARCHAR(30) NOT NULL DEFAULT 'preview',
      creado_por INT NULL,
      confirmado_por INT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmado_en TIMESTAMP NULL,
      resumen_json JSON NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS import_heu_staging (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      fila_numero INT NOT NULL,
      dni VARCHAR(40) NULL,
      nombre VARCHAR(180) NULL,
      edad INT NULL,
      sexo CHAR(1) NULL,
      fecha_consulta DATE NULL,
      telefono VARCHAR(30) NULL,
      tipo_consulta VARCHAR(120) NULL,
      hba1c DECIMAL(6,2) NULL,
      tir DECIMAL(6,2) NULL,
      tar DECIMAL(6,2) NULL,
      tbr DECIMAL(6,2) NULL,
      peso DECIMAL(8,2) NULL,
      talla_cm DECIMAL(8,2) NULL,
      imc DECIMAL(8,2) NULL,
      pa_sistolica DECIMAL(8,2) NULL,
      pa_diastolica DECIMAL(8,2) NULL,
      institucion VARCHAR(40) NOT NULL DEFAULT 'HEU',
      grupo_etario VARCHAR(20) NOT NULL DEFAULT 'ADULTO',
      raw_json JSON NULL,
      errores_json JSON NULL,
      accion VARCHAR(40) NOT NULL,
      paciente_id_detectado INT NULL,
      consulta_id_creada INT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_import_heu_batch (batch_id),
      INDEX idx_import_heu_dni (dni),
      CONSTRAINT fk_import_heu_batch FOREIGN KEY (batch_id) REFERENCES import_heu_batches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await pool.query(`ALTER TABLE import_heu_staging ADD COLUMN consulta_id_creada INT NULL`);
  } catch {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS import_heu_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_uuid VARCHAR(160) NOT NULL,
      paciente_id INT NOT NULL,
      consulta_id INT NULL,
      fecha_consulta DATE NULL,
      payload_json JSON NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_import_heu_source_uuid (source_uuid),
      INDEX idx_import_heu_sub_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultas_heu_detalle (
      id INT AUTO_INCREMENT PRIMARY KEY,
      consulta_id INT NOT NULL,
      paciente_id INT NOT NULL,
      source_uuid VARCHAR(160) NULL,
      institucion VARCHAR(40) NOT NULL DEFAULT 'HEU',
      grupo_etario VARCHAR(20) NOT NULL DEFAULT 'ADULTO',
      tipo_consulta VARCHAR(120) NULL,
      fecha_consulta DATE NULL,
      antecedentes_json JSON NULL,
      gineco_json JSON NULL,
      evaluacion_clinica_json JSON NULL,
      terapia_adherencia_json JSON NULL,
      evaluacion_psicosocial_json JSON NULL,
      seguimiento_json JSON NULL,
      raw_json JSON NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_consultas_heu_detalle_consulta (consulta_id),
      INDEX idx_consultas_heu_detalle_paciente (paciente_id),
      INDEX idx_consultas_heu_detalle_uuid (source_uuid),
      CONSTRAINT fk_consultas_heu_detalle_consulta FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE,
      CONSTRAINT fk_consultas_heu_detalle_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function ensurePacientesInstitucionSupportsHEU() {
  try {
    const [rows] = await pool.query(
      `SELECT DATA_TYPE, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'pacientes'
         AND COLUMN_NAME = 'institucion'
       LIMIT 1`
    );

    const col = rows?.[0];
    if (!col) return;

    const dataType = String(col.DATA_TYPE || "").toLowerCase();
    const columnType = String(col.COLUMN_TYPE || "").toUpperCase();

    if (dataType === "enum" && !columnType.includes("'HEU'")) {
      await pool.query(
        "ALTER TABLE pacientes MODIFY COLUMN institucion ENUM('HMEP','IHSS','HEU') NOT NULL DEFAULT 'HMEP'"
      );
    }
  } catch (e) {
    console.warn("No se pudo validar/actualizar enum de pacientes.institucion para HEU:", e?.message || e);
  }
}

async function normalizeHEUPatientsInstitution() {
  try {
    await pool.query(`
      UPDATE pacientes p
      JOIN (
        SELECT DISTINCT paciente_id
        FROM consultas_heu_detalle
        WHERE paciente_id IS NOT NULL
        UNION
        SELECT DISTINCT paciente_id
        FROM import_heu_submissions
        WHERE paciente_id IS NOT NULL
      ) h ON h.paciente_id = p.id
      SET p.institucion = 'HEU'
      WHERE p.institucion <> 'HEU'
    `);
  } catch (e) {
    console.warn("No se pudo normalizar institucion HEU en pacientes:", e?.message || e);
  }
}

function norm(v) {
  return String(v ?? "").trim();
}

function normalizeKey(v) {
  return norm(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function getByAliases(row, aliases) {
  const map = new Map();
  for (const k of Object.keys(row || {})) map.set(normalizeKey(k), row[k]);
  for (const a of aliases) {
    const v = map.get(normalizeKey(a));
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function toNumber(v) {
  const s = norm(v).replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function sexoToCode(v) {
  const s = norm(v).toLowerCase();
  if (s.startsWith("f")) return "F";
  if (s.startsWith("m")) return "M";
  return null;
}

function parseFecha(v) {
  const s = norm(v);
  if (!s) return null;
  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1.toISOString().slice(0, 10);

  const m = s.match(/(\d{1,2})\s+de\s+([a-zA-Záéíóú\.]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const meses = {
    ene: 1, enero: 1,
    feb: 2, febrero: 2,
    mar: 3, marzo: 3,
    abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6,
    jul: 7, julio: 7,
    ago: 8, agosto: 8,
    sep: 9, sept: 9, septiembre: 9,
    oct: 10, octubre: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  };
  const dia = Number(m[1]);
  const mesKey = m[2].toLowerCase().replace(".", "");
  const mes = meses[mesKey];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.toISOString().slice(0, 10);
}

function mapRow(row) {
  const fechaRaw = getByAliases(row, ["Fecha", "fecha", "_submission_time", "_submissiondate", "today"]);
  const fechaNormalizada = parseFecha(fechaRaw) || new Date().toISOString().slice(0, 10);

  return {
    dni: norm(getByAliases(row, [
      "Numero de Identidad / Numero de Expediente",
      "Número de Identidad / Numero de Expediente",
      "Numero_de_Identidad_Numero_de_Expediente",
    ])),
    nombre: norm(getByAliases(row, ["Nombre completo", "Nombre_completo"])),
    edad: toNumber(getByAliases(row, ["Edad"])),
    sexo: sexoToCode(getByAliases(row, ["Sexo"])),
    fecha: fechaNormalizada,
    telefono: norm(getByAliases(row, ["Contacto", "número de teléfono", "numero_de_telefono", "telefono"])),
    tipo_consulta: norm(getByAliases(row, ["Tipo de consulta", "Tipo_de_consulta"])),
    hba1c: toNumber(getByAliases(row, ["Hemoglobina glicosilada%", "Hemoglobina_glicosilada"])),
    tir: toNumber(getByAliases(row, ["Tiempo en rango%", "Tiempo_en_rango"])),
    tar: toNumber(getByAliases(row, ["Tiempo arriba del rango%", "Tiempo_arriba_del_rango"])),
    tbr: toNumber(getByAliases(row, ["Tiempo abajo del rango%", "Tiempo_abajo_del_rango"])),
    peso: toNumber(getByAliases(row, ["Peso (Kg)", "Peso"])),
    talla_cm: toNumber(getByAliases(row, ["Talla (cm)", "Talla"])),
    imc: toNumber(getByAliases(row, ["IMC (Kg/m2)", "IMC"])),
    pa_sys: toNumber(getByAliases(row, ["Presión arterial (mmHg) sistólica", "Presion_arterial_mmhg_sistolica"])),
    pa_dia: toNumber(getByAliases(row, ["Presión arterial (mmHg) diastólica", "Presion_arterial_mmhg_diastolica"])),
    monitoreo: norm(getByAliases(row, ["Monitoreo"])),
    adherencia: norm(getByAliases(row, ["Adherencia al tratamiento", "Adherencia_al_tratamiento"])),
    nivel_atencion: norm(getByAliases(row, ["Nivel de atención", "Nivel_de_atencion"])),
    source_uuid: norm(getByAliases(row, ["_uuid", "instanceID", "meta/rootUuid", "rootUuid", "_id"])),
    raw: row,
  };
}

function resolveSourceUuid(rawObj, mappedRow = null) {
  const raw = rawObj || {};
  const candidates = [
    raw._uuid,
    raw.instanceID,
    raw["meta/rootUuid"],
    raw.rootUuid,
    raw._id,
    mappedRow?.source_uuid,
  ];
  for (const c of candidates) {
    const v = String(c || "").trim();
    if (v) return v;
  }
  return "";
}

function buildObservacionesClinicas(m) {
  const items = [];
  if (m.imc != null) items.push(`IMC: ${m.imc}`);
  if (m.monitoreo) items.push(`Monitoreo: ${m.monitoreo}`);
  if (m.adherencia) items.push(`Adherencia: ${m.adherencia}`);
  if (m.nivel_atencion) items.push(`Nivel atención: ${m.nivel_atencion}`);
  return items.join(" | ");
}

function safeParseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function institutionForPacientesTable() {
  return "HEU";
}

function normalizeTipoConsulta(v) {
  const raw = norm(v);
  if (!raw) return "Control";
  const s = raw.toLowerCase();
  if (s.includes("nuevo")) return "Nuevo";
  if (s.includes("seguimiento")) return "Seguimiento";
  if (s.includes("control")) return "Control";
  // Fallback seguro contra truncamiento SQL
  return raw.slice(0, 30);
}

function pickRaw(rawObj, aliases) {
  for (const a of aliases) {
    const v = getByAliases(rawObj, [a]);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function buildHEUDetalle(rawObj, rowStaging) {
  const antecedenteCirc = pickRaw(rawObj, ["Circunstancias del diagnóstico", "Circunstancias_del_diagnostico"]);
  const antecedentes = {
    tiempo_evolucion_anios: toNumber(pickRaw(rawObj, ["Tiempo de evolución de la condición (años)", "Tiempo_de_evolucion_de_la_condicion_anos"])),
    circunstancias_diagnostico: antecedenteCirc ? String(antecedenteCirc).split(/\s{2,}|,\s*/).map((x) => x.trim()).filter(Boolean) : [],
    anticuerpos_realizados: norm(pickRaw(rawObj, ["Anticuerpos para diabetes realizados", "Anticuerpos_para_diabetes_realizados"])),
    presencia_anticuerpos: norm(pickRaw(rawObj, ["Presencia de anticuerpos", "Presencia_de_anticuerpos"])),
    tratamiento_inicial: norm(pickRaw(rawObj, ["Tratamiento Inicial (En el momento del diagnóstico)", "Tratamiento_Inicial_En_el_momento_del_diagnostico"])),
    antecedentes_personales: norm(pickRaw(rawObj, ["Antecedentes personales patológicos", "Antecedentes_personales_patologicos"])),
    tabaquismo: norm(pickRaw(rawObj, ["Tabaquismo"])),
    alcohol: norm(pickRaw(rawObj, ["Consumo de alcohol", "Consumo_de_alcohol"])),
    drogas: norm(pickRaw(rawObj, ["Consumo de drogas", "Consumo_de_drogas"])),
    antecedentes_familiares: norm(pickRaw(rawObj, ["Antecedentes familiares", "Antecedentes_familiares"])),
  };

  const gineco = {
    menarquia_anios: toNumber(pickRaw(rawObj, ["Menarquia (años)", "Menarquia_anos"])),
    fecha_ultima_menstruacion: parseFecha(pickRaw(rawObj, ["Fecha de última menstruación", "Fecha_de_ultima_menstruacion"])),
    ciclos_menstruales: norm(pickRaw(rawObj, ["Ciclos menstruales", "Ciclos_menstruales"])),
    numero_gestas: toNumber(pickRaw(rawObj, ["Número de gestas", "Numero_de_gestas"])),
    numero_partos: toNumber(pickRaw(rawObj, ["Número de partos", "Numero_de_partos"])),
    numero_abortos: toNumber(pickRaw(rawObj, ["Número de abortos", "Numero_de_abortos"])),
    numero_cesareas: toNumber(pickRaw(rawObj, ["Número de cesáreas", "Numero_de_cesareas"])),
    complicaciones_embarazos_previos: norm(pickRaw(rawObj, ["Complicaciones en embarazos previos", "Complicaciones_en_embarazos_previos"])),
    metodo_planificacion: norm(pickRaw(rawObj, ["Método de planificación", "Metodo_de_planificacion"])),
    embarazo_actual: norm(pickRaw(rawObj, ["Embarazo actual", "Embarazo_actual"])),
  };

  const evalClinica = {
    hba1c: rowStaging.hba1c,
    monitoreo: norm(pickRaw(rawObj, ["Monitoreo"])),
    tiempo_rango: rowStaging.tir,
    tiempo_arriba_rango: rowStaging.tar,
    tiempo_abajo_rango: rowStaging.tbr,
    variabilidad: toNumber(pickRaw(rawObj, ["Variabilidad%", "Variabilidad"])),
    gmi: toNumber(pickRaw(rawObj, ["GMI%", "GMI"])),
    frecuencia_hipoglucemias: norm(pickRaw(rawObj, ["Frecuencia de hipoglucemias", "Frecuencia_de_hipoglucemias"])),
    peso: rowStaging.peso,
    talla_cm: rowStaging.talla_cm,
    imc: rowStaging.imc,
    relacion_albumina_creatinina: toNumber(pickRaw(rawObj, ["Relación albumina/creatinina (mg/g)", "Relacion_albumina_creatinina_mg_g"])),
    tfg: toNumber(pickRaw(rawObj, ["Tasa de filtración glomerular (mL/min/1.73m2)", "Tasa_de_filtracion_glomerular"])),
    mtcns: toNumber(pickRaw(rawObj, ["Escala modificada de neuropatía clínica de Toronto (mTCNS)", "Escala_modificada_de_neuropatia_clinica_de_toronto_mtcns"])),
    iwgdf: norm(pickRaw(rawObj, ["Clasificación de riesgo para el pie diabético IWGDF", "Clasificacion_de_riesgo_para_el_pie_diabetico_iwgdf"])),
    ulcera_miembros_inferiores: norm(pickRaw(rawObj, ["Presencia de ulcera en miembros inferiores", "Presencia_de_ulcera_en_miembros_inferiores"])),
    pedis: norm(pickRaw(rawObj, ["Grado PEDIS", "Grado_pedis"])),
    pa_sistolica: rowStaging.pa_sistolica,
    pa_diastolica: rowStaging.pa_diastolica,
    colesterol_total: toNumber(pickRaw(rawObj, ["Colesterol total (mg/dL)", "Colesterol_total_mg_dl"])),
    ldl: toNumber(pickRaw(rawObj, ["LDL (mg/dL)", "LDL_mg_dl"])),
    hdl: toNumber(pickRaw(rawObj, ["HDL (mg/dL)", "HDL_mg_dl"])),
    trigliceridos: toNumber(pickRaw(rawObj, ["Triglicéridos (mg/dL)", "Trigliceridos_mg_dl"])),
    tsh: toNumber(pickRaw(rawObj, ["TSH (uIU/mL)", "TSH_uiu_ml"])),
    t4_libre: toNumber(pickRaw(rawObj, ["T4 libre (ng/dL)", "T4_libre_ng_dl"])),
    peptido_c: toNumber(pickRaw(rawObj, ["Peptido C (ng/mL)", "Peptido_C_ng_ml"])),
    examen_oftalmologico: norm(pickRaw(rawObj, ["Examen oftalmológico", "Examen_oftalmologico"])),
    hallazgos_oftalmologia: norm(pickRaw(rawObj, ["Hallazgos en evaluación oftalmológica:", "Hallazgos_en_evaluacion_oftalmologica"])),
  };

  const terapiaAdh = {
    esquema_actual_insulina: norm(pickRaw(rawObj, ["Esquema actual de insulina", "Esquema_actual_de_insulina"])),
    basal_prolongada: toNumber(pickRaw(rawObj, ["Insulina basal de acción prolongada (unidades)", "Insulina_basal_de_accion_prolongada_unidades"])),
    basal_intermedia_am: toNumber(pickRaw(rawObj, ["Insulina basal de acción intermedia (unidades) a.m", "Insulina_basal_de_accion_intermedia_unidades_a_m"])),
    basal_intermedia_pm: toNumber(pickRaw(rawObj, ["Insulina basal de acción intermedia (unidades) p.m", "Insulina_basal_de_accion_intermedia_unidades_p_m"])),
    esquema_postprandial: norm(pickRaw(rawObj, ["Esquema postprandial", "Esquema_postprandial"])),
    post_desayuno: toNumber(pickRaw(rawObj, ["Insulina postprandial (unidades) Desayuno", "Insulina_postprandial_unidades_desayuno"])),
    post_almuerzo: toNumber(pickRaw(rawObj, ["Insulina postprandial (unidades) Almuerzo", "Insulina_postprandial_unidades_almuerzo"])),
    post_cena: toNumber(pickRaw(rawObj, ["Insulina postprandial (unidades) Cena", "Insulina_postprandial_unidades_cena"])),
    verapamilo: norm(pickRaw(rawObj, ["Paciente utilizando verapamilo", "Paciente_utilizando_verapamilo"])),
    sensor_en_visita: norm(pickRaw(rawObj, ["Aplicación de sensor de monitoreo continuo durante la visita", "Aplicacion_de_sensor_de_monitoreo_continuo_durante_la_visita"])),
    adherencia: norm(pickRaw(rawObj, ["Adherencia al tratamiento", "Adherencia_al_tratamiento"])),
    nivel_atencion: norm(pickRaw(rawObj, ["Nivel de atención", "Nivel_de_atencion"])),
  };

  const psicosocial = {
    paid5: toNumber(pickRaw(rawObj, ["Escala de PAID-5", "Escala_de_paid_5"])),
    satisfaccion: toNumber(pickRaw(rawObj, ["Satisfacción (A1-A14)", "Satisfaccion_A1_A14"])),
    impacto_diabetes: toNumber(pickRaw(rawObj, ["Impacto de la diabetes (B1-B20)", "Impacto_de_la_diabetes_B1_B20"])),
    preocupaciones: toNumber(pickRaw(rawObj, ["Preocupaciones personales y sociales (C1-C7, D1-D4)", "Preocupaciones_personales_y_sociales_C1_C7_D1_D4"])),
    autoevaluacion_general: toNumber(pickRaw(rawObj, ["Autoevaluación general (E1)", "Autoevaluacion_general_E1"])),
    restriccion_alimentaria: toNumber(pickRaw(rawObj, ["Restricción alimentaria (18)", "Restriccion_alimentaria_18"])),
  };

  const seguimiento = {
    etapa_programa_conteo: norm(pickRaw(rawObj, ["Etapa de programa de conteo avanzado de carbohidratos", "Etapa_de_programa_de_conteo_avanzado_de_carbohidratos"])),
    start: norm(pickRaw(rawObj, ["start"])),
    end: norm(pickRaw(rawObj, ["end"])),
    usuario_kobo: norm(pickRaw(rawObj, ["nombre de usuario", "Nombre_de_usuario", "_submitted_by"])),
    device_id: norm(pickRaw(rawObj, ["ID del dispositivo", "ID_del_dispositivo", "_xform_id_string"])),
  };

  return { antecedentes, gineco, evalClinica, terapiaAdh, psicosocial, seguimiento };
}

async function construirStagingDesdeRows(rows, { archivoNombre = "kobo_sync.json", userId = null } = {}) {
  await ensureImportTables();
  if (!rows.length) return { batchId: null, total: 0, nuevos: 0, actualizar: 0, invalidos: 0 };

  const [batchResult] = await pool.query(
    `INSERT INTO import_heu_batches
     (archivo_nombre, estado, creado_por)
     VALUES (?, 'preview', ?)`,
    [archivoNombre, userId]
  );
  const batchId = batchResult.insertId;

  const mappedRows = rows.map((row, idx) => ({ idx, mapped: mapRow(row) }));
  const validDnis = [...new Set(mappedRows.map((x) => x.mapped.dni).filter((d) => d && d.length > 0))];

  const existentes = new Map();
  if (validDnis.length) {
    const chunk = 500;
    for (let i = 0; i < validDnis.length; i += chunk) {
      const part = validDnis.slice(i, i + chunk);
      const marks = part.map(() => "?").join(",");
      const [found] = await pool.query(
        `SELECT id, dni FROM pacientes WHERE estado = 1 AND dni IN (${marks})`,
        part
      );
      found.forEach((f) => existentes.set(String(f.dni), f.id));
    }
  }

  const validUuids = [...new Set(mappedRows.map((x) => x.mapped.source_uuid).filter((u) => u && u.length > 0))];
  const uuidsImportados = new Set();
  if (validUuids.length) {
    const chunk = 500;
    for (let i = 0; i < validUuids.length; i += chunk) {
      const part = validUuids.slice(i, i + chunk);
      const marks = part.map(() => "?").join(",");
      const [found] = await pool.query(
        `SELECT source_uuid FROM import_heu_submissions WHERE source_uuid IN (${marks})`,
        part
      );
      found.forEach((f) => uuidsImportados.add(String(f.source_uuid)));
    }
  }

  let nuevos = 0;
  let actualizar = 0;
  let invalidos = 0;
  const values = [];
  const dnisNuevosEnBatch = new Set();
  const seenInThisBatch = new Set();

  for (const { idx, mapped } of mappedRows) {
    const errores = [];
    if (!mapped.dni) errores.push("DNI vacío");
    if (!mapped.nombre) errores.push("Nombre vacío");
    if (!mapped.sexo) errores.push("Sexo inválido");
    if (!mapped.fecha) errores.push("Fecha inválida");

    let action = "invalid";
    let pacienteId = null;

    if (!errores.length) {
      const sourceKey = mapped.source_uuid ? `uuid:${mapped.source_uuid}` : `dni_fecha_tipo:${mapped.dni}|${mapped.fecha}|${normalizeTipoConsulta(mapped.tipo_consulta)}`;
      if (seenInThisBatch.has(sourceKey)) {
        action = "skip_duplicado";
      } else if (mapped.source_uuid && uuidsImportados.has(mapped.source_uuid)) {
        action = "skip_duplicado";
      } else {
        const foundId = existentes.get(String(mapped.dni));
        if (foundId || dnisNuevosEnBatch.has(String(mapped.dni))) {
          action = "update_paciente";
          pacienteId = foundId || null;
          if (foundId) actualizar++;
        } else {
          action = "create_paciente";
          nuevos++;
          dnisNuevosEnBatch.add(String(mapped.dni));
        }
      }
      seenInThisBatch.add(sourceKey);
    } else {
      invalidos++;
    }

    values.push([
      batchId, idx + 2, mapped.dni, mapped.nombre, mapped.edad, mapped.sexo, mapped.fecha,
      mapped.telefono, mapped.tipo_consulta, mapped.hba1c, mapped.tir, mapped.tar, mapped.tbr,
      mapped.peso, mapped.talla_cm, mapped.imc, mapped.pa_sys, mapped.pa_dia,
      "HEU", "ADULTO", JSON.stringify(mapped.raw), JSON.stringify(errores), action, pacienteId,
    ]);
  }

  if (values.length) {
    await pool.query(
      `INSERT INTO import_heu_staging
       (batch_id, fila_numero, dni, nombre, edad, sexo, fecha_consulta, telefono,
        tipo_consulta, hba1c, tir, tar, tbr, peso, talla_cm, imc, pa_sistolica, pa_diastolica,
        institucion, grupo_etario, raw_json, errores_json, accion, paciente_id_detectado)
       VALUES ?`,
      [values]
    );
  }

  await pool.query(
    `UPDATE import_heu_batches
     SET resumen_json = ?
     WHERE id = ?`,
    [JSON.stringify({ total: rows.length, nuevos, actualizar, invalidos }), batchId]
  );

  return { batchId, total: rows.length, nuevos, actualizar, invalidos };
}

async function confirmarBatchHEU(batchId, userId) {
  const conn = await pool.getConnection();
  try {
    await ensureImportTables();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM import_heu_staging
       WHERE batch_id = ? AND accion IN ('create_paciente', 'update_paciente')
       ORDER BY id ASC`,
      [batchId]
    );
    if (!rows.length) {
      await conn.rollback();
      return { pacientesCreados: 0, pacientesActualizados: 0, consultasCreadas: 0 };
    }

    let pacientesCreados = 0;
    let pacientesActualizados = 0;
    let consultasCreadas = 0;
    const createdInBatch = new Map();

    for (const r of rows) {
      const rawObj = safeParseJson(r.raw_json);
      const sourceUuid = resolveSourceUuid(rawObj, { source_uuid: null });
      let pacienteId = r.paciente_id_detectado;
      if (r.accion === "create_paciente") {
        if (createdInBatch.has(r.dni)) {
          pacienteId = createdInBatch.get(r.dni);
        } else {
          const instPac = institutionForPacientesTable();
          try {
            const [ins] = await conn.query(
              `INSERT INTO pacientes
               (dni, nombre, edad, sexo, departamento, institucion, telefono, con_monitor, tipo_diabetes)
               VALUES (?, ?, ?, ?, 'Distrito Central', ?, ?, ?, 'DM1')`,
              [r.dni, r.nombre, r.edad, r.sexo, instPac, r.telefono || null, String(r.raw_json || "").toLowerCase().includes("sensor") ? 1 : 0]
            );
            pacienteId = ins.insertId;
            createdInBatch.set(r.dni, pacienteId);
            pacientesCreados++;
          } catch (insertErr) {
            if (insertErr?.code === "ER_DUP_ENTRY") {
              const [pfindAny] = await conn.query("SELECT id FROM pacientes WHERE dni = ? LIMIT 1", [r.dni]);
              pacienteId = pfindAny[0]?.id || null;
              if (!pacienteId) throw insertErr;
              await conn.query(
                `UPDATE pacientes
                 SET estado = 1,
                     nombre = COALESCE(NULLIF(?, ''), nombre),
                     edad = COALESCE(?, edad),
                     sexo = COALESCE(?, sexo),
                     telefono = COALESCE(NULLIF(?, ''), telefono),
                     institucion = ?
                 WHERE id = ?`,
                [r.nombre, r.edad, r.sexo, r.telefono, instPac, pacienteId]
              );
              createdInBatch.set(r.dni, pacienteId);
              pacientesActualizados++;
            } else {
              throw insertErr;
            }
          }
        }
      } else {
        if (!pacienteId && createdInBatch.has(r.dni)) pacienteId = createdInBatch.get(r.dni);
        if (!pacienteId) {
          const [pfind] = await conn.query("SELECT id FROM pacientes WHERE dni = ? AND estado = 1 LIMIT 1", [r.dni]);
          pacienteId = pfind[0]?.id || null;
        }
        if (!pacienteId) continue;
        const instPac = institutionForPacientesTable();
        await conn.query(
          `UPDATE pacientes
           SET nombre = COALESCE(NULLIF(?, ''), nombre),
               edad = COALESCE(?, edad),
               sexo = COALESCE(?, sexo),
               telefono = COALESCE(NULLIF(?, ''), telefono),
               institucion = ?
           WHERE id = ?`,
          [r.nombre, r.edad, r.sexo, r.telefono, instPac, pacienteId]
        );
        pacientesActualizados++;
      }

      const tension = r.pa_sistolica != null && r.pa_diastolica != null ? `${r.pa_sistolica}/${r.pa_diastolica}` : null;
      const tipoConsultaSafe = normalizeTipoConsulta(r.tipo_consulta);
      let consultaId = null;

      if (sourceUuid) {
        const [existByUuid] = await conn.query(
          `SELECT consulta_id
           FROM import_heu_submissions
           WHERE source_uuid = ?
           LIMIT 1`,
          [sourceUuid]
        );
        if (existByUuid.length) consultaId = existByUuid[0].consulta_id || null;
      }

      if (!consultaId && r.fecha_consulta) {
        const [dup] = await conn.query(
          `SELECT c.id
           FROM consultas c
           LEFT JOIN consultas_heu_detalle d ON d.consulta_id = c.id
           WHERE c.paciente_id = ? AND c.fecha = ? AND c.tipo_consulta = ?
           ORDER BY c.id DESC
           LIMIT 1`,
          [pacienteId, r.fecha_consulta, tipoConsultaSafe]
        );
        if (dup.length) consultaId = dup[0].id;
      }

      if (!consultaId && r.fecha_consulta) {
        const [insConsulta] = await conn.query(
          `INSERT INTO consultas
           (paciente_id, fecha, tipo_consulta, peso, talla, hba1c, tension_arterial, observaciones, usuario_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pacienteId,
            r.fecha_consulta,
            tipoConsultaSafe,
            r.peso,
            r.talla_cm != null ? Number((r.talla_cm / 100).toFixed(2)) : null,
            r.hba1c,
            tension,
            buildObservacionesClinicas({
              imc: r.imc,
              monitoreo: rawObj["Monitoreo"] || rawObj["Monitoreo_continuo_de_glucosa"] || "",
              adherencia: rawObj["Adherencia al tratamiento"] || rawObj["Adherencia_al_tratamiento"] || "",
              nivel_atencion: rawObj["Nivel de atención"] || rawObj["Nivel_de_atencion"] || "",
            }),
            userId || null,
          ]
        );
        consultaId = insConsulta.insertId;
        consultasCreadas++;
      }

      if (consultaId) {
        try {
          const detalle = buildHEUDetalle(rawObj, r);
          await conn.query(
            `INSERT INTO consultas_heu_detalle
             (consulta_id, paciente_id, source_uuid, institucion, grupo_etario, tipo_consulta, fecha_consulta,
              antecedentes_json, gineco_json, evaluacion_clinica_json, terapia_adherencia_json,
              evaluacion_psicosocial_json, seguimiento_json, raw_json)
             VALUES (?, ?, ?, 'HEU', 'ADULTO', ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               source_uuid = COALESCE(VALUES(source_uuid), source_uuid),
               tipo_consulta = VALUES(tipo_consulta),
               fecha_consulta = VALUES(fecha_consulta),
               antecedentes_json = VALUES(antecedentes_json),
               gineco_json = VALUES(gineco_json),
               evaluacion_clinica_json = VALUES(evaluacion_clinica_json),
               terapia_adherencia_json = VALUES(terapia_adherencia_json),
               evaluacion_psicosocial_json = VALUES(evaluacion_psicosocial_json),
               seguimiento_json = VALUES(seguimiento_json),
               raw_json = VALUES(raw_json)`,
            [
              consultaId,
              pacienteId,
              sourceUuid || null,
              norm(r.tipo_consulta).slice(0, 120) || "Control",
              r.fecha_consulta,
              JSON.stringify(detalle.antecedentes),
              JSON.stringify(detalle.gineco),
              JSON.stringify(detalle.evalClinica),
              JSON.stringify(detalle.terapiaAdh),
              JSON.stringify(detalle.psicosocial),
              JSON.stringify(detalle.seguimiento),
              JSON.stringify(rawObj),
            ]
          );
        } catch (detailErr) {
          console.error("No se pudo guardar consultas_heu_detalle para consulta", consultaId, detailErr?.message || detailErr);
        }

        if (sourceUuid) {
          await conn.query(
            `INSERT IGNORE INTO import_heu_submissions
             (source_uuid, paciente_id, consulta_id, fecha_consulta, payload_json)
             VALUES (?, ?, ?, ?, ?)`,
            [sourceUuid, pacienteId, consultaId, r.fecha_consulta, JSON.stringify(rawObj)]
          );
        }
      }

      try {
        await conn.query(
          `UPDATE import_heu_staging
           SET paciente_id_detectado = ?, consulta_id_creada = ?
           WHERE id = ?`,
          [pacienteId || null, consultaId || null, r.id]
        );
      } catch (stagingErr) {
        console.error("No se pudo actualizar import_heu_staging con consulta_id_creada:", stagingErr?.message || stagingErr);
      }
    }

    await conn.query(
      `UPDATE import_heu_batches
       SET estado = 'confirmado', confirmado_en = NOW(), confirmado_por = ?
       WHERE id = ?`,
      [userId || null, batchId]
    );

    await conn.commit();
    return { pacientesCreados, pacientesActualizados, consultasCreadas };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function listarPacientesHEU(req, res) {
  try {
    await ensureImportTables();
    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.dni,
         p.nombre,
         p.sexo,
         p.edad,
         p.telefono,
         p.institucion,
         COUNT(DISTINCT d.consulta_id) AS total_consultas_heu,
         MAX(d.fecha_consulta) AS ultima_consulta_heu
       FROM pacientes p
       JOIN consultas_heu_detalle d ON d.paciente_id = p.id
       WHERE p.estado = 1
       GROUP BY p.id, p.dni, p.nombre, p.sexo, p.edad, p.telefono, p.institucion
       ORDER BY p.nombre ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al listar pacientes HEU",
      detalle: error?.message || String(error),
    });
  }
}

async function fetchKoboRows() {
  const token = process.env.KOBO_API_TOKEN;
  const formId = process.env.KOBO_FORM_ID;
  const baseUrl = process.env.KOBO_BASE_URL || "https://kf.kobotoolbox.org";
  if (!token || !formId) throw new Error("Faltan KOBO_API_TOKEN o KOBO_FORM_ID en variables de entorno");

  const rows = [];
  let next = `${baseUrl}/api/v2/assets/${formId}/data/?format=json&limit=500`;

  while (next) {
    const resp = await fetch(next, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Kobo API ${resp.status}: ${t.slice(0, 250)}`);
    }
    const data = await resp.json();
    if (Array.isArray(data)) {
      rows.push(...data);
      next = null;
    } else {
      const results = Array.isArray(data.results) ? data.results : [];
      rows.push(...results);
      next = data.next || null;
    }
  }
  return rows;
}

export async function previewHEU(req, res) {
  if (!req.file) return res.status(400).json({ error: "Debes subir un archivo XLSX" });

  try {
    await ensureImportTables();
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!rows.length) return res.status(400).json({ error: "El archivo no contiene filas" });

    const result = await construirStagingDesdeRows(rows, {
      archivoNombre: req.file.originalname,
      userId: req.usuario?.id || null,
    });

    res.json({
      batch_id: result.batchId,
      total: result.total,
      nuevos: result.nuevos,
      actualizar: result.actualizar,
      invalidos: result.invalidos,
      mensaje: "Preview generado",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al previsualizar importación HEU",
      detalle: error?.message || String(error),
    });
  }
}

export async function confirmarHEU(req, res) {
  const { batch_id } = req.body;
  if (!batch_id) return res.status(400).json({ error: "batch_id es requerido" });

  try {
    const r = await confirmarBatchHEU(batch_id, req.usuario?.id || null);
    res.json({ mensaje: "Importación confirmada", ...r });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al confirmar importación HEU",
      detalle: error?.message || String(error),
    });
  }
}

export async function sincronizarKoboHEU(req, res) {
  try {
    const koboRows = await fetchKoboRows();
    if (!koboRows.length) {
      return res.json({ mensaje: "No hay registros en Kobo para sincronizar", total: 0 });
    }

    const preview = await construirStagingDesdeRows(koboRows, {
      archivoNombre: `kobo_sync_${new Date().toISOString()}.json`,
      userId: req.usuario?.id || null,
    });
    const confirm = await confirmarBatchHEU(preview.batchId, req.usuario?.id || null);

    res.json({
      mensaje: "Sincronización Kobo completada",
      batch_id: preview.batchId,
      total: preview.total,
      nuevos: preview.nuevos,
      actualizar: preview.actualizar,
      invalidos: preview.invalidos,
      ...confirm,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al sincronizar Kobo HEU",
      detalle: error?.message || String(error),
    });
  }
}

export async function detalleBatchHEU(req, res) {
  try {
    await ensureImportTables();
    const [batch] = await pool.query("SELECT * FROM import_heu_batches WHERE id = ?", [req.params.batchId]);
    if (!batch.length) return res.status(404).json({ error: "Batch no encontrado" });
    const [rows] = await pool.query(
      `SELECT id, fila_numero, dni, nombre, accion, errores_json, paciente_id_detectado, consulta_id_creada
       FROM import_heu_staging
       WHERE batch_id = ?
       ORDER BY fila_numero ASC`,
      [req.params.batchId]
    );
    res.json({ batch: batch[0], filas: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al consultar batch HEU",
      detalle: error?.message || String(error),
    });
  }
}

export async function detalleConsultaHEU(req, res) {
  try {
    await ensureImportTables();
    const consultaId = Number(req.params.consultaId);
    if (!Number.isFinite(consultaId) || consultaId <= 0) {
      return res.status(400).json({ error: "consultaId inválido" });
    }

    const [rows] = await pool.query(
      `SELECT d.*,
              c.fecha AS consulta_fecha,
              c.tipo_consulta AS consulta_tipo,
              p.dni AS paciente_dni,
              p.nombre AS paciente_nombre
       FROM consultas_heu_detalle d
       JOIN consultas c ON c.id = d.consulta_id
       JOIN pacientes p ON p.id = d.paciente_id
       WHERE d.consulta_id = ?
       LIMIT 1`,
      [consultaId]
    );
    if (!rows.length) return res.status(404).json({ error: "Detalle HEU no encontrado para esa consulta" });
    res.json({ detalle: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al consultar detalle clínico HEU",
      detalle: error?.message || String(error),
    });
  }
}
