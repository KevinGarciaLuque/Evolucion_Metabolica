const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });
  try {
    // Verificar si la columna ya existe antes de agregarla
    const [cols] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'con_monitor'",
      [process.env.DB_NAME]
    );
    if (cols.length === 0) {
      await conn.execute(
        "ALTER TABLE pacientes ADD COLUMN con_monitor TINYINT(1) NOT NULL DEFAULT 0"
      );
      console.log("✅ Columna con_monitor agregada correctamente");
    } else {
      console.log("ℹ️  La columna con_monitor ya existe");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await conn.end();
  }
})();
