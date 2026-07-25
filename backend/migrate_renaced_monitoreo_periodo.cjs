// migrate_renaced_monitoreo_periodo.cjs
// Migra la sección "Monitoreo" (origen: monitoreo) a una tabla NUEVA e independiente
// `monitoreo_periodo`, conservando el snapshot completo (dispositivo + métricas MCG/flash
// por periodo de 2 semanas y 3 meses). NO toca la tabla `monitoreo` existente.
// id = mon_cve (trazabilidad + inserción en lote).
// Ejecutar: node migrate_renaced_monitoreo_periodo.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1", dateStrings: true };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

const soloFecha = (v) => { if (!v) return null; const s = String(v); return s.length >= 10 ? s.slice(0, 10) : null; };
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const txt = (v) => { if (v === null || v === undefined) return null; const s = String(v).trim(); return s === "" ? null : s; };

async function tablaExiste(conn, db, t) {
  const [r] = await conn.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, t]);
  return r[0].n > 0;
}

async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ph = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    try { await conn.query(`${sql} ${ph}`, chunk.flat()); total += chunk.length; }
    catch (e) { for (const row of chunk) { try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); total++; } catch (__) {} } }
  }
  return total;
}

// Columnas destino en orden (deben coincidir con el orden del row construido abajo)
const DEST_COLS = [
  "id", "paciente_id", "fecha_registro", "fecha_captura",
  "automonitoreo", "automonitoreo_donde", "glucometro_id", "num_mediciones", "dsm",
  "cetonas", "cetonas_donde",
  "flash_libre", "flash_semanas", "flash_escaneos",
  "continuo", "continuo_marca", "continuo_sub", "continuo_semanas", "continuo_porcentaje",
  // periodo 2 semanas
  "glucosa_prom_2s", "tiempo_rango_2s", "tiempo_rango_obj_2s", "tiempo_rango_obj_emb_2s",
  "per_250_2s", "per_180_2s", "per_140_2s", "per_70_2s", "per_63_2s", "per_54_2s",
  "img_2s", "sensor_2s", "desv_std_2s", "cohef_var_2s",
  // periodo 3 meses
  "glucosa_prom_3m", "tiempo_rango_3m", "tiempo_rango_obj_3m", "tiempo_rango_obj_emb_3m",
  "per_250_3m", "per_180_3m", "per_140_3m", "per_70_3m", "per_63_3m", "per_54_3m",
  "img_3m", "sensor_3m", "desv_std_3m", "cohef_var_3m",
];

async function run() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  await o.query("SET time_zone='+00:00'");
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // 1) Crear tabla si no existe
  if (!(await tablaExiste(d, CFG_DESTINO.database, "monitoreo_periodo"))) {
    console.log("📦 Creando tabla monitoreo_periodo…");
    await d.query(`
      CREATE TABLE monitoreo_periodo (
        id BIGINT UNSIGNED NOT NULL,
        paciente_id BIGINT UNSIGNED NOT NULL,
        fecha_registro DATE DEFAULT NULL,
        fecha_captura DATETIME DEFAULT NULL,
        automonitoreo VARCHAR(4) DEFAULT NULL,
        automonitoreo_donde VARCHAR(255) DEFAULT NULL,
        glucometro_id SMALLINT UNSIGNED DEFAULT NULL,
        num_mediciones SMALLINT DEFAULT NULL,
        dsm VARCHAR(255) DEFAULT NULL,
        cetonas VARCHAR(4) DEFAULT NULL,
        cetonas_donde VARCHAR(255) DEFAULT NULL,
        flash_libre VARCHAR(4) DEFAULT NULL,
        flash_semanas TINYINT DEFAULT NULL,
        flash_escaneos TINYINT DEFAULT NULL,
        continuo VARCHAR(4) DEFAULT NULL,
        continuo_marca SMALLINT DEFAULT NULL,
        continuo_sub SMALLINT DEFAULT NULL,
        continuo_semanas SMALLINT DEFAULT NULL,
        continuo_porcentaje VARCHAR(20) DEFAULT NULL,
        glucosa_prom_2s SMALLINT DEFAULT NULL,
        tiempo_rango_2s DECIMAL(8,2) DEFAULT NULL,
        tiempo_rango_obj_2s DECIMAL(8,2) DEFAULT NULL,
        tiempo_rango_obj_emb_2s DECIMAL(8,2) DEFAULT NULL,
        per_250_2s DECIMAL(8,2) DEFAULT NULL,
        per_180_2s DECIMAL(8,2) DEFAULT NULL,
        per_140_2s DECIMAL(8,2) DEFAULT NULL,
        per_70_2s DECIMAL(8,2) DEFAULT NULL,
        per_63_2s DECIMAL(8,2) DEFAULT NULL,
        per_54_2s DECIMAL(8,2) DEFAULT NULL,
        img_2s DECIMAL(8,2) DEFAULT NULL,
        sensor_2s DECIMAL(8,2) DEFAULT NULL,
        desv_std_2s DECIMAL(8,2) DEFAULT NULL,
        cohef_var_2s DECIMAL(8,2) DEFAULT NULL,
        glucosa_prom_3m SMALLINT DEFAULT NULL,
        tiempo_rango_3m DECIMAL(8,2) DEFAULT NULL,
        tiempo_rango_obj_3m DECIMAL(8,2) DEFAULT NULL,
        tiempo_rango_obj_emb_3m DECIMAL(8,2) DEFAULT NULL,
        per_250_3m DECIMAL(8,2) DEFAULT NULL,
        per_180_3m DECIMAL(8,2) DEFAULT NULL,
        per_140_3m DECIMAL(8,2) DEFAULT NULL,
        per_70_3m DECIMAL(8,2) DEFAULT NULL,
        per_63_3m DECIMAL(8,2) DEFAULT NULL,
        per_54_3m DECIMAL(8,2) DEFAULT NULL,
        img_3m DECIMAL(8,2) DEFAULT NULL,
        sensor_3m DECIMAL(8,2) DEFAULT NULL,
        desv_std_3m DECIMAL(8,2) DEFAULT NULL,
        cohef_var_3m DECIMAL(8,2) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_monper_paciente (paciente_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else {
    console.log("   ℹ monitoreo_periodo ya existe");
  }

  // 2) Guarda anti-duplicado
  const [[{ n: yaHay }]] = await d.query("SELECT COUNT(*) n FROM monitoreo_periodo");
  if (yaHay > 0) {
    console.log(`\n⛔ monitoreo_periodo ya tiene ${yaHay} filas. Aborto para no duplicar.`);
    await o.end(); await d.end();
    return;
  }

  // 3) Pacientes válidos
  const [pacRows] = await d.query("SELECT id FROM paciente");
  const validos = new Set(pacRows.map(r => Number(r.id)));

  // 4) Origen
  const [rows] = await o.query("SELECT * FROM monitoreo ORDER BY mon_cve ASC");
  console.log(`\n   origen: ${rows.length} registros`);

  const data = [];
  let huerfanos = 0;
  for (const m of rows) {
    const pid = Number(m.paciente_cve);
    if (!validos.has(pid)) { huerfanos++; continue; }
    data.push([
      Number(m.mon_cve), pid, soloFecha(m.mon_fecha_registro),
      m.mon_fecha_captura ? String(m.mon_fecha_captura) : null,
      txt(m.mon_glucosa), txt(m.mon_glucosa_en), num(m.mon_glucometro), num(m.mon_num), txt(m.mon_dsm),
      txt(m.mon_cetonas), txt(m.mon_cetonas_en),
      txt(m.mon_feestyle_libre), num(m.mon_flash_semanas), num(m.mon_flash_escaneos),
      txt(m.mon_continuo), num(m.mon_continuo_marca), num(m.mon_continuo_sub), num(m.mon_continuo_semanas), txt(m.mon_continuo_porcentaje),
      num(m.glucosa_promedio_2s), num(m.tiempo_en_rango_2s), num(m.tiempo_en_rango_obj_2s), num(m.tiempo_en_rango_obj_emb_2s),
      num(m.per_250_2s), num(m.per_180_2s), num(m.per_140_2s), num(m.per_70_2s), num(m.per_63_2s), num(m.per_54_2s),
      num(m.img_2s), num(m.sensor_2s), num(m.desv_std_2s), num(m.cohef_var_2s),
      num(m.glucosa_promedio_3m), num(m.tiempo_en_rango_3m), num(m.tiempo_en_rango_obj_3m), num(m.tiempo_en_rango_obj_emb_3m),
      num(m.per_250_3m), num(m.per_180_3m), num(m.per_140_3m), num(m.per_70_3m), num(m.per_63_3m), num(m.per_54_3m),
      num(m.img_3m), num(m.sensor_3m), num(m.desv_std_3m), num(m.cohef_var_3m),
    ]);
  }

  console.log(`   filas a insertar: ${data.length}  |  sin paciente válido: ${huerfanos}`);
  const sql = `INSERT INTO monitoreo_periodo (${DEST_COLS.join(",")}) VALUES`;
  const ok = await insertBatch(d, sql, data);

  const [[{ n: total }]] = await d.query("SELECT COUNT(*) n FROM monitoreo_periodo");
  const [[{ n: pac }]] = await d.query("SELECT COUNT(DISTINCT paciente_id) n FROM monitoreo_periodo");
  const [[{ n: conMcg }]] = await d.query("SELECT COUNT(*) n FROM monitoreo_periodo WHERE tiempo_rango_2s IS NOT NULL OR tiempo_rango_3m IS NOT NULL");
  console.log(`\n✅ insertadas: ${ok}  |  total: ${total}  |  pacientes: ${pac}  |  con métricas MCG: ${conMcg}`);

  await o.end(); await d.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
