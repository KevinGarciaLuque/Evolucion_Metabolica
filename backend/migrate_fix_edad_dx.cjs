// migrate_fix_edad_dx.cjs
// Calcula edad_diagnostico en diagnostico desde fecha_diagnostico y fecha_nacimiento del paciente
// Ejecutar desde backend/: node migrate_fix_edad_dx.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

async function fix() {
  console.log("\n🔄  Conectando a renaced_mexico…");
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_DESTINO.database}\n`);

  const [res] = await d.query(`
    UPDATE diagnostico dx
    JOIN paciente p ON p.id = dx.paciente_id
    SET dx.edad_diagnostico = TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, dx.fecha_diagnostico)
    WHERE dx.fecha_diagnostico IS NOT NULL
      AND p.fecha_nacimiento   IS NOT NULL
      AND dx.edad_diagnostico  IS NULL
      AND dx.fecha_diagnostico > p.fecha_nacimiento
      AND TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, dx.fecha_diagnostico) BETWEEN 0 AND 120
  `);

  await d.end();

  console.log(`✅ ${res.affectedRows} diagnósticos actualizados con edad al diagnóstico\n`);
}

fix().catch((e) => { console.error("❌ Error fatal:", e.message); process.exit(1); });
