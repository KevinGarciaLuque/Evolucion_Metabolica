// migrate_master.cjs
// Crea la base de datos alad_master con la tabla de tenants (países ALAD)
// Ejecutar: node backend/migrate_master.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const masterDB = process.env.MASTER_DB_NAME || "alad_master";
  console.log(`\n🌎 Creando base de datos maestra: ${masterDB}`);

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${masterDB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${masterDB}\``);

  // ─── Tabla de países / tenants ───────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre        VARCHAR(100)  NOT NULL,
      codigo        VARCHAR(10)   NOT NULL UNIQUE,   -- 'mx', 'hn', 'co'
      subdominio    VARCHAR(150)  DEFAULT NULL,       -- 'mexico.alad.org'
      db_name       VARCHAR(100)  NOT NULL,           -- 'renaced_mexico'
      db_host       VARCHAR(255)  NOT NULL DEFAULT 'localhost',
      activo        TINYINT(1)    NOT NULL DEFAULT 1,
      modulos       JSON          DEFAULT NULL,       -- módulos habilitados
      configuracion JSON          DEFAULT NULL,       -- logo, colores, campos extra
      fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ Tabla tenants");

  // ─── Tabla de usuarios Super Admin ───────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre        VARCHAR(100)  NOT NULL,
      email         VARCHAR(150)  NOT NULL UNIQUE,
      password_hash VARCHAR(255)  NOT NULL,
      activo        TINYINT(1)    NOT NULL DEFAULT 1,
      ultimo_acceso DATETIME      DEFAULT NULL,
      fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ Tabla super_admins");

  // ─── Tabla de auditoría global ────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS auditoria_global (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT UNSIGNED    DEFAULT NULL,
      usuario_id    INT UNSIGNED    DEFAULT NULL,
      rol           VARCHAR(50)     DEFAULT NULL,
      accion        VARCHAR(100)    NOT NULL,
      detalle       TEXT            DEFAULT NULL,
      ip            VARCHAR(45)     DEFAULT NULL,
      fecha         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_fecha  (fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("  ✅ Tabla auditoria_global");

  // ─── Insertar México como primer tenant ───────────────────────────────────────
  const [existing] = await conn.query(`SELECT id FROM tenants WHERE codigo = 'mx'`);
  if (existing.length === 0) {
    await conn.query(`
      INSERT INTO tenants (nombre, codigo, subdominio, db_name, modulos, configuracion) VALUES (
        'México',
        'mx',
        'mexico.alad.org',
        'renaced_mexico',
        JSON_ARRAY('renaced', 'evolucion_metabolica'),
        JSON_OBJECT('pais', 'México', 'bandera', '🇲🇽', 'moneda', 'MXN', 'zona_horaria', 'America/Mexico_City')
      )
    `);
    console.log("  ✅ Tenant México insertado (id: 1)");
  } else {
    console.log("  ℹ️  Tenant México ya existe");
  }

  await conn.end();
  console.log("\n✅ Base de datos maestra lista.\n");
}

migrate().catch((err) => {
  console.error("❌ Error en migración master:", err.message);
  process.exit(1);
});
