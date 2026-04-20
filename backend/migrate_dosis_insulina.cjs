const mysql = require("mysql2/promise");
require("dotenv").config();

async function migrate() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "evolucion_metabolica",
  });

  const conn = await pool.getConnection();
  try {
    // Verificar y agregar columna dosis_insulina_prolongada
    const [cols1] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'dosis_insulina_prolongada'`
    );
    if (cols1.length === 0) {
      await conn.query(`ALTER TABLE pacientes ADD COLUMN dosis_insulina_prolongada VARCHAR(100) NULL AFTER tipo_insulina`);
      console.log("✅ Columna dosis_insulina_prolongada agregada.");
    } else {
      console.log("ℹ️  dosis_insulina_prolongada ya existe.");
    }

    // Verificar y agregar columna dosis_insulina_corta
    const [cols2] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'dosis_insulina_corta'`
    );
    if (cols2.length === 0) {
      await conn.query(`ALTER TABLE pacientes ADD COLUMN dosis_insulina_corta VARCHAR(100) NULL AFTER tipo_insulina_2`);
      console.log("✅ Columna dosis_insulina_corta agregada.");
    } else {
      console.log("ℹ️  dosis_insulina_corta ya existe.");
    }
  } catch (err) {
    console.error("❌ Error en migración:", err.message);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();
