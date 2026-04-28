/**
 * Migración: agrega fecha_inicio_mcg y fecha_fin_mcg a la tabla analisis
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

(async () => {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
  });

  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'analisis'
         AND COLUMN_NAME IN ('fecha_inicio_mcg','fecha_fin_mcg')`,
      [process.env.DB_NAME]
    );
    const existentes = cols.map(c => c.COLUMN_NAME);

    if (!existentes.includes("fecha_inicio_mcg")) {
      await pool.query(
        `ALTER TABLE analisis ADD COLUMN fecha_inicio_mcg DATETIME NULL AFTER fecha_colocacion`
      );
      console.log("✅ Columna fecha_inicio_mcg agregada");
    } else {
      console.log("⏭  fecha_inicio_mcg ya existe");
    }

    if (!existentes.includes("fecha_fin_mcg")) {
      await pool.query(
        `ALTER TABLE analisis ADD COLUMN fecha_fin_mcg DATETIME NULL AFTER fecha_inicio_mcg`
      );
      console.log("✅ Columna fecha_fin_mcg agregada");
    } else {
      console.log("⏭  fecha_fin_mcg ya existe");
    }

    console.log("Migración completada.");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
})();
