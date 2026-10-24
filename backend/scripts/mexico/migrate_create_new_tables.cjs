// migrate_create_new_tables.cjs
// Crea las tablas faltantes en renaced_mexico (no destructivo — usa IF NOT EXISTS)
// Ejecutar: node migrate_create_new_tables.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG = {
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
  multipleStatements: true,
};

const SQL = `
-- ── 1. COMORBILIDADES CRÓNICAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comorbilidad (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id            BIGINT UNSIGNED NOT NULL UNIQUE,
  retinopatia            VARCHAR(2)  DEFAULT 'NO',
  retinopatia_fecha      DATE        DEFAULT NULL,
  retinopatia_tipo       TINYINT     DEFAULT NULL COMMENT '1=No proliferativa 2=Proliferativa 3=Macular',
  retinopatia_laser      VARCHAR(2)  DEFAULT NULL,
  nefropatia             VARCHAR(2)  DEFAULT 'NO',
  nefropatia_fecha       DATE        DEFAULT NULL,
  nefropatia_tipo        TINYINT     DEFAULT NULL COMMENT '1=Microalb 2=Macroalb 3=IRC',
  neuropatia             VARCHAR(2)  DEFAULT 'NO',
  neuropatia_fecha       DATE        DEFAULT NULL,
  neuropatia_tipo        TINYINT     DEFAULT NULL COMMENT '1=Periferica 2=Autonomica',
  neuropatia_auto_tipo   TINYINT     DEFAULT NULL,
  vascular_perif         VARCHAR(2)  DEFAULT 'NO',
  vascular_perif_fecha   DATE        DEFAULT NULL,
  vascular_perif_tipo    TINYINT     DEFAULT NULL,
  cardiovascular         VARCHAR(2)  DEFAULT 'NO',
  cardiovascular_fecha   DATE        DEFAULT NULL,
  cardiovascular_tipo    TINYINT     DEFAULT NULL,
  pie_diabetico          VARCHAR(2)  DEFAULT 'NO',
  pie_diabetico_fecha    DATE        DEFAULT NULL,
  pie_diabetico_tipo     TINYINT     DEFAULT NULL,
  fecha_captura          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. PATOLOGÍAS ASOCIADAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patologia (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id            BIGINT UNSIGNED NOT NULL UNIQUE,
  hipotiroidismo         VARCHAR(2)  DEFAULT NULL,
  hipotiroidismo_anio    SMALLINT    DEFAULT NULL,
  e_celiaca              VARCHAR(2)  DEFAULT NULL,
  e_celiaca_anio         SMALLINT    DEFAULT NULL,
  e_addison              VARCHAR(2)  DEFAULT NULL,
  e_addison_anio         SMALLINT    DEFAULT NULL,
  vitiligo               VARCHAR(2)  DEFAULT NULL,
  vitiligo_anio          SMALLINT    DEFAULT NULL,
  e_graves               VARCHAR(2)  DEFAULT NULL,
  e_graves_anio          SMALLINT    DEFAULT NULL,
  hipertension           VARCHAR(2)  DEFAULT NULL,
  hipertension_anio      SMALLINT    DEFAULT NULL,
  dislipidemia           VARCHAR(2)  DEFAULT NULL,
  dislipidemia_anio      SMALLINT    DEFAULT NULL,
  hiperuricemia          VARCHAR(2)  DEFAULT NULL,
  hiperuricemia_anio     SMALLINT    DEFAULT NULL,
  gota                   VARCHAR(2)  DEFAULT NULL,
  gota_anio              SMALLINT    DEFAULT NULL,
  otras                  VARCHAR(500) DEFAULT NULL,
  fecha_captura          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. EVENTOS (hipoglucemia, cetoacidosis, hospitalización) ──────────────────
CREATE TABLE IF NOT EXISTS evento (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id               BIGINT UNSIGNED NOT NULL,
  hipo_leve                 VARCHAR(2)  DEFAULT NULL,
  hipo_leve_num             SMALLINT    DEFAULT NULL,
  hipo_severa               VARCHAR(2)  DEFAULT NULL,
  hipo_severa_fecha         DATE        DEFAULT NULL,
  hipo_severa_causa         VARCHAR(512) DEFAULT NULL,
  convulsiones              VARCHAR(2)  DEFAULT NULL,
  coma                      VARCHAR(2)  DEFAULT NULL,
  perd_conocimiento         VARCHAR(2)  DEFAULT NULL,
  glucagon_disp             VARCHAR(2)  DEFAULT NULL,
  glucagon_uso              VARCHAR(2)  DEFAULT NULL,
  cetoacidosis              VARCHAR(2)  DEFAULT NULL,
  cetoacidosis_fecha        DATE        DEFAULT NULL,
  cetoacidosis_causa        VARCHAR(512) DEFAULT NULL,
  hospitalizacion           VARCHAR(2)  DEFAULT NULL,
  hospitalizacion_fecha     DATE        DEFAULT NULL,
  hospitalizacion_dias      SMALLINT    DEFAULT NULL,
  hospitalizacion_causa     VARCHAR(512) DEFAULT NULL,
  fecha_captura             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id                INT         DEFAULT NULL,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. ESTILO DE VIDA ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estilovida (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id          BIGINT UNSIGNED NOT NULL,
  fecha_registro       DATE       NOT NULL,
  plan_alimentacion    VARCHAR(2) NOT NULL,
  plan_calorias        SMALLINT   DEFAULT NULL,
  ejercicio            VARCHAR(2) NOT NULL,
  min_ejer_semana      SMALLINT   DEFAULT NULL,
  conteo_chos          VARCHAR(2) NOT NULL,
  fecha_captura        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id           INT        DEFAULT NULL,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. TOXICOMANÍAS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS toxicomanias (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id          BIGINT UNSIGNED NOT NULL,
  fecha_registro       DATE       NOT NULL,
  tabaco               VARCHAR(2) NOT NULL DEFAULT 'NO',
  tabaco_num           SMALLINT   DEFAULT NULL,
  tabaco_periodo       SMALLINT   DEFAULT NULL,
  alcohol              VARCHAR(2) NOT NULL DEFAULT 'NO',
  alcohol_num          SMALLINT   DEFAULT NULL,
  alcohol_periodo      SMALLINT   DEFAULT NULL,
  marihuana            VARCHAR(2) NOT NULL DEFAULT 'NO',
  marihuana_num        SMALLINT   DEFAULT NULL,
  marihuana_periodo    SMALLINT   DEFAULT NULL,
  cocaina              VARCHAR(2) NOT NULL DEFAULT 'NO',
  cocaina_num          SMALLINT   DEFAULT NULL,
  cocaina_periodo      SMALLINT   DEFAULT NULL,
  crack                VARCHAR(2) NOT NULL DEFAULT 'NO',
  crack_num            SMALLINT   DEFAULT NULL,
  crack_periodo        SMALLINT   DEFAULT NULL,
  extasis              VARCHAR(2) NOT NULL DEFAULT 'NO',
  extasis_num          SMALLINT   DEFAULT NULL,
  extasis_periodo      SMALLINT   DEFAULT NULL,
  meta                 VARCHAR(2) NOT NULL DEFAULT 'NO',
  meta_num             SMALLINT   DEFAULT NULL,
  meta_periodo         SMALLINT   DEFAULT NULL,
  inhala               VARCHAR(2) NOT NULL DEFAULT 'NO',
  inhala_num           SMALLINT   DEFAULT NULL,
  inhala_periodo       SMALLINT   DEFAULT NULL,
  heroina              VARCHAR(2) NOT NULL DEFAULT 'NO',
  heroina_num          SMALLINT   DEFAULT NULL,
  heroina_periodo      SMALLINT   DEFAULT NULL,
  alucin               VARCHAR(2) NOT NULL DEFAULT 'NO',
  alucin_num           SMALLINT   DEFAULT NULL,
  alucin_periodo       SMALLINT   DEFAULT NULL,
  fecha_captura        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id           INT        DEFAULT NULL,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. RECLASIFICACIÓN DIAGNÓSTICA ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reclasificacion (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id          BIGINT UNSIGNED NOT NULL,
  glucosa_ayuno        SMALLINT   DEFAULT NULL,
  fecha_glucosa        DATE       DEFAULT NULL,
  insulina_ayuno       SMALLINT   DEFAULT NULL,
  fecha_insulina       DATE       DEFAULT NULL,
  hba1c                DECIMAL(5,2) DEFAULT NULL,
  fecha_hba1c          DATE       DEFAULT NULL,
  ctog_ayuno           SMALLINT   DEFAULT NULL,
  ctog_30min           SMALLINT   DEFAULT NULL,
  ctog_60min           SMALLINT   DEFAULT NULL,
  ctog_90min           SMALLINT   DEFAULT NULL,
  ctog_120min          SMALLINT   DEFAULT NULL,
  ctog_ayuno_insul     SMALLINT   DEFAULT NULL,
  ctog_30min_insul     SMALLINT   DEFAULT NULL,
  ctog_60min_insul     SMALLINT   DEFAULT NULL,
  ctog_90min_insul     SMALLINT   DEFAULT NULL,
  ctog_120min_insul    SMALLINT   DEFAULT NULL,
  fecha_ctog           DATE       DEFAULT NULL,
  resultado            VARCHAR(3) NOT NULL DEFAULT 'SI' COMMENT 'SI=reclasificado, NO=no',
  fecha_captura        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id           INT        DEFAULT NULL,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. EMBARAZO ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS embarazo (
  id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id                 BIGINT UNSIGNED NOT NULL,
  fecha_um                    DATE       DEFAULT NULL,
  fecha_pp                    DATE       DEFAULT NULL,
  tipo_embarazo               VARCHAR(10) DEFAULT NULL COMMENT 'UNICO|MULTIPLE',
  logro_embarazo              VARCHAR(15) DEFAULT NULL COMMENT 'ESPONTANEO|ASISTIDO',
  estatus_embarazo            VARCHAR(12) DEFAULT NULL COMMENT 'EN_CURSO|TERMINADO',
  -- Diagnóstico
  hba1c_dx                    DECIMAL(5,2) DEFAULT NULL,
  fecha_hba1c_dx              DATE       DEFAULT NULL,
  glucosa_ayunas              SMALLINT   DEFAULT NULL,
  glucosa_50gr                SMALLINT   DEFAULT NULL,
  ctog75_ayuno                SMALLINT   DEFAULT NULL,
  ctog75_1hr                  SMALLINT   DEFAULT NULL,
  ctog75_2hr                  SMALLINT   DEFAULT NULL,
  fecha_ctog75                DATE       DEFAULT NULL,
  ctog100_ayuno               SMALLINT   DEFAULT NULL,
  ctog100_1hr                 SMALLINT   DEFAULT NULL,
  ctog100_2hr                 SMALLINT   DEFAULT NULL,
  ctog100_3hr                 SMALLINT   DEFAULT NULL,
  fecha_ctog100               DATE       DEFAULT NULL,
  -- Complicaciones obstétricas
  hipertension                VARCHAR(2) DEFAULT NULL,
  preeclampsia                VARCHAR(2) DEFAULT NULL,
  eclampsia                   VARCHAR(2) DEFAULT NULL,
  hellp                       VARCHAR(2) DEFAULT NULL,
  oligohidramnios             VARCHAR(2) DEFAULT NULL,
  polihidramnios              VARCHAR(2) DEFAULT NULL,
  desprendimiento_placenta    VARCHAR(2) DEFAULT NULL,
  insuficiencia_placentaria   VARCHAR(2) DEFAULT NULL,
  placenta_previa             VARCHAR(2) DEFAULT NULL,
  placenta_acreta             VARCHAR(2) DEFAULT NULL,
  -- Desenlace
  semanas_gestacion           TINYINT    DEFAULT NULL,
  via_parto                   VARCHAR(10) DEFAULT NULL COMMENT 'VAGINAL|CESAREA',
  peso_rn                     DECIMAL(5,2) DEFAULT NULL COMMENT 'kg',
  macrosomia                  VARCHAR(2) DEFAULT NULL,
  hipoglucemia_rn             VARCHAR(2) DEFAULT NULL,
  sdr                         VARCHAR(2) DEFAULT NULL COMMENT 'Síndrome distres resp',
  ictericia                   VARCHAR(2) DEFAULT NULL,
  malformacion                VARCHAR(2) DEFAULT NULL,
  malformacion_desc           VARCHAR(300) DEFAULT NULL,
  obito                       VARCHAR(2) DEFAULT NULL,
  fecha_captura               TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id                  INT        DEFAULT NULL,
  FOREIGN KEY (paciente_id) REFERENCES paciente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 8. ANTECEDENTES GO (ya existe en DB, solo aseguramos los campos) ─────────
-- La tabla ya fue migrada con la estructura original. Sin cambios.
`;

async function run() {
  console.log("\n🔄  Conectando a renaced_mexico…");
  const conn = await mysql.createConnection(CFG);
  console.log(`   ✅ Conectado a ${CFG.database}\n`);

  try {
    await conn.query(SQL);
    console.log("✅  Todas las tablas creadas (o ya existían):");
    console.log("    - comorbilidad");
    console.log("    - patologia");
    console.log("    - evento");
    console.log("    - estilovida");
    console.log("    - toxicomanias");
    console.log("    - reclasificacion");
    console.log("    - embarazo");
    console.log("    - antecedentes_go (sin cambios)\n");
  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    await conn.end();
  }
}

run();
