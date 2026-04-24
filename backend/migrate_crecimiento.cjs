// migrate_crecimiento.cjs
// Crea la tabla historial_crecimiento para el módulo de Curvas de Crecimiento OMS
const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "evolucion_metabolica",
    port:     Number(process.env.DB_PORT || 3306),
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS historial_crecimiento (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id     INT NOT NULL,
      fecha           DATE NOT NULL,
      peso_kg         DECIMAL(6,3)  DEFAULT NULL,
      talla_cm        DECIMAL(6,2)  DEFAULT NULL,
      imc             DECIMAL(5,2)  DEFAULT NULL,
      pc_cm           DECIMAL(5,2)  DEFAULT NULL,
      edad_meses      SMALLINT      DEFAULT NULL,
      zscore_peso_edad    DECIMAL(5,2) DEFAULT NULL,
      zscore_talla_edad   DECIMAL(5,2) DEFAULT NULL,
      zscore_imc_edad     DECIMAL(5,2) DEFAULT NULL,
      zscore_pc_edad      DECIMAL(5,2) DEFAULT NULL,
      estado_peso_edad    VARCHAR(60)  DEFAULT NULL,
      estado_talla_edad   VARCHAR(60)  DEFAULT NULL,
      estado_imc_edad     VARCHAR(60)  DEFAULT NULL,
      estado_pc_edad      VARCHAR(60)  DEFAULT NULL,
      observaciones   TEXT          DEFAULT NULL,
      creado_en       DATETIME      DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      INDEX idx_pac_fecha (paciente_id, fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("✅ Tabla historial_crecimiento creada (o ya existía).");
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
