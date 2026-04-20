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
    // Verificar si la columna ya existe
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'sexo'`
    );
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE usuarios ADD COLUMN sexo ENUM('M', 'F') DEFAULT NULL`);
      console.log("✅ Columna 'sexo' agregada a la tabla usuarios");
    } else {
      console.log("ℹ️  La columna 'sexo' ya existe");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

run();
