// migrate_renaced_mexico.cjs
// Crea la base de datos renaced_mexico con el schema completo del sistema RENACED
// Basado en el análisis de renaced1test.sql (67 tablas originales en PHP/MariaDB)
// Ejecutar: node backend/migrate_renaced_mexico.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    multipleStatements: true,
  });

  const dbName = process.env.RENACED_MX_DB_NAME || "renaced_mexico";
  console.log(`\n🏥 Creando base de datos: ${dbName}`);

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${dbName}\``);

  // ════════════════════════════════════════════════════════════
  // CATÁLOGOS
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_tipo_diabetes (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave       VARCHAR(10)  NOT NULL UNIQUE,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_tipo_diabetes");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_tipo_diabetes_otras (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave       VARCHAR(10)  NOT NULL UNIQUE,
      descripcion VARCHAR(200) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_tipo_diabetes_otras");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_estado (
      clave       VARCHAR(2)   NOT NULL PRIMARY KEY,
      nombre      VARCHAR(100) NOT NULL,
      pais_codigo VARCHAR(5)   NOT NULL DEFAULT 'MX'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_estado");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_municipio (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      estado_cve  VARCHAR(2)   NOT NULL,
      clave       VARCHAR(5)   NOT NULL,
      nombre      VARCHAR(150) NOT NULL,
      INDEX idx_estado (estado_cve)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_municipio");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_pais (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave_iso   VARCHAR(5)   NOT NULL UNIQUE,
      nombre      VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_pais");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_nivel_educativo (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_nivel_educativo");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_nivel_ingreso (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_nivel_ingreso");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_institucion_ss (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      siglas      VARCHAR(20)  NOT NULL,
      nombre      VARCHAR(200) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_institucion_ss");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_terapia (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave       VARCHAR(20)  NOT NULL UNIQUE,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_terapia");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_terapia_gest (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_terapia_gest");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_insulina (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre      VARCHAR(100) NOT NULL,
      tipo        VARCHAR(50)  DEFAULT NULL,
      accion      VARCHAR(50)  DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_insulina");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_esquemas_insulinas (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(200) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_esquemas_insulinas");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_calculo_dosis_insulinas (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_calculo_dosis_insulinas");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_antidiabetico (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre      VARCHAR(100) NOT NULL,
      clase       VARCHAR(100) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_antidiabetico");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_dispositivo (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_dispositivo");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_microinfusora (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      marca       VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_microinfusora");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_sub_microinfusora (
      id               SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      microinfusora_id SMALLINT UNSIGNED NOT NULL,
      modelo           VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_sub_microinfusora");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_glucometro (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      marca       VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_glucometro");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_monit_glucosa (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_monit_glucosa");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_sub_monit_glucosa (
      id              SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      monit_glucosa_id SMALLINT UNSIGNED NOT NULL,
      marca           VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_sub_monit_glucosa");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_prueba_lab (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave       VARCHAR(20)  NOT NULL UNIQUE,
      nombre      VARCHAR(150) NOT NULL,
      unidad      VARCHAR(50)  DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_prueba_lab");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_retinopatia (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_retinopatia");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_nefropatia (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_nefropatia");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_neuropatia (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_neuropatia");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_neuropatia_autonomica (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_neuropatia_autonomica");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_pie_diabetico (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_pie_diabetico");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_enfermedad_cardiovascular_periferica (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_enfermedad_cardiovascular_periferica");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_enfermedad_vascular_periferica (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_enfermedad_vascular_periferica");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_paciente_estatus (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_paciente_estatus");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_paciente_causa_baja (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_paciente_causa_baja");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_causa_abandono_tratamiento (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_causa_abandono_tratamiento");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_causa_cambio_tx (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(150) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_causa_cambio_tx");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_tipo_recurso_humano (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_tipo_recurso_humano");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cat_periodo (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      descripcion VARCHAR(50)  NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ cat_periodo");

  // ════════════════════════════════════════════════════════════
  // ESTRUCTURA ORGANIZACIONAL
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS establecimiento_salud (
      clave           VARCHAR(15)  NOT NULL PRIMARY KEY,
      nombre          VARCHAR(200) NOT NULL,
      institucion_id  SMALLINT UNSIGNED DEFAULT NULL,
      estado_cve      VARCHAR(2)   DEFAULT NULL,
      municipio_cve   VARCHAR(5)   DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ establecimiento_salud");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS unidad_servicio_salud (
      id              SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre          VARCHAR(200) NOT NULL,
      establecimiento_cve VARCHAR(15) DEFAULT NULL,
      activo          TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ unidad_servicio_salud");

  // ════════════════════════════════════════════════════════════
  // USUARIOS Y PERMISOS
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS perfil (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre      VARCHAR(50)  NOT NULL,
      nivel       TINYINT UNSIGNED NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ perfil");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS recurso_humano (
      curp        VARCHAR(18)  NOT NULL PRIMARY KEY,
      nombre      VARCHAR(50)  NOT NULL,
      ap_pat      VARCHAR(50)  NOT NULL,
      ap_mat      VARCHAR(50)  DEFAULT NULL,
      tipo_id     SMALLINT UNSIGNED DEFAULT NULL,
      especialidad VARCHAR(100) DEFAULT NULL,
      cedula      VARCHAR(20)  DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ recurso_humano");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS medico (
      curp              VARCHAR(18)  NOT NULL PRIMARY KEY,
      nombre            VARCHAR(50)  NOT NULL,
      ap_pat            VARCHAR(50)  NOT NULL,
      ap_mat            VARCHAR(50)  DEFAULT NULL,
      especialidad      VARCHAR(100) DEFAULT NULL,
      cedula_prof       VARCHAR(20)  DEFAULT NULL,
      cedula_esp        VARCHAR(20)  DEFAULT NULL,
      unidad_servicio_id SMALLINT UNSIGNED DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ medico");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS usuario (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username        VARCHAR(50)  NOT NULL UNIQUE,
      password_hash   VARCHAR(255) NOT NULL,
      nombre_completo VARCHAR(150) DEFAULT NULL,
      email           VARCHAR(150) DEFAULT NULL,
      perfil_id       SMALLINT UNSIGNED DEFAULT NULL,
      recurso_humano_curp VARCHAR(18) DEFAULT NULL,
      unidad_servicio_id  SMALLINT UNSIGNED DEFAULT NULL,
      vigencia        DATE DEFAULT NULL,
      activo          TINYINT(1) NOT NULL DEFAULT 1,
      fecha_alta      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ultimo_acceso   DATETIME DEFAULT NULL,
      INDEX idx_perfil (perfil_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ usuario");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS modulo (
      id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave       VARCHAR(50)  NOT NULL UNIQUE,
      nombre      VARCHAR(100) NOT NULL,
      icono       VARCHAR(50)  DEFAULT NULL,
      ruta        VARCHAR(200) DEFAULT NULL,
      orden       TINYINT UNSIGNED DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ modulo");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS permiso (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      perfil_id   SMALLINT UNSIGNED NOT NULL,
      modulo_id   SMALLINT UNSIGNED NOT NULL,
      puede_ver   TINYINT(1) NOT NULL DEFAULT 0,
      puede_crear TINYINT(1) NOT NULL DEFAULT 0,
      puede_editar TINYINT(1) NOT NULL DEFAULT 0,
      puede_eliminar TINYINT(1) NOT NULL DEFAULT 0,
      puede_exportar TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY uk_perfil_modulo (perfil_id, modulo_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ permiso");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS reporte (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      clave       VARCHAR(50)  NOT NULL UNIQUE,
      nombre      VARCHAR(150) NOT NULL,
      perfil_minimo SMALLINT UNSIGNED DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ reporte");

  // ════════════════════════════════════════════════════════════
  // PACIENTES
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS paciente (
      id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      expediente          VARCHAR(50)  DEFAULT NULL,
      iniciales           VARCHAR(20)  DEFAULT NULL,
      nombre              VARCHAR(100) NOT NULL,
      ap_pat              VARCHAR(100) NOT NULL,
      ap_mat              VARCHAR(100) DEFAULT NULL,
      sexo                CHAR(1)      NOT NULL,
      fecha_nacimiento    DATE         DEFAULT NULL,
      curp                VARCHAR(18)  DEFAULT NULL UNIQUE,
      estado_nacimiento   VARCHAR(2)   DEFAULT NULL,
      municipio_nacimiento VARCHAR(5)  DEFAULT NULL,
      pais_nacimiento_id  SMALLINT UNSIGNED DEFAULT NULL,
      nivel_ingresos_id   SMALLINT UNSIGNED DEFAULT NULL,
      nivel_educativo_id  SMALLINT UNSIGNED DEFAULT NULL,
      estado_residencia   VARCHAR(2)   DEFAULT NULL,
      municipio_residencia VARCHAR(5)  DEFAULT NULL,
      colonia             VARCHAR(100) DEFAULT NULL,
      calle_num           VARCHAR(250) DEFAULT NULL,
      codigo_postal       VARCHAR(10)  DEFAULT NULL,
      telefonos           VARCHAR(100) DEFAULT NULL,
      email               VARCHAR(150) DEFAULT NULL,
      seguro_medico_id    SMALLINT UNSIGNED DEFAULT NULL,
      establecimiento_cve VARCHAR(15)  DEFAULT NULL,
      unidad_servicio_id  SMALLINT UNSIGNED DEFAULT NULL,
      tiene_aviso_privacidad  TINYINT(1) NOT NULL DEFAULT 0,
      aviso_ruta          VARCHAR(255) DEFAULT NULL,
      tiene_consentimiento    TINYINT(1) NOT NULL DEFAULT 0,
      consentimiento_ruta VARCHAR(255) DEFAULT NULL,
      estatus_id          SMALLINT UNSIGNED DEFAULT NULL,
      fecha_alta          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      defuncion_folio     VARCHAR(20)  DEFAULT NULL,
      defuncion_fecha     DATE         DEFAULT NULL,
      defuncion_causa     TEXT         DEFAULT NULL,
      INDEX idx_curp      (curp),
      INDEX idx_unidad    (unidad_servicio_id),
      INDEX idx_estatus   (estatus_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ paciente");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS paciente_cambio_estatus (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      estatus_anterior_id SMALLINT UNSIGNED DEFAULT NULL,
      estatus_nuevo_id    SMALLINT UNSIGNED DEFAULT NULL,
      causa_baja_id   SMALLINT UNSIGNED DEFAULT NULL,
      observacion     TEXT     DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ paciente_cambio_estatus");

  // ════════════════════════════════════════════════════════════
  // DIAGNÓSTICO
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS diagnostico (
      id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id         BIGINT UNSIGNED NOT NULL,
      tipo_diabetes_id    SMALLINT UNSIGNED DEFAULT NULL,
      tipo_diabetes_otra_id SMALLINT UNSIGNED DEFAULT NULL,
      tipo_diabetes_desc  VARCHAR(200) DEFAULT NULL,
      fecha_diagnostico   DATE         DEFAULT NULL,
      edad_diagnostico    SMALLINT UNSIGNED DEFAULT NULL,
      criterio_dx         VARCHAR(200) DEFAULT NULL,
      usuario_id          INT UNSIGNED DEFAULT NULL,
      fecha_captura       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ diagnostico");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS reclasificacion (
      id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id         BIGINT UNSIGNED NOT NULL,
      tipo_diabetes_anterior_id SMALLINT UNSIGNED DEFAULT NULL,
      tipo_diabetes_nuevo_id    SMALLINT UNSIGNED DEFAULT NULL,
      motivo              TEXT DEFAULT NULL,
      usuario_id          INT UNSIGNED DEFAULT NULL,
      fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ reclasificacion");

  // ════════════════════════════════════════════════════════════
  // CONSULTAS Y SEGUIMIENTO
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS consulta (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      medico_curp     VARCHAR(18) NOT NULL,
      fecha_consulta  DATE        NOT NULL,
      peso            DECIMAL(5,2) DEFAULT NULL,
      estatura        DECIMAL(4,2) DEFAULT NULL,
      imc             DECIMAL(5,2) DEFAULT NULL,
      percentil       VARCHAR(20)  DEFAULT NULL,
      cintura         DECIMAL(5,2) DEFAULT NULL,
      cadera          DECIMAL(5,2) DEFAULT NULL,
      indice_cc       DECIMAL(5,2) DEFAULT NULL,
      pa_sistolica    SMALLINT UNSIGNED DEFAULT NULL,
      pa_diastolica   SMALLINT UNSIGNED DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id),
      INDEX idx_fecha     (fecha_consulta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ consulta");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS evaluacion (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      consulta_id     BIGINT UNSIGNED DEFAULT NULL,
      fecha_evaluacion DATE NOT NULL,
      retinopatia_id  SMALLINT UNSIGNED DEFAULT NULL,
      nefropatia_id   SMALLINT UNSIGNED DEFAULT NULL,
      neuropatia_id   SMALLINT UNSIGNED DEFAULT NULL,
      neuropatia_autonomica_id SMALLINT UNSIGNED DEFAULT NULL,
      pie_diabetico_id SMALLINT UNSIGNED DEFAULT NULL,
      enf_cardiovascular_id SMALLINT UNSIGNED DEFAULT NULL,
      enf_vascular_id SMALLINT UNSIGNED DEFAULT NULL,
      observaciones   TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ evaluacion");

  // ════════════════════════════════════════════════════════════
  // LABORATORIO
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS laboratorio (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      consulta_id     BIGINT UNSIGNED DEFAULT NULL,
      fecha_muestra   DATE NOT NULL,
      hba1c           DECIMAL(5,2) DEFAULT NULL,
      glucosa_ayuno   DECIMAL(7,2) DEFAULT NULL,
      glucosa_postprandial DECIMAL(7,2) DEFAULT NULL,
      colesterol_total DECIMAL(7,2) DEFAULT NULL,
      hdl             DECIMAL(7,2) DEFAULT NULL,
      ldl             DECIMAL(7,2) DEFAULT NULL,
      trigliceridos   DECIMAL(7,2) DEFAULT NULL,
      creatinina      DECIMAL(7,3) DEFAULT NULL,
      tasa_filtracion DECIMAL(7,2) DEFAULT NULL,
      microalbuminuria DECIMAL(9,2) DEFAULT NULL,
      tsh             DECIMAL(8,3) DEFAULT NULL,
      c_peptido       DECIMAL(7,3) DEFAULT NULL,
      anti_gad        DECIMAL(9,2) DEFAULT NULL,
      anti_ia2        DECIMAL(9,2) DEFAULT NULL,
      insulinemia     DECIMAL(8,2) DEFAULT NULL,
      observaciones   TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id),
      INDEX idx_fecha     (fecha_muestra)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ laboratorio");

  // ════════════════════════════════════════════════════════════
  // TRATAMIENTOS
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tratamiento (
      id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id         BIGINT UNSIGNED NOT NULL,
      terapia_id          SMALLINT UNSIGNED DEFAULT NULL,
      esquema_insulina_id SMALLINT UNSIGNED DEFAULT NULL,
      calculo_dosis_id    SMALLINT UNSIGNED DEFAULT NULL,
      dispositivo_id      SMALLINT UNSIGNED DEFAULT NULL,
      microinfusora_id    SMALLINT UNSIGNED DEFAULT NULL,
      sub_microinfusora_id SMALLINT UNSIGNED DEFAULT NULL,
      monit_glucosa_id    SMALLINT UNSIGNED DEFAULT NULL,
      sub_monit_glucosa_id SMALLINT UNSIGNED DEFAULT NULL,
      glucometro_id       SMALLINT UNSIGNED DEFAULT NULL,
      fecha_inicio        DATE         DEFAULT NULL,
      activo              TINYINT(1) NOT NULL DEFAULT 1,
      usuario_id          INT UNSIGNED DEFAULT NULL,
      fecha_captura       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ tratamiento");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tratamiento_insulina_detalle (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tratamiento_id  BIGINT UNSIGNED NOT NULL,
      insulina_id     SMALLINT UNSIGNED NOT NULL,
      dosis_unidades  DECIMAL(6,2) DEFAULT NULL,
      frecuencia      VARCHAR(50)  DEFAULT NULL,
      momento         VARCHAR(50)  DEFAULT NULL,
      INDEX idx_trat  (tratamiento_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ tratamiento_insulina_detalle");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tratamiento_hist_dosis (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tratamiento_id  BIGINT UNSIGNED NOT NULL,
      insulina_id     SMALLINT UNSIGNED DEFAULT NULL,
      dosis_anterior  DECIMAL(6,2) DEFAULT NULL,
      dosis_nueva     DECIMAL(6,2) DEFAULT NULL,
      motivo          TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_trat  (tratamiento_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ tratamiento_hist_dosis");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tratamiento_oral (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      antidiabetico_id SMALLINT UNSIGNED NOT NULL,
      dosis_mg        DECIMAL(7,2) DEFAULT NULL,
      frecuencia      VARCHAR(50)  DEFAULT NULL,
      fecha_inicio    DATE         DEFAULT NULL,
      fecha_fin       DATE         DEFAULT NULL,
      causa_cambio_id SMALLINT UNSIGNED DEFAULT NULL,
      activo          TINYINT(1) NOT NULL DEFAULT 1,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ tratamiento_oral");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tratamiento_otx (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      descripcion     VARCHAR(200) NOT NULL,
      dosis           VARCHAR(100) DEFAULT NULL,
      fecha_inicio    DATE DEFAULT NULL,
      fecha_fin       DATE DEFAULT NULL,
      activo          TINYINT(1) NOT NULL DEFAULT 1,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ tratamiento_otx");

  // ════════════════════════════════════════════════════════════
  // MONITOREO DE GLUCOSA
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS monitoreo (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      consulta_id     BIGINT UNSIGNED DEFAULT NULL,
      fecha           DATE NOT NULL,
      hora            TIME DEFAULT NULL,
      glucosa         DECIMAL(7,2) NOT NULL,
      momento         VARCHAR(50)  DEFAULT NULL,
      tipo_medicion   VARCHAR(50)  DEFAULT NULL,
      observacion     TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id),
      INDEX idx_fecha     (fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ monitoreo");

  // ════════════════════════════════════════════════════════════
  // ANTECEDENTES Y ESTILO DE VIDA
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS antecedentes_go (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL UNIQUE,
      menarca         SMALLINT UNSIGNED DEFAULT NULL,
      fum             DATE DEFAULT NULL,
      visa            CHAR(2) DEFAULT NULL,
      mac             CHAR(2) DEFAULT NULL,
      menopausia      CHAR(2) DEFAULT NULL,
      menopausia_fecha DATE DEFAULT NULL,
      tipo_menopausia VARCHAR(20) DEFAULT NULL,
      trh             CHAR(2) DEFAULT NULL,
      peso_4000       CHAR(2) DEFAULT NULL,
      observaciones   TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ antecedentes_go");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS antecedente_embarazo (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      num_embarazo    TINYINT UNSIGNED NOT NULL,
      desenlace       CHAR(1) DEFAULT NULL,
      fecha           DATE DEFAULT NULL,
      con_diabetes    CHAR(2) DEFAULT NULL,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ antecedente_embarazo");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS estilovida (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      consulta_id     BIGINT UNSIGNED DEFAULT NULL,
      tabaquismo      CHAR(2) DEFAULT NULL,
      cigarros_dia    SMALLINT UNSIGNED DEFAULT NULL,
      anios_tabaquismo SMALLINT UNSIGNED DEFAULT NULL,
      alcoholismo     CHAR(2) DEFAULT NULL,
      frecuencia_alcohol VARCHAR(50) DEFAULT NULL,
      actividad_fisica CHAR(2) DEFAULT NULL,
      tipo_actividad  VARCHAR(100) DEFAULT NULL,
      minutos_semana  SMALLINT UNSIGNED DEFAULT NULL,
      dieta_especial  CHAR(2) DEFAULT NULL,
      tipo_dieta      VARCHAR(100) DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ estilovida");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS toxicomanias (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL UNIQUE,
      tabaco          CHAR(2) DEFAULT NULL,
      alcohol         CHAR(2) DEFAULT NULL,
      drogas          CHAR(2) DEFAULT NULL,
      observaciones   TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ toxicomanias");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS patologia (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      nombre          VARCHAR(200) NOT NULL,
      cie10           VARCHAR(10)  DEFAULT NULL,
      fecha_dx        DATE DEFAULT NULL,
      activa          TINYINT(1) NOT NULL DEFAULT 1,
      observaciones   TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ patologia");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS ccronica (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      nombre          VARCHAR(200) NOT NULL,
      fecha_dx        DATE DEFAULT NULL,
      activa          TINYINT(1) NOT NULL DEFAULT 1,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ ccronica");

  // ════════════════════════════════════════════════════════════
  // EMBARAZO CON DIABETES
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS embarazo (
      id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id         BIGINT UNSIGNED NOT NULL,
      num_gesta           TINYINT UNSIGNED DEFAULT NULL,
      fecha_ultima_mens   DATE DEFAULT NULL,
      fecha_probable_parto DATE DEFAULT NULL,
      semanas_gestacion   SMALLINT UNSIGNED DEFAULT NULL,
      terapia_gest_id     SMALLINT UNSIGNED DEFAULT NULL,
      activo              TINYINT(1) NOT NULL DEFAULT 1,
      resultado           VARCHAR(50) DEFAULT NULL,
      fecha_parto         DATE DEFAULT NULL,
      observaciones       TEXT DEFAULT NULL,
      usuario_id          INT UNSIGNED DEFAULT NULL,
      fecha_captura       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ embarazo");

  // ════════════════════════════════════════════════════════════
  // EDUCACIÓN Y EVENTOS
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS educacion (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      fecha           DATE NOT NULL,
      tema            VARCHAR(200) NOT NULL,
      modalidad       VARCHAR(50)  DEFAULT NULL,
      duracion_min    SMALLINT UNSIGNED DEFAULT NULL,
      educador        VARCHAR(100) DEFAULT NULL,
      observaciones   TEXT DEFAULT NULL,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente (paciente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ educacion");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS evento (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      paciente_id     BIGINT UNSIGNED NOT NULL,
      tipo            VARCHAR(50)  NOT NULL,
      fecha           DATE NOT NULL,
      descripcion     TEXT DEFAULT NULL,
      gravedad        VARCHAR(20)  DEFAULT NULL,
      requirio_hospitalizacion TINYINT(1) DEFAULT 0,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      fecha_captura   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paciente  (paciente_id),
      INDEX idx_tipo      (tipo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ evento");

  // ════════════════════════════════════════════════════════════
  // AUDITORÍA LOCAL
  // ════════════════════════════════════════════════════════════

  await conn.query(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      usuario_id      INT UNSIGNED DEFAULT NULL,
      accion          VARCHAR(100) NOT NULL,
      tabla           VARCHAR(100) DEFAULT NULL,
      registro_id     BIGINT UNSIGNED DEFAULT NULL,
      datos_anteriores JSON DEFAULT NULL,
      datos_nuevos     JSON DEFAULT NULL,
      ip              VARCHAR(45)  DEFAULT NULL,
      fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario (usuario_id),
      INDEX idx_fecha   (fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ auditoria");

  await conn.end();
  console.log(`\n✅ Schema de ${dbName} creado exitosamente (${52} tablas).\n`);
  console.log("⚠️  Recuerda agregar al .env:");
  console.log(`   RENACED_MX_DB_NAME=${dbName}`);
  console.log("   MASTER_DB_NAME=alad_master\n");
}

migrate().catch((err) => {
  console.error("❌ Error en migración renaced_mexico:", err.message);
  process.exit(1);
});
