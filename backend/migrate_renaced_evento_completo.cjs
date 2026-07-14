// migrate_renaced_evento_completo.cjs
// Completa la sección "Eventos / Complicaciones Agudas" (origen: evento).
// El script previo solo migró 3 tipos (HIPOGLUCEMIA_SEVERA, CETOACIDOSIS, HOSPITALIZACION).
// Este AÑADE los tipos faltantes del manual, sin tocar lo ya migrado:
//   HIPOGLUCEMIA_LEVE, HIPOGLUCEMIA_INADVERTIDA, HIPOGLUCEMIA_NIVEL1 (54-70),
//   HIPOGLUCEMIA_NIVEL2 (<54), USO_GLUCAGON
// Ejecutar: node migrate_renaced_evento_completo.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1test", dateStrings: true };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// Tipos NUEVOS que añade este script (para guardas anti-duplicado)
const TIPOS_NUEVOS = ["HIPOGLUCEMIA_LEVE", "HIPOGLUCEMIA_INADVERTIDA", "HIPOGLUCEMIA_NIVEL1", "HIPOGLUCEMIA_NIVEL2", "USO_GLUCAGON"];

const soloFecha = (v) => { if (!v) return null; const s = String(v); return s.length >= 10 ? s.slice(0, 10) : null; };

async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ph = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    try { await conn.query(`${sql} ${ph}`, chunk.flat()); total += chunk.length; }
    catch (_) { for (const row of chunk) { try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); total++; } catch (__) {} } }
  }
  return total;
}

async function run() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  await o.query("SET time_zone='+00:00'");
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // Guarda anti-duplicado: si ya existen tipos nuevos, abortar
  const [[{ n: yaHay }]] = await d.query(
    `SELECT COUNT(*) n FROM evento WHERE tipo IN (${TIPOS_NUEVOS.map(() => "?").join(",")})`, TIPOS_NUEVOS);
  if (yaHay > 0) {
    console.log(`⛔ Ya existen ${yaHay} filas de los tipos nuevos. Aborto para no duplicar.`);
    await o.end(); await d.end();
    return;
  }

  const [pacRows] = await d.query("SELECT id FROM paciente");
  const validos = new Set(pacRows.map(r => Number(r.id)));

  const [rows] = await o.query("SELECT * FROM evento ORDER BY evento_cve ASC");
  console.log(`   origen: ${rows.length} registros de evento\n`);

  const data = [];
  let huerfanos = 0;
  for (const ev of rows) {
    const pid = Number(ev.paciente_cve);
    if (!validos.has(pid)) { huerfanos++; continue; }
    const cap = ev.evento_fecha_captura ? String(ev.evento_fecha_captura) : null;
    const fcap = soloFecha(cap); // fecha de respaldo (columna fecha es NOT NULL)
    if (!fcap) { huerfanos++; continue; } // sin fecha de captura no podemos cumplir NOT NULL

    // HIPOGLUCEMIA_LEVE (con número de episodios)
    if (ev.evento_hipo_leve === "SI") {
      const desc = ev.evento_num_hipo_leve != null ? `Episodios: ${ev.evento_num_hipo_leve}` : null;
      data.push([pid, "HIPOGLUCEMIA_LEVE", fcap, desc, "LEVE", 0, null, cap]);
    }
    // HIPOGLUCEMIA_INADVERTIDA
    if (ev.evento_hipo_inad === "SI") {
      data.push([pid, "HIPOGLUCEMIA_INADVERTIDA", fcap, null, "INADVERTIDA", 0, null, cap]);
    }
    // HIPOGLUCEMIA_NIVEL1 (54-70 mg/dL)
    if (ev.evento_hipo_5470 === "SI") {
      const partes = ["Glucosa 54-70 mg/dL"];
      if (ev.evento_num_hipo_5470 != null) partes.push(`Episodios: ${ev.evento_num_hipo_5470}`);
      if (ev.evento_numpor_hipo_5470) partes.push(`Frecuencia: ${ev.evento_numpor_hipo_5470}`);
      data.push([pid, "HIPOGLUCEMIA_NIVEL1", fcap, partes.join(" · "), "NIVEL 1", 0, null, cap]);
    }
    // HIPOGLUCEMIA_NIVEL2 (<54 mg/dL)
    if (ev.evento_hipo_m54 === "SI") {
      const partes = ["Glucosa <54 mg/dL"];
      if (ev.evento_num_hipo_m54 != null) partes.push(`Episodios: ${ev.evento_num_hipo_m54}`);
      if (ev.evento_numpor_hipo_m54) partes.push(`Frecuencia: ${ev.evento_numpor_hipo_m54}`);
      data.push([pid, "HIPOGLUCEMIA_NIVEL2", fcap, partes.join(" · "), "NIVEL 2", 0, null, cap]);
    }
    // USO_GLUCAGON
    if (ev.evento_glucagon_uso === "SI") {
      const disp = ev.evento_glucagon_disp === "SI" ? "Glucagón disponible" : null;
      data.push([pid, "USO_GLUCAGON", soloFecha(ev.evento_fecha_glucagon) || fcap, disp, null, 0, null, cap]);
    }
  }

  console.log(`   filas a insertar: ${data.length}  |  sin paciente válido: ${huerfanos}`);
  const ok = await insertBatch(d,
    "INSERT INTO evento (paciente_id,tipo,fecha,descripcion,gravedad,requirio_hospitalizacion,usuario_id,fecha_captura) VALUES", data);

  const [byTipo] = await d.query("SELECT tipo, COUNT(*) n FROM evento GROUP BY tipo ORDER BY n DESC");
  console.log(`\n✅ insertadas: ${ok}\n\nDistribución actual de evento por tipo:`);
  console.table(byTipo);

  await o.end(); await d.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
