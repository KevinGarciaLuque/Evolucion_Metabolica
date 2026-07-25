// migrate_renaced_datos3.cjs
// Tercera pasada: monitoreo, embarazo, paciente_cambio_estatus
// Ejecutar desde backend/: node migrate_renaced_datos3.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1" };
const CFG_DESTINO = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

async function insertBatch(conn, sql, rows) {
  if (!rows.length) return 0;
  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ph = chunk.map(() => `(${Array(chunk[0].length).fill("?").join(",")})`).join(",");
    try {
      await conn.query(`${sql} ${ph}`, chunk.flat());
      total += chunk.length;
    } catch (_) {
      for (const row of chunk) {
        try { await conn.query(`${sql} (${Array(row.length).fill("?").join(",")})`, row); total++; } catch (__) {}
      }
    }
  }
  return total;
}

async function migrar() {
  console.log("\n🔄  Conectando…");
  const o = await mysql.createConnection(CFG_ORIGEN);
  const d = await mysql.createConnection({ ...CFG_DESTINO, connectTimeout: 60000 });
  console.log(`   ✅ ${CFG_ORIGEN.database} → ${CFG_DESTINO.database}\n`);

  // ════════════════════════════════════════════════════════════
  // 1. MONITOREO DE GLUCOSA
  // mon_glucosa='SI' → hay valor en mon_glucosa_en
  // mon_feestyle_libre='SI' → tipo FLASH, mon_continuo='SI' → CONTINUO
  // ════════════════════════════════════════════════════════════
  console.log("📦 1/3 monitoreo…");
  {
    const [rows] = await o.query("SELECT * FROM monitoreo");
    const data = [];
    for (const m of rows) {
      // Determinar tipo de monitoreo
      let tipo = "CONVENCIONAL";
      if (m.mon_feestyle_libre === "SI") tipo = "FLASH";
      else if (m.mon_continuo  === "SI") tipo = "CONTINUO";

      // Insertar promedio 2 semanas si existe
      const g2s = parseFloat(m.glucosa_promedio_2s);
      if (g2s && !isNaN(g2s)) {
        data.push([m.paciente_cve, m.mon_fecha_registro||null, g2s, "PROMEDIO_2S", tipo, m.mon_fecha_captura||null]);
      }
      // Insertar promedio 3 meses si existe y es distinto
      const g3m = parseFloat(m.glucosa_promedio_3m);
      if (g3m && !isNaN(g3m)) {
        data.push([m.paciente_cve, m.mon_fecha_registro||null, g3m, "PROMEDIO_3M", tipo, m.mon_fecha_captura||null]);
      }
      // Sin promedios → no hay valor numérico que insertar
    }
    const n = await insertBatch(d,
      "INSERT INTO monitoreo (paciente_id,fecha,glucosa,momento,tipo_medicion,fecha_captura) VALUES",
      data);
    console.log(`   ✅ ${n} lecturas de ${rows.length} registros\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 2. EMBARAZO
  // Campos clave: fecha_um→fecha_ultima_mens, fecha_pp→fecha_probable_parto,
  //               estatus_embarazo→resultado, fecha_desenlace→fecha_parto
  // ════════════════════════════════════════════════════════════
  console.log("📦 2/3 embarazo…");
  {
    const [rows] = await o.query("SELECT * FROM embarazo");
    const data = rows.map(r => [
      r.paciente_cve,
      r.fecha_um    || null,
      r.fecha_pp    || null,
      r.estatus_embarazo || null,
      r.fecha_desenlace  || null,
      r.semana_nacimiento ? r.semana_nacimiento : null,
      // resultado del recién nacido como observación
      [
        r.peso_rn   ? `Peso RN: ${r.peso_rn}g`   : null,
        r.talla_rn  ? `Talla: ${r.talla_rn}cm`   : null,
        r.genero_rn ? `Género: ${r.genero_rn}`    : null,
        r.nacimiento_por ? `Vía: ${r.nacimiento_por}` : null,
      ].filter(Boolean).join(", ") || null,
      r.emb_fecha_captura || null,
    ]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO embarazo (paciente_id,fecha_ultima_mens,fecha_probable_parto,resultado,fecha_parto,semanas_gestacion,observaciones,fecha_captura) VALUES",
      data);
    console.log(`   ✅ ${n}\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 3. PACIENTE_CAMBIO_ESTATUS
  // Original: paciente_fe_inicio→fecha, paciente_estatus_cve→estatus_nuevo_id
  //           paciente_cambio_estatus_observaciones→observacion
  // ════════════════════════════════════════════════════════════
  console.log("📦 3/3 paciente_cambio_estatus…");
  {
    const [rows] = await o.query("SELECT * FROM paciente_cambio_estatus");
    const data = rows.map(r => [
      r.paciente_cve,
      null,                                          // estatus_anterior_id (no está en original)
      r.paciente_estatus_cve || null,                // estatus_nuevo_id
      r.paciente_causabaja_cve || null,              // causa_baja_id
      r.paciente_cambio_estatus_observaciones || null,
      r.paciente_fe_inicio || null,
    ]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO paciente_cambio_estatus (paciente_id,estatus_anterior_id,estatus_nuevo_id,causa_baja_id,observacion,fecha) VALUES",
      data);
    console.log(`   ✅ ${n}\n`);
  }

  await o.end();
  await d.end();

  console.log("════════════════════════════════════════");
  console.log("✅  Tercera pasada completada.");
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => { console.error("❌ Error fatal:", e.message); process.exit(1); });
