/**
 * migrate_dosis_total.cjs
 * Agrega la columna dosis_total_u (DDT - Dosis Diaria Total) a historial_insulina.
 * También rellena el valor para registros existentes.
 * Idempotente: no falla si la columna ya existe.
 */
const mysql = require("mysql2/promise");

const cfg = {
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "123456789",
  database: process.env.DB_NAME     || "evolucion_metabolica",
};

(async () => {
  const c = await mysql.createConnection(cfg);
  console.log("✅ Conectado a", cfg.host, "/", cfg.database);

  // 1. Agregar columna si no existe
  const [cols] = await c.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'historial_insulina' AND COLUMN_NAME = 'dosis_total_u'
  `, [cfg.database]);

  if (cols.length === 0) {
    await c.query(`
      ALTER TABLE historial_insulina
      ADD COLUMN dosis_total_u DECIMAL(7,2) NULL
        COMMENT 'DDT = dosis_prolongada_u + dosis_corta_u (UI/día)'
        AFTER dosis_corta_u
    `);
    console.log("✅ Columna dosis_total_u agregada");
  } else {
    console.log("ℹ️  Columna dosis_total_u ya existe, se omite ALTER");
  }

  // 2. Rellenar registros existentes donde ambos valores numéricos están presentes
  const [upd] = await c.query(`
    UPDATE historial_insulina
    SET dosis_total_u = ROUND(
          COALESCE(dosis_prolongada_u, 0) + COALESCE(dosis_corta_u, 0),
        2)
    WHERE dosis_total_u IS NULL
      AND (dosis_prolongada_u IS NOT NULL OR dosis_corta_u IS NOT NULL)
  `);
  console.log(`✅ Registros actualizados con DDT: ${upd.affectedRows} fila(s)`);

  await c.end();
  console.log("🎉 Migración completada.");
})().catch(e => { console.error("❌", e.message); process.exit(1); });
