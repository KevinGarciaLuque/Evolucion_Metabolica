// migrate_fix_terapia.cjs
// Actualiza terapia_id en la tabla tratamiento desde diagnostico.dx_terapia
// Ejecutar desde backend/: node migrate_fix_terapia.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1" };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

async function fix() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // Leer terapia por paciente desde diagnostico original
  const [rows] = await o.query(
    "SELECT paciente_cve, dx_terapia FROM diagnostico WHERE dx_terapia IS NOT NULL"
  );
  console.log(`📦 ${rows.length} pacientes con terapia registrada…`);

  let ok = 0, skip = 0;
  for (const r of rows) {
    const [res] = await d.query(
      "UPDATE tratamiento SET terapia_id = ? WHERE paciente_id = ? AND terapia_id IS NULL",
      [r.dx_terapia, r.paciente_cve]
    );
    if (res.affectedRows > 0) ok += res.affectedRows;
    else skip++;
  }

  await o.end();
  await d.end();

  console.log(`   ✅ ${ok} tratamientos actualizados`);
  console.log(`   ⏭️  ${skip} pacientes sin tratamiento registrado o terapia ya asignada\n`);
  console.log("════════════════════════════════════════");
  console.log("✅  Fix de terapia completado.");
  console.log("════════════════════════════════════════\n");
}

fix().catch((e) => { console.error("❌ Error fatal:", e.message); process.exit(1); });
