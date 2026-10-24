// migrate_renaced_evaluacion_fix.cjs
// Corrige las filas de `evaluacion` migradas desde `ccronica`:
//   1. fecha_evaluacion → fecha real de origen (ccronica_fecha_captura) en vez de HOY.
//   2. neuropatia_autonomica_id y enf_vascular_id → analitos que la migración omitió.
//
// Estrategia: emparejamiento posicional. La migración hizo `SELECT * FROM ccronica`
// e insertó en lote, por lo que evaluacion.id (orden ASC) coincide con el orden
// natural de ccronica. Se VERIFICA que paciente_id coincida en el 100% de las filas
// antes de aplicar cualquier cambio; si no coincide, ABORTA sin tocar nada.
// Solo ejecuta UPDATE (no destructivo).
//
// Ejecutar desde backend:  node migrate_renaced_evaluacion_fix.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = {
  host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1",
  dateStrings: true,
};
const CFG_DESTINO = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// id de catálogo válido 1..max, o null
const tipo = (v, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
};
// fecha YYYY-MM-DD desde datetime/date de origen
const soloFecha = (v) => {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : null;
};

async function run() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  const d = await mysql.createConnection(CFG_DESTINO);
  console.log(`   ✅ Origen  → ${CFG_ORIGEN.database}`);
  console.log(`   ✅ Destino → ${CFG_DESTINO.database} (${CFG_DESTINO.host})\n`);

  const [cc] = await o.query("SELECT * FROM ccronica");
  const [ev] = await d.query("SELECT id, paciente_id FROM evaluacion ORDER BY id ASC");
  console.log(`📊 ccronica origen: ${cc.length}  |  evaluacion destino: ${ev.length}`);

  if (cc.length !== ev.length) {
    console.error(`\n❌ ABORTA: el conteo no coincide (${cc.length} vs ${ev.length}).` +
      ` El emparejamiento posicional no es seguro.`);
    await o.end(); await d.end(); process.exit(1);
  }

  // 1. Verificar alineación posicional de paciente al 100% antes de tocar nada
  let desalineados = 0;
  for (let i = 0; i < cc.length; i++) {
    if (Number(ev[i].paciente_id) !== Number(cc[i].paciente_cve)) desalineados++;
  }
  console.log(`   • filas con paciente desalineado: ${desalineados}`);
  if (desalineados > 0) {
    console.error(`\n❌ ABORTA: ${desalineados} filas con paciente_id desalineado.` +
      ` No se aplicó ningún cambio.`);
    await o.end(); await d.end(); process.exit(1);
  }
  console.log("   ✅ Alineación posicional verificada al 100%.\n");

  // 2. Aplicar UPDATE fila por fila (emparejamiento posicional)
  console.log("🔧 Actualizando fecha_evaluacion + neuropatia_autonomica_id + enf_vascular_id…");
  let ok = 0, err = 0;
  for (let i = 0; i < cc.length; i++) {
    const r = cc[i];
    const fecha = soloFecha(r.ccronica_fecha_captura);
    const neuroAut = tipo(r.ccronica_neuropatia_autonomica_tipo, 3);
    const vascular = r.ccronica_e_vascular_perif === "SI"
      ? (tipo(r.ccronica_e_vascular_perif_tipo, 4) || 1)
      : null;
    try {
      await d.query(
        "UPDATE evaluacion SET fecha_evaluacion = ?, neuropatia_autonomica_id = ?, enf_vascular_id = ? WHERE id = ?",
        [fecha, neuroAut, vascular, ev[i].id]
      );
      ok++;
    } catch (ex) {
      err++;
      if (err <= 10) console.warn(`  ⚠ eval ${ev[i].id}: ${ex.message}`);
    }
  }
  console.log(`\n   ✅ ${ok} actualizados  ❌ ${err} errores\n`);

  // 3. Verificación final
  const [[hoy]] = await d.query("SELECT COUNT(*) c FROM evaluacion WHERE fecha_evaluacion = CURDATE()");
  const [[na]]  = await d.query("SELECT COUNT(*) c FROM evaluacion WHERE neuropatia_autonomica_id IS NOT NULL");
  const [[vc]]  = await d.query("SELECT COUNT(*) c FROM evaluacion WHERE enf_vascular_id IS NOT NULL");
  console.log(`📊 evaluacion con fecha=HOY (debería ser 0 o pocas): ${hoy.c}`);
  console.log(`📊 evaluacion con neuropatia_autonomica_id: ${na.c}`);
  console.log(`📊 evaluacion con enf_vascular_id: ${vc.c}`);

  await o.end(); await d.end();
  console.log("\n════════════════════════════════════════");
  console.log("✅  Evaluación corregida.");
  console.log("════════════════════════════════════════\n");
}

run().catch((e) => { console.error("\n❌ Error fatal:", e.message); process.exit(1); });
