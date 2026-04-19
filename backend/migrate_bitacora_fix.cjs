const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  const columnas = [
    ["tipo_consulta",    "VARCHAR(30) DEFAULT 'Presencial'"],
    ["peso",             "DECIMAL(5,1) NULL"],
    ["talla",            "DECIMAL(5,1) NULL"],
    ["glucosa_ayunas",   "DECIMAL(6,1) NULL"],
    ["hba1c",            "DECIMAL(4,2) NULL"],
    ["tension_arterial", "VARCHAR(20) NULL"],
    ["medicamentos",     "TEXT NULL"],
    ["observaciones",    "TEXT NULL"],
    ["plan_tratamiento", "TEXT NULL"],
    ["proxima_cita",     "DATE NULL"],
  ];

  const [existing] = await c.execute("DESCRIBE bitacora");
  const existingCols = existing.map((r) => r.Field);

  for (const [col, def] of columnas) {
    if (existingCols.includes(col)) {
      console.log(`⏭️  ${col} ya existe`);
      continue;
    }
    await c.execute(`ALTER TABLE bitacora ADD COLUMN ${col} ${def}`);
    console.log(`✅  ${col} agregada`);
  }

  await c.end();
  console.log("Migración completada");
})();
