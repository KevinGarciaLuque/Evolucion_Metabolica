// migrate_renaced_tratamiento_otx.cjs
// Migra "Otros Tratamientos" (origen: tratamiento_otx, fila por captura con columnas SI/NO)
// hacia destino normalizado tratamiento_otx (una fila por medicamento activo).
// Ejecutar: node migrate_renaced_tratamiento_otx.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1", dateStrings: true };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// [columna_uso, col_fecha_inicio, col_fecha_termino, descripcion]
const MEDS = [
  ["tx_otx_betabloqueadores",     "tx_otx_betabloqueadores_fe_ini",     "tx_otx_betabloqueadores_fe_ter",     "Betabloqueadores"],
  ["tx_otx_alfabloqueadores",     "tx_otx_alfabloqueadores_fe_ini",     "tx_otx_alfabloqueadores_fe_ter",     "Alfabloqueadores"],
  ["tx_otx_inhibidores_eca",      "tx_otx_inhibidores_eca_fe_ini",      "tx_otx_inhibidores_eca_fe_ter",      "Inhibidores de la ECA (IECA)"],
  ["tx_otx_bloq_rec_angiotensina","tx_otx_bloq_rec_angiotensina_fe_ini","tx_otx_bloq_rec_angiotensina_fe_ter","Bloqueadores del receptor de angiotensina (ARA II)"],
  ["tx_otx_bloq_can_ca",          "tx_otx_bloq_can_ca_fe_ini",          "tx_otx_bloq_can_ca_fe_ter",          "Bloqueadores de canales de calcio"],
  ["tx_otx_diureticos",           "tx_otx_diureticos_fe_ini",           "tx_otx_diureticos_fe_ter",           "Diuréticos"],
  ["tx_otx_estatinas",            "tx_otx_estatinas_fe_ini",            "tx_otx_estatinas_fe_ter",            "Estatinas"],
  ["tx_otx_fibratos",             "tx_otx_fibratos_fe_ini",             "tx_otx_fibratos_fe_ter",             "Fibratos"],
  ["tx_otx_levotiroxina",         "tx_otx_levotiroxina_fe_ini",         "tx_otx_levotiroxina_fe_ter",         "Levotiroxina"],
];

const soloFecha = (v) => { if (!v) return null; const s = String(v); return s.length >= 10 ? s.slice(0, 10) : null; };

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
  await o.query("SET time_zone='+00:00'"); // leer timestamps tal cual se almacenaron
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // Seguridad: abortar si el destino ya tiene datos (evitar duplicados)
  const [[{ n: yaHay }]] = await d.query("SELECT COUNT(*) n FROM tratamiento_otx");
  if (yaHay > 0) {
    console.log(`⛔ tratamiento_otx (destino) ya tiene ${yaHay} filas. Aborto para no duplicar.`);
    await o.end(); await d.end();
    return;
  }

  // Pacientes válidos en destino
  const [pacRows] = await d.query("SELECT id FROM paciente");
  const validos = new Set(pacRows.map(r => Number(r.id)));

  const [rows] = await o.query("SELECT * FROM tratamiento_otx ORDER BY tratamiento_otx_cve ASC");
  console.log(`   origen: ${rows.length} capturas\n`);

  const insRows = [];
  let huerfanos = 0;
  for (const r of rows) {
    const pid = Number(r.paciente_cve);
    if (!validos.has(pid)) { huerfanos++; continue; }
    const captura = r.tx_otx_fecha_captura ? String(r.tx_otx_fecha_captura) : null;

    for (const [colUso, colIni, colTer, desc] of MEDS) {
      if (r[colUso] === "SI") {
        const fini = soloFecha(r[colIni]);
        const fter = soloFecha(r[colTer]);
        insRows.push([pid, desc, null, fini, fter, fter ? 0 : 1, null, captura]);
      }
    }
    // "Otro" con texto libre cual_otro
    if (r.tx_otx_otro === "SI") {
      const cual = (r.tx_otx_cual_otro || "").trim();
      const desc = cual ? `Otro: ${cual}`.substring(0, 250) : "Otro";
      const fini = soloFecha(r.tx_otx_otro_fe_ini);
      const fter = soloFecha(r.tx_otx_otro_fe_ter);
      insRows.push([pid, desc, null, fini, fter, fter ? 0 : 1, null, captura]);
    }
  }

  console.log(`   filas a insertar: ${insRows.length}  |  capturas sin paciente válido: ${huerfanos}`);
  const ok = await insertBatch(
    d,
    "INSERT INTO tratamiento_otx (paciente_id,descripcion,dosis,fecha_inicio,fecha_fin,activo,usuario_id,fecha_captura) VALUES",
    insRows
  );

  const [[{ n: total }]] = await d.query("SELECT COUNT(*) n FROM tratamiento_otx");
  const [[{ n: pac }]] = await d.query("SELECT COUNT(DISTINCT paciente_id) n FROM tratamiento_otx");
  console.log(`\n✅ insertadas: ${ok}  |  total destino: ${total}  |  pacientes: ${pac}`);

  await o.end(); await d.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
