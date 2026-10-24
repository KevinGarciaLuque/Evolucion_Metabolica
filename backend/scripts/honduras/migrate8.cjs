const mysql = require("mysql2/promise");

async function main() {
  const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123456789",
    database: "evolucion_metabolica",
  });

  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS historial_anticuerpos (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id   INT NOT NULL,
        fecha         DATE NOT NULL,
        iaa           VARCHAR(100) DEFAULT NULL COMMENT 'Anti-insulina (IAA)',
        anti_gad65    VARCHAR(100) DEFAULT NULL COMMENT 'Ácido glutámico descarboxilasa (Anti-GAD65)',
        anti_ia2      VARCHAR(100) DEFAULT NULL COMMENT 'Anti IA-2 (Tirosina Fosfatasa 2)',
        znt8          VARCHAR(100) DEFAULT NULL COMMENT 'Anticuerpo transportador de Zinc 8 (ZnT8)',
        ica           VARCHAR(100) DEFAULT NULL COMMENT 'Anticuerpos de células de islotes (ICA)',
        observaciones TEXT         DEFAULT NULL,
        elaborado_por VARCHAR(150) DEFAULT NULL,
        creado_en     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ Tabla historial_anticuerpos creada correctamente");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(console.error);
