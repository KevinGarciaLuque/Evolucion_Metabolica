// migrate_renaced_ajuste_dosis.cjs
// Migra "Ajustes de dosis de insulina" (origen: tratamiento_hist_dosis)
// a tablas NUEVAS e independientes, sin tocar `tratamiento` existente:
//   - tratamiento_ajuste_dosis            (cabecera, 1 fila por ajuste)
//   - tratamiento_ajuste_dosis_detalle    (1 fila por insulina con dosis/inyecciones)
// Conserva el snapshot tal cual del origen. id = cve original (trazabilidad + lote).
// Ejecutar: node migrate_renaced_ajuste_dosis.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1", dateStrings: true };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// [columna_uso, columna_dosis, insulina_id]  (mismo mapeo cat_insulina usado en la migración de tratamiento)
const INSULINAS = [
  ["tx_insul_nph",             "tx_insul_dosis_nph",              1 ],
  ["tx_insul_glargina",        "tx_insul_dosis_glargina",         2 ],
  ["tx_insul_detemir",         "tx_insul_dosis_detemir",          3 ],
  ["tx_insul_degludec",        "tx_insul_dosis_degludec",         4 ],
  ["tx_insul_rapida",          "tx_insul_dosis_rapida",           5 ],
  ["tx_insul_lispro",          "tx_insul_dosis_lispro",           6 ],
  ["tx_insul_aspart",          "tx_insul_dosis_aspart",           7 ],
  ["tx_insul_glulisina",       "tx_insul_dosis_glulisina",        8 ],
  ["tx_insul_nph_r",           "tx_insul_dosis_nph_r",            9 ],
  ["tx_insul_lispro_lispro_1", "tx_insul_dosis_lispro_lispro_1",  10],
  ["tx_insul_lispro_lispro_2", "tx_insul_dosis_lispro_lispro_2",  11],
  ["tx_insul_aspart_aspart",   "tx_insul_dosis_aspart_aspart",    12],
  ["tx_insul_lenta",           "tx_insul_dosis_lenta",            13],
  ["tx_insul_glargina_u300",   "tx_insul_dosis_glargina_u300",    18],
  ["tx_insul_fiasp",           "tx_insul_dosis_fiasp",            19],
  ["tx_insul_lyumjev",         "tx_insul_dosis_lyumjev",          20],
  ["tx_insul_degludec_aspart", "tx_insul_dosis_degludec_aspart",  16],
  ["tx_insul_otra",            "tx_insul_dosis_otra",             17],
];

const soloFecha = (v) => { if (!v) return null; const s = String(v); return s.length >= 10 ? s.slice(0, 10) : null; };
const numOrNull = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

async function tablaExiste(conn, db, t) {
  const [r] = await conn.query(
    "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, t]);
  return r[0].n > 0;
}

async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    try {
      await conn.query(`${sql} ${placeholders}`, chunk.flat());
      inserted += chunk.length;
    } catch (e) {
      for (const row of chunk) {
        try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); inserted++; }
        catch (_) {}
      }
    }
  }
  return inserted;
}

async function run() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  await o.query("SET time_zone='+00:00'");
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // 1) Crear tablas si no existen
  if (!(await tablaExiste(d, CFG_DESTINO.database, "tratamiento_ajuste_dosis"))) {
    console.log("📦 Creando tabla tratamiento_ajuste_dosis…");
    await d.query(`
      CREATE TABLE tratamiento_ajuste_dosis (
        id BIGINT UNSIGNED NOT NULL,
        paciente_id BIGINT UNSIGNED NOT NULL,
        tratamiento_cve_origen BIGINT UNSIGNED DEFAULT NULL,
        fecha_ajuste DATE DEFAULT NULL,
        fecha_captura DATETIME DEFAULT NULL,
        dosis_total_dia DECIMAL(10,3) DEFAULT NULL,
        dosis_total_kg_dia DECIMAL(10,3) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_ajuste_paciente (paciente_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else {
    console.log("   ℹ tratamiento_ajuste_dosis ya existe");
  }

  if (!(await tablaExiste(d, CFG_DESTINO.database, "tratamiento_ajuste_dosis_detalle"))) {
    console.log("📦 Creando tabla tratamiento_ajuste_dosis_detalle…");
    await d.query(`
      CREATE TABLE tratamiento_ajuste_dosis_detalle (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        ajuste_id BIGINT UNSIGNED NOT NULL,
        insulina_id SMALLINT UNSIGNED DEFAULT NULL,
        dosis DECIMAL(10,3) DEFAULT NULL,
        inyecciones SMALLINT DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_det_ajuste (ajuste_id),
        CONSTRAINT fk_ajuste_det FOREIGN KEY (ajuste_id)
          REFERENCES tratamiento_ajuste_dosis (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } else {
    console.log("   ℹ tratamiento_ajuste_dosis_detalle ya existe");
  }

  // 2) Seguridad: abortar si ya hay datos
  const [[{ n: yaHay }]] = await d.query("SELECT COUNT(*) n FROM tratamiento_ajuste_dosis");
  if (yaHay > 0) {
    console.log(`\n⛔ tratamiento_ajuste_dosis ya tiene ${yaHay} filas. Aborto para no duplicar.`);
    await o.end(); await d.end();
    return;
  }

  // 3) Pacientes válidos en destino
  const [pacRows] = await d.query("SELECT id FROM paciente");
  const validos = new Set(pacRows.map(r => Number(r.id)));

  // 4) Leer origen
  const [rows] = await o.query("SELECT * FROM tratamiento_hist_dosis ORDER BY tratamiento_hist_dosis_cve ASC");
  console.log(`\n   origen: ${rows.length} ajustes`);

  const cab = [];
  const det = [];
  let huerfanos = 0;
  for (const r of rows) {
    const pid = Number(r.paciente_cve);
    if (!validos.has(pid)) { huerfanos++; continue; }
    const ajusteId = Number(r.tratamiento_hist_dosis_cve);
    cab.push([
      ajusteId,
      pid,
      r.tratamiento_cve ? Number(r.tratamiento_cve) : null,
      soloFecha(r.tx_insul_fecha_ajuste),
      r.tx_insul_fecha_captura ? String(r.tx_insul_fecha_captura) : null,
      numOrNull(r.tx_dosis_total_dia),
      numOrNull(r.tx_dosis_total_kg_dia),
    ]);

    for (const [colUso, colDosis, insId] of INSULINAS) {
      const dosis = numOrNull(r[colDosis]);
      const usa = r[colUso] === "SI";
      if (usa || (dosis !== null && dosis > 0)) {
        const inyecCol = colUso.replace("tx_insul_", "tx_insul_inyec_");
        det.push([ajusteId, insId, dosis, numOrNull(r[inyecCol])]);
      }
    }
  }

  console.log(`   cabeceras: ${cab.length}  |  detalles: ${det.length}  |  sin paciente válido: ${huerfanos}`);

  const okCab = await insertBatch(d,
    "INSERT INTO tratamiento_ajuste_dosis (id,paciente_id,tratamiento_cve_origen,fecha_ajuste,fecha_captura,dosis_total_dia,dosis_total_kg_dia) VALUES", cab);
  const okDet = await insertBatch(d,
    "INSERT INTO tratamiento_ajuste_dosis_detalle (ajuste_id,insulina_id,dosis,inyecciones) VALUES", det);

  const [[{ n: tc }]] = await d.query("SELECT COUNT(*) n FROM tratamiento_ajuste_dosis");
  const [[{ n: td }]] = await d.query("SELECT COUNT(*) n FROM tratamiento_ajuste_dosis_detalle");
  const [[{ n: tp }]] = await d.query("SELECT COUNT(DISTINCT paciente_id) n FROM tratamiento_ajuste_dosis");
  console.log(`\n✅ cabeceras insertadas: ${okCab} (total ${tc})  |  detalles: ${okDet} (total ${td})  |  pacientes: ${tp}`);

  await o.end(); await d.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
