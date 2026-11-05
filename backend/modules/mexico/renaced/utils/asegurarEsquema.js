// Columnas/tablas que la app necesita y que el sistema viejo (o un respaldo restaurado) no trae.
// Todo es ADITIVO (columnas opcionales): los scripts de importación del sistema PHP siguen
// escribiendo igual. Se vuelve a ejecutar tras cada importación porque restaurar un respaldo
// antiguo puede borrar estas columnas.

// [tabla, columna, definición]
const COLUMNAS = [
  ["tratamiento",      "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["tratamiento_oral", "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["educacion",        "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["toxicomanias",     "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["evento",           "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["escaneo_mcg",      "extras",      "TEXT DEFAULT NULL"],
  ["unidad_servicio_salud", "zona_horaria", "VARCHAR(64) DEFAULT NULL"], // zona horaria propia de la clínica
  ["paciente",         "anios_estudio", "TINYINT UNSIGNED DEFAULT NULL"],
  ["paciente",         "aviso_ruta",          "VARCHAR(255) DEFAULT NULL"],
  ["paciente",         "consentimiento_ruta", "VARCHAR(255) DEFAULT NULL"],
  // Analitos ampliados de laboratorio (los llena el escaneo de exámenes y la hoja de consulta)
  ["laboratorio", "archivo_pdf",         "VARCHAR(255) DEFAULT NULL"],
  ["laboratorio", "glucosa_azar",        "DECIMAL(7,2) DEFAULT NULL"],
  ["laboratorio", "peptido_c_azar",      "DECIMAL(7,3) DEFAULT NULL"],
  ["laboratorio", "acido_urico",         "DECIMAL(6,3) DEFAULT NULL"],
  ["laboratorio", "vitamina_d",          "DECIMAL(6,2) DEFAULT NULL"],
  ["laboratorio", "anti_insulina",       "DECIMAL(9,2) DEFAULT NULL"],
  ["laboratorio", "anti_islotes",        "DECIMAL(9,2) DEFAULT NULL"],
  ["laboratorio", "anti_zct8",           "DECIMAL(9,2) DEFAULT NULL"],
  ["laboratorio", "anti_tpo",            "DECIMAL(7,1) DEFAULT NULL"],
  ["laboratorio", "creatinina_urinaria", "DECIMAL(7,2) DEFAULT NULL"],
  ["laboratorio", "rel_album_creat",     "DECIMAL(7,2) DEFAULT NULL"],
  ["laboratorio", "volumen_urinario",    "DECIMAL(7,2) DEFAULT NULL"],
  // Medidas corporales ampliadas de la consulta
  ["consulta", "ica",                "DECIMAL(5,3) DEFAULT NULL"],
  ["consulta", "musculo_kg",         "DECIMAL(5,2) DEFAULT NULL"],
  ["consulta", "grasa_kg",           "DECIMAL(5,2) DEFAULT NULL"],
  ["consulta", "grasa_pct",          "DECIMAL(5,2) DEFAULT NULL"],
  ["consulta", "grasa_visceral",     "DECIMAL(5,2) DEFAULT NULL"],
  ["consulta", "perimetro_cefalico", "DECIMAL(5,2) DEFAULT NULL"],
];

// Índices para agrupar/consultar por consulta
const INDICES = [
  ["tratamiento", "idx_consulta", "consulta_id"],
  ["tratamiento_oral", "idx_consulta", "consulta_id"],
  ["educacion", "idx_consulta", "consulta_id"],
  ["toxicomanias", "idx_consulta", "consulta_id"],
  ["evento", "idx_consulta", "consulta_id"],
  ["estilovida", "idx_consulta", "consulta_id"],
  ["laboratorio", "idx_consulta", "consulta_id"],
  ["evaluacion", "idx_consulta", "consulta_id"],
];

const listos = new Set();

/**
 * Crea lo que falte. Es idempotente y se recuerda por base de datos hasta `forzar`.
 * @param {import("mysql2/promise").Pool} pool
 * @param {string} dbKey  Identificador de la base (para no repetir la verificación)
 * @param {boolean} [forzar] Repetir aunque ya se haya verificado (tras importar un respaldo)
 */
export async function asegurarEsquema(pool, dbKey, forzar = false) {
  if (!forzar && listos.has(dbKey)) return;

  const [tablas] = await pool.query(
    "SELECT TABLE_NAME t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
  );
  const existentes = new Set(tablas.map((r) => r.t));

  const [cols] = await pool.query(
    "SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()"
  );
  const tieneCol = new Set(cols.map((r) => `${r.t}.${r.c}`));

  for (const [tabla, col, def] of COLUMNAS) {
    if (existentes.has(tabla) && !tieneCol.has(`${tabla}.${col}`)) {
      await pool.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${col}\` ${def}`);
      tieneCol.add(`${tabla}.${col}`);
    }
  }

  const [idx] = await pool.query(
    "SELECT TABLE_NAME t, INDEX_NAME i FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()"
  );
  const tieneIdx = new Set(idx.map((r) => `${r.t}.${r.i}`));
  for (const [tabla, nombre, col] of INDICES) {
    if (existentes.has(tabla) && tieneCol.has(`${tabla}.${col}`)) {
      if (!tieneIdx.has(`${tabla}.${nombre}`)) {
        await pool.query(`ALTER TABLE \`${tabla}\` ADD INDEX \`${nombre}\` (\`${col}\`)`);
      }
    }
  }

  // Perfil "Administrador de Clínica": crea y gestiona al personal de su propia clínica.
  if (existentes.has("perfil")) {
    await pool.query(
      "INSERT IGNORE INTO perfil (id, nombre, nivel) VALUES (6, 'Administrador de Clínica', 2)"
    );
    // Consulta nacional: ve todas las clínicas del país, solo lectura, sin administrar.
    await pool.query(
      "INSERT IGNORE INTO perfil (id, nombre, nivel) VALUES (7, 'Consulta nacional', 3)"
    );
  }

  listos.add(dbKey);
}

/** Obliga a re-verificar en la siguiente llamada (p. ej. después de importar). */
export function olvidarEsquema(dbKey) {
  listos.delete(dbKey);
}
