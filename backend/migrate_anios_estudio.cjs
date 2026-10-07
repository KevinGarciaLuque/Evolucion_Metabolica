const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });
  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'anios_estudio'`
    );
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE paciente ADD COLUMN anios_estudio TINYINT UNSIGNED DEFAULT NULL AFTER nivel_educativo_id`);
      console.log("Columna 'anios_estudio' agregada a paciente");
    } else {
      console.log("La columna 'anios_estudio' ya existe");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

run();
