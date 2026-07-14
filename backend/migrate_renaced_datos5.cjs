// migrate_renaced_datos5.cjs
// Quinta (y última) pasada: cat_estado, cat_pais, cat_calculo_dosis_insulinas,
//                           cat_sub_monit_glucosa, antecedente_embarazo
// Ejecutar desde backend/: node migrate_renaced_datos5.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = { host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1test" };
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
  // 1. cat_estado — clave VARCHAR(2) PK
  // ════════════════════════════════════════════════════════════
  console.log("📦 1/5 cat_estado…");
  {
    const [rows] = await o.query("SELECT * FROM cat_estado");
    const data = rows.map(r => [r.estado_cve, r.estado_nombre || "", "MX"]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO cat_estado (clave,nombre,pais_codigo) VALUES", data);
    console.log(`   ✅ ${n}\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 2. cat_pais — nuevo esquema tiene clave_iso UNIQUE NOT NULL
  //    Original no tiene ISO, usamos pais_cve como string cero-relleno
  // ════════════════════════════════════════════════════════════
  console.log("📦 2/5 cat_pais…");
  {
    const [rows] = await o.query("SELECT * FROM cat_pais");
    const data = rows
      .filter(r => r.pais_nombre)
      .map(r => [
        String(r.pais_cve).padStart(4, "0"),  // clave_iso sintética "0001","0002"…
        r.pais_nombre,
      ]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO cat_pais (clave_iso,nombre) VALUES", data);
    console.log(`   ✅ ${n}\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 3. cat_calculo_dosis_insulinas — (id, descripcion)
  // ════════════════════════════════════════════════════════════
  console.log("📦 3/5 cat_calculo_dosis_insulinas…");
  {
    const [rows] = await o.query("SELECT * FROM cat_calculo_dosis_insulinas");
    const data = rows.map(r => [r.calculo_dosis_insulinas_cve, r.calculo_dosis_insulinas_descripcion]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO cat_calculo_dosis_insulinas (id,descripcion) VALUES", data);
    console.log(`   ✅ ${n}\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 4. cat_sub_monit_glucosa — (id, monit_glucosa_id, marca)
  // ════════════════════════════════════════════════════════════
  console.log("📦 4/5 cat_sub_monit_glucosa…");
  {
    const [rows] = await o.query("SELECT * FROM cat_sub_monit_glucosa");
    const data = rows.map(r => [
      r.sub_monit_glucosa_cve,
      r.monit_glucosa_cve,
      r.sub_monit_glucosa_nombre,
    ]);
    const n = await insertBatch(d,
      "INSERT IGNORE INTO cat_sub_monit_glucosa (id,monit_glucosa_id,marca) VALUES", data);
    console.log(`   ✅ ${n}\n`);
  }

  // ════════════════════════════════════════════════════════════
  // 5. antecedente_embarazo — original guarda hasta 10 embarazos
  //    previos como columnas (emb_previo1_des, emb_previo1_fecha…)
  //    en antecedentes_go. Expandimos a filas.
  // ════════════════════════════════════════════════════════════
  console.log("📦 5/5 antecedente_embarazo…");
  {
    const [rows] = await o.query("SELECT * FROM antecedentes_go");
    const data = [];
    for (const r of rows) {
      for (let i = 1; i <= 10; i++) {
        const des      = r[`emb_previo${i}_des`];
        const fecha    = r[`emb_previo${i}_fecha`];
        const diabetes = r[`emb_previo${i}_diabetes`];
        // Solo insertar si tiene desenlace (registro real)
        if (des) {
          data.push([r.paciente_cve, i, des, fecha || null, diabetes || null]);
        }
      }
    }
    const n = await insertBatch(d,
      "INSERT IGNORE INTO antecedente_embarazo (paciente_id,num_embarazo,desenlace,fecha,con_diabetes) VALUES",
      data);
    console.log(`   ✅ ${n} embarazos previos de ${rows.length} pacientes\n`);
  }

  await o.end();
  await d.end();

  console.log("════════════════════════════════════════");
  console.log("✅  MIGRACIÓN TOTAL COMPLETADA.");
  console.log("    No queda ninguna tabla pendiente.");
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => { console.error("❌ Error fatal:", e.message); process.exit(1); });
