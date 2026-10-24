/**
 * Migración: agrega columnas de Estadios de Tanner a la tabla consultas.
 *   tanner_mama         TINYINT (1-5)  — niñas: desarrollo mamario
 *   tanner_genitales    TINYINT (1-5)  — niños: desarrollo genital
 *   tanner_vello_pubico TINYINT (1-5)  — ambos sexos
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const columnas = [
    { nombre: "tanner_mama",            tipo: "TINYINT UNSIGNED" },
    { nombre: "tanner_genitales",       tipo: "TINYINT UNSIGNED" },
    { nombre: "tanner_vello_pubico",    tipo: "TINYINT UNSIGNED" },
    { nombre: "tanner_observaciones",   tipo: "TEXT" },
  ];

  for (const col of columnas) {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'consultas' AND COLUMN_NAME = ?`,
      [process.env.DB_NAME, col.nombre]
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE consultas ADD COLUMN ${col.nombre} ${col.tipo} NULL`);
      console.log(`✅  Columna "${col.nombre}" agregada.`);
    } else {
      console.log(`⏭️   Columna "${col.nombre}" ya existe — omitida.`);
    }
  }

  await pool.end();
  console.log("Migración Tanner completada.");
}

run().catch((err) => { console.error(err); process.exit(1); });
