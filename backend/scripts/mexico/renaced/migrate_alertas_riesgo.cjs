// migrate_alertas_riesgo.cjs
// Tabla `alerta_riesgo` (un registro por paciente cuyo ÚLTIMO escaneo MCG es ALTO_RIESGO),
// mantenida automáticamente por triggers sobre `escaneo_mcg`. La campana de notificaciones
// la lee directo en vez de recorrer todos los pacientes en cada consulta.
//
//   node scripts/mexico/renaced/migrate_alertas_riesgo.cjs            (simulación)
//   node scripts/mexico/renaced/migrate_alertas_riesgo.cjs --aplicar  (crea tabla, procedimiento, triggers y llena)
// Bases: RENACED_DB_NAMES="renaced_mexico,..." o RENACED_MX_DB_NAME (por defecto renaced_mexico).
// Seguro de re-ejecutar. Mientras no se aplique, la campana usa la consulta anterior (más lenta).

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "..", ".env") });

const APLICAR = process.argv.includes("--aplicar");
const BASES = (process.env.RENACED_DB_NAMES || process.env.RENACED_MX_DB_NAME || "renaced_mexico")
  .split(",").map((s) => s.trim()).filter(Boolean);

const DDL = [
  `CREATE TABLE IF NOT EXISTS alerta_riesgo (
     paciente_id INT UNSIGNED NOT NULL PRIMARY KEY,
     escaneo_id  INT UNSIGNED NOT NULL,
     fecha       DATE         NOT NULL,
     tir         DECIMAL(5,1) DEFAULT NULL,
     tbr         DECIMAL(5,1) DEFAULT NULL,
     INDEX idx_fecha (fecha)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `DROP PROCEDURE IF EXISTS sp_refrescar_alerta_riesgo`,
  `CREATE PROCEDURE sp_refrescar_alerta_riesgo(IN pid INT UNSIGNED)
   BEGIN
     DELETE FROM alerta_riesgo WHERE paciente_id = pid;
     INSERT INTO alerta_riesgo (paciente_id, escaneo_id, fecha, tir, tbr)
       SELECT x.paciente_id, x.id, x.fecha, x.tir, x.tbr
         FROM (SELECT paciente_id, id, fecha, tir, tbr, clasificacion
                 FROM escaneo_mcg WHERE paciente_id = pid
                ORDER BY fecha DESC, id DESC LIMIT 1) x
        WHERE x.clasificacion = 'ALTO_RIESGO';
   END`,
  `DROP TRIGGER IF EXISTS trg_alerta_riesgo_ins`,
  `CREATE TRIGGER trg_alerta_riesgo_ins AFTER INSERT ON escaneo_mcg FOR EACH ROW CALL sp_refrescar_alerta_riesgo(NEW.paciente_id)`,
  `DROP TRIGGER IF EXISTS trg_alerta_riesgo_upd`,
  `CREATE TRIGGER trg_alerta_riesgo_upd AFTER UPDATE ON escaneo_mcg FOR EACH ROW CALL sp_refrescar_alerta_riesgo(NEW.paciente_id)`,
  `DROP TRIGGER IF EXISTS trg_alerta_riesgo_del`,
  `CREATE TRIGGER trg_alerta_riesgo_del AFTER DELETE ON escaneo_mcg FOR EACH ROW CALL sp_refrescar_alerta_riesgo(OLD.paciente_id)`,
  `DELETE FROM alerta_riesgo`,
  `INSERT INTO alerta_riesgo (paciente_id, escaneo_id, fecha, tir, tbr)
     SELECT e.paciente_id, e.id, e.fecha, e.tir, e.tbr
       FROM escaneo_mcg e
      WHERE e.clasificacion = 'ALTO_RIESGO'
        AND e.id = (SELECT e2.id FROM escaneo_mcg e2 WHERE e2.paciente_id = e.paciente_id
                     ORDER BY e2.fecha DESC, e2.id DESC LIMIT 1)`,
];

async function main() {
  console.log(APLICAR ? "\n⚙️  MODO APLICAR\n" : "\n🔍 SIMULACIÓN (agrega --aplicar)\n");
  for (const base of BASES) {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST, port: process.env.DB_PORT,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      database: base, connectTimeout: 60000,
    });
    console.log(`📦 ${base}`);
    const [[{ t }]] = await conn.query(
      "SELECT COUNT(*) t FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='escaneo_mcg'", [base]);
    if (!t) { console.log("   escaneo_mcg no existe (correr migrate_renaced_escaneo_mcg.cjs primero)"); await conn.end(); continue; }
    if (!APLICAR) { console.log("   se crearía: tabla alerta_riesgo, procedimiento, 3 triggers y carga inicial"); await conn.end(); continue; }
    for (const sql of DDL) await conn.query(sql);
    const [[{ n }]] = await conn.query("SELECT COUNT(*) n FROM alerta_riesgo");
    console.log(`   ✅ listo — ${n} paciente(s) en alto riesgo cargados`);
    await conn.end();
  }
}
main().catch((e) => { console.error("❌", e.message); process.exit(1); });
