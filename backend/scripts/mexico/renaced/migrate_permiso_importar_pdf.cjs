// migrate_permiso_importar_pdf.cjs
// Nuevo permiso "importar_pdf" (botón "Importar PDF" de historia clínica / nota / receta) y
// "importar_bd" deja de ser un permiso (es exclusivo del Super Admin).
//
// Para que NADIE pierda el botón al desplegar, agrega "importar_pdf" a:
//   • tenants.modulos de cada país que ya tenga una lista guardada (null = sin restricción, no se toca)
//   • los permisos individuales (permisos_modulos) de los usuarios que ya tengan alguno guardado
// y limpia "importar_bd" de ambos sitios.
//
//   node scripts/mexico/renaced/migrate_permiso_importar_pdf.cjs            (simulación)
//   node scripts/mexico/renaced/migrate_permiso_importar_pdf.cjs --aplicar
// Bases de países: RENACED_DB_NAMES="renaced_mexico,..." o RENACED_MX_DB_NAME. Seguro de re-ejecutar.

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "..", ".env") });

const APLICAR = process.argv.includes("--aplicar");
const BASES = (process.env.RENACED_DB_NAMES || process.env.RENACED_MX_DB_NAME || "renaced_mexico")
  .split(",").map((s) => s.trim()).filter(Boolean);
const conectar = (database) => mysql.createConnection({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database, connectTimeout: 60000,
});

async function main() {
  console.log(APLICAR ? "\n⚙️  MODO APLICAR\n" : "\n🔍 SIMULACIÓN (agrega --aplicar)\n");

  // 1) Países (base maestra)
  const master = await conectar(process.env.MASTER_DB_NAME || "alad_master");
  const [tenants] = await master.query("SELECT id, codigo, modulos FROM tenants WHERE codigo <> 'hn'");
  for (const t of tenants) {
    let mods = t.modulos;
    if (typeof mods === "string") { try { mods = JSON.parse(mods); } catch { mods = null; } }
    if (!Array.isArray(mods)) { console.log(`🌎 ${t.codigo}: sin restricción, no se toca`); continue; }
    const nuevo = [...new Set([...mods.filter((m) => m !== "importar_bd"), "importar_pdf"])];
    console.log(`🌎 ${t.codigo}: [${mods.join(", ")}] → [${nuevo.join(", ")}]`);
    if (APLICAR) await master.query("UPDATE tenants SET modulos = ? WHERE id = ?", [JSON.stringify(nuevo), t.id]);
  }
  await master.end();

  // 2) Usuarios con permisos individuales guardados
  for (const base of BASES) {
    const conn = await conectar(base);
    console.log(`📦 ${base}`);
    const [[{ t }]] = await conn.query(
      "SELECT COUNT(*) t FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='permisos_modulos'", [base]);
    if (!t) { console.log("   sin permisos individuales guardados"); await conn.end(); continue; }
    const [[{ n }]] = await conn.query("SELECT COUNT(DISTINCT usuario_id) n FROM permisos_modulos");
    const [[{ b }]] = await conn.query("SELECT COUNT(*) b FROM permisos_modulos WHERE modulo = 'importar_bd'");
    console.log(`   ${n} usuario(s) con permisos propios; ${b} con "importar_bd" que se quitará`);
    if (APLICAR) {
      await conn.query(
        "INSERT IGNORE INTO permisos_modulos (usuario_id, modulo) SELECT DISTINCT usuario_id, 'importar_pdf' FROM permisos_modulos");
      await conn.query("DELETE FROM permisos_modulos WHERE modulo = 'importar_bd'");
      console.log("   ✅ listo");
    }
    await conn.end();
  }
}
main().catch((e) => { console.error("❌", e.message); process.exit(1); });
