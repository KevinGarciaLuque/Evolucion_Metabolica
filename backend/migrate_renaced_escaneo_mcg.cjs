// migrate_renaced_escaneo_mcg.cjs
// Crea la tabla `escaneo_mcg` en las bases de datos RENACED (por país / tenant).
// Guarda el resultado de escanear un reporte PDF de monitoreo continuo de glucosa
// (AGP FreeStyle Libre, Syai X1, etc.) de forma independiente al expediente.
//
// Ejecutar:  node migrate_renaced_escaneo_mcg.cjs
//
// Bases de datos: por defecto `renaced_mexico`. Para correr sobre varias,
// definir  RENACED_DB_NAMES="renaced_mexico,renaced_honduras"  en el .env

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const BASES = (process.env.RENACED_DB_NAMES ||
  process.env.RENACED_MX_DB_NAME ||
  "renaced_mexico")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CFG_BASE = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectTimeout: 60000,
};

const DDL = `
CREATE TABLE IF NOT EXISTS escaneo_mcg (
  id                    INT UNSIGNED    NOT NULL,
  paciente_id           INT UNSIGNED    NOT NULL,
  numero_registro       INT UNSIGNED    DEFAULT NULL,
  fecha                 DATE            NOT NULL,
  monitor               VARCHAR(60)     DEFAULT NULL,
  periodo_dias          INT             DEFAULT NULL,
  periodo_tipo          VARCHAR(8)      DEFAULT NULL,
  fecha_inicio          DATE            DEFAULT NULL,
  fecha_fin             DATE            DEFAULT NULL,
  glucosa_promedio      DECIMAL(6,1)    DEFAULT NULL,
  gmi                   DECIMAL(4,1)    DEFAULT NULL,
  cv                    DECIMAL(5,1)    DEFAULT NULL,
  desv_std              DECIMAL(6,1)    DEFAULT NULL,
  tiempo_activo         DECIMAL(5,1)    DEFAULT NULL,
  escaneos_dia          DECIMAL(5,1)    DEFAULT NULL,
  tir                   DECIMAL(5,1)    DEFAULT NULL,
  tar                   DECIMAL(5,1)    DEFAULT NULL,
  tar_muy_alto          DECIMAL(5,1)    DEFAULT NULL,
  tar_alto              DECIMAL(5,1)    DEFAULT NULL,
  tbr                   DECIMAL(5,1)    DEFAULT NULL,
  tbr_bajo              DECIMAL(5,1)    DEFAULT NULL,
  tbr_muy_bajo          DECIMAL(5,1)    DEFAULT NULL,
  gri                   DECIMAL(5,1)    DEFAULT NULL,
  eventos_hipoglucemia  INT             DEFAULT NULL,
  duracion_hipoglucemia INT             DEFAULT NULL,
  clasificacion         VARCHAR(20)     DEFAULT NULL,
  archivo_pdf           VARCHAR(255)    DEFAULT NULL,
  texto_extraido        TEXT            DEFAULT NULL,
  comentarios           TEXT            DEFAULT NULL,
  creado_en             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_escaneo_mcg_paciente (paciente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function run() {
  for (const database of BASES) {
    console.log(`\n🔄  Conectando a ${database}…`);
    let conn;
    try {
      conn = await mysql.createConnection({ ...CFG_BASE, database });
    } catch (e) {
      console.error(`   ⚠️  No se pudo conectar a ${database}: ${e.message}`);
      continue;
    }
    await conn.query(DDL);
    const [[{ n }]] = await conn.query(
      "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='escaneo_mcg'",
      [database]
    );
    console.log(n > 0 ? `   ✅ escaneo_mcg lista en ${database}` : `   ❌ no se creó en ${database}`);
    await conn.end();
  }
  console.log("\n✅ Migración completada.\n");
}

run().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
