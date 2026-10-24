// migrate_renaced_folio.cjs
// Agrega la columna folio_renaced (folio secuencial fijo, asignado una sola vez
// por paciente al darse de alta) y hace el backfill de los pacientes existentes,
// numerándolos 1..N en su orden real de alta (fecha_alta, luego id como desempate).
// Ejecutar: node migrate_renaced_folio.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

async function columnaExiste(conn, db, tabla, columna) {
  const [r] = await conn.query(
    "SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?",
    [db, tabla, columna]
  );
  return r[0].n > 0;
}

async function run() {
  console.log("\n🔄  Conectando…");
  const conn = await mysql.createConnection({ ...CFG, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG.database}\n`);

  if (!(await columnaExiste(conn, CFG.database, "paciente", "folio_renaced"))) {
    console.log("📦 Agregando columna folio_renaced…");
    await conn.query(
      `ALTER TABLE paciente ADD COLUMN folio_renaced INT UNSIGNED DEFAULT NULL AFTER expediente`
    );
    await conn.query(
      `ALTER TABLE paciente ADD UNIQUE KEY uq_paciente_folio_renaced (folio_renaced)`
    );
  } else {
    console.log("   ℹ folio_renaced ya existe");
  }

  const [[{ pendientes }]] = await conn.query(
    "SELECT COUNT(*) pendientes FROM paciente WHERE folio_renaced IS NULL"
  );
  if (pendientes === 0) {
    console.log("\n⛔ No hay pacientes sin folio_renaced. Nada que hacer.");
    await conn.end();
    return;
  }

  console.log(`\n   Backfill: ${pendientes} pacientes sin folio_renaced…`);
  const [rows] = await conn.query(
    "SELECT id FROM paciente WHERE folio_renaced IS NULL ORDER BY fecha_alta ASC, id ASC"
  );

  const [[{ maxFolio }]] = await conn.query(
    "SELECT COALESCE(MAX(folio_renaced), 0) AS maxFolio FROM paciente"
  );

  let folio = maxFolio;
  for (const r of rows) {
    folio++;
    await conn.query("UPDATE paciente SET folio_renaced = ? WHERE id = ?", [folio, r.id]);
  }

  const [[{ total }]] = await conn.query("SELECT COUNT(*) total FROM paciente");
  const [[{ conFolio }]] = await conn.query("SELECT COUNT(folio_renaced) conFolio FROM paciente");
  const [[{ maxFinal }]] = await conn.query("SELECT MAX(folio_renaced) maxFinal FROM paciente");
  console.log(`\n✅ Backfill completo. total=${total}  con folio=${conFolio}  folio máximo=${maxFinal}`);

  await conn.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
