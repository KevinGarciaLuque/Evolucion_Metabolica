// Columnas/tablas que la app necesita y que el sistema viejo (o un respaldo restaurado) no trae.
// Todo es ADITIVO (columnas opcionales): los scripts de importación del sistema PHP siguen
// escribiendo igual. Se vuelve a ejecutar tras cada importación porque restaurar un respaldo
// antiguo puede borrar estas columnas.

// [tabla, columna, definición]
const COLUMNAS = [
  ["tratamiento",      "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["tratamiento_oral", "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["educacion",        "consulta_id", "BIGINT UNSIGNED DEFAULT NULL"],
  ["escaneo_mcg",      "extras",      "TEXT DEFAULT NULL"],
];

// Índices para agrupar/consultar por consulta
const INDICES = [
  ["tratamiento", "idx_consulta", "consulta_id"],
  ["tratamiento_oral", "idx_consulta", "consulta_id"],
  ["educacion", "idx_consulta", "consulta_id"],
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

  listos.add(dbKey);
}

/** Obliga a re-verificar en la siguiente llamada (p. ej. después de importar). */
export function olvidarEsquema(dbKey) {
  listos.delete(dbKey);
}
