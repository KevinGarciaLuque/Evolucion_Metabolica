// migrate_crecimiento_prod.cjs — Crea la tabla en producción Railway
const mysql = require("mysql2/promise");

(async () => {
  const db = await mysql.createConnection({
    host:     "metro.proxy.rlwy.net",
    port:     35534,
    user:     "root",
    password: "MfZrJWHJcbyzUIbshhtDGuXQuvldatYt",
    database: "railway",
  });

  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log("✅ Tabla historial_crecimiento creada en produccion Railway.");
  await db.end();
})();
