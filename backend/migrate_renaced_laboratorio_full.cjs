// migrate_renaced_laboratorio_full.cjs
// Amplía el esquema de `laboratorio` con los analitos que el origen tiene pero
// el destino no guardaba, y los migra. UPDATE sobre filas existentes (id = laboratorio_cve).
// Ejecutar desde backend:  node migrate_renaced_laboratorio_full.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG_ORIGEN = {
  host: "localhost", port: 3306, user: "root", password: "123456789", database: "renaced1test",
};
const CFG_DESTINO = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
};

// Columnas nuevas a agregar (nombre → definición SQL)
const NUEVAS_COLUMNAS = {
  glucosa_azar:        "DECIMAL(7,2) DEFAULT NULL",
  peptido_c_azar:      "DECIMAL(7,3) DEFAULT NULL",
  acido_urico:         "DECIMAL(6,3) DEFAULT NULL",
  vitamina_d:          "DECIMAL(6,2) DEFAULT NULL",
  anti_insulina:       "DECIMAL(9,2) DEFAULT NULL",
  anti_islotes:        "DECIMAL(9,2) DEFAULT NULL",
  anti_zct8:           "DECIMAL(9,2) DEFAULT NULL",
  anti_tpo:            "DECIMAL(7,1) DEFAULT NULL",
  creatinina_urinaria: "DECIMAL(7,2) DEFAULT NULL",
  rel_album_creat:     "DECIMAL(7,2) DEFAULT NULL",
  volumen_urinario:    "DECIMAL(7,2) DEFAULT NULL",
};

const nz = (v) => (v === "" || v === undefined ? null : v);

async function migrar() {
  console.log("\n🔄  Conectando…");
  const origen  = await mysql.createConnection(CFG_ORIGEN);
  const destino = await mysql.createConnection(CFG_DESTINO);
  console.log(`   ✅ Origen  → ${CFG_ORIGEN.database}`);
  console.log(`   ✅ Destino → ${CFG_DESTINO.database} (${CFG_DESTINO.host})\n`);

  // ── 1. Agregar columnas que no existan ──────────────────────────────────────
  console.log("🔧 Verificando/creando columnas nuevas…");
  const [cols] = await destino.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'laboratorio'`,
    [CFG_DESTINO.database]
  );
  const existentes = new Set(cols.map((c) => c.COLUMN_NAME));
  for (const [nombre, definicion] of Object.entries(NUEVAS_COLUMNAS)) {
    if (existentes.has(nombre)) { console.log(`   • ${nombre} ya existe`); continue; }
    await destino.query(`ALTER TABLE laboratorio ADD COLUMN ${nombre} ${definicion}`);
    console.log(`   ＋ ${nombre} agregada`);
  }
  console.log();

  // ── 2. Backfill de los analitos ─────────────────────────────────────────────
  console.log("📦 Migrando analitos…");
  const [rows] = await origen.query(`SELECT * FROM laboratorio`);
  console.log(`   ${rows.length} registros origen.\n`);

  let ok = 0, err = 0, sinDestino = 0;
  for (const l of rows) {
    const datos = {
      glucosa_azar:        nz(l.valor_glu_azar),
      peptido_c_azar:      nz(l.valor_pepti_azar),
      acido_urico:         nz(l.valor_urico),
      vitamina_d:          nz(l.valor_vitaminad),
      anti_insulina:       nz(l.valor_anti_insulina),
      anti_islotes:        nz(l.valor_anti_islotes),
      anti_zct8:           nz(l.valor_anti_zct8),
      anti_tpo:            nz(l.valor_anti_tpo),
      creatinina_urinaria: nz(l.valor_creatinina_urinaria),
      rel_album_creat:     nz(l.valor_rel_album_creat),
      volumen_urinario:    nz(l.valor_volumen_urinario),
    };
    const keys = Object.keys(datos);
    const sql  = `UPDATE laboratorio SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`;
    const vals = [...keys.map((k) => datos[k]), l.laboratorio_cve];
    try {
      const [res] = await destino.query(sql, vals);
      if (res.affectedRows === 0) sinDestino++;
      else ok++;
    } catch (e) {
      err++;
      if (err <= 10) console.warn(`  ⚠ lab ${l.laboratorio_cve}: ${e.message}`);
    }
  }
  console.log(`\n   ✅ ${ok} actualizados  ⚠ ${sinDestino} sin fila destino  ❌ ${err} errores\n`);

  await origen.end();
  await destino.end();
  console.log("════════════════════════════════════════");
  console.log("✅  Laboratorio ampliado y migrado.");
  console.log("════════════════════════════════════════\n");
}

migrar().catch((e) => { console.error("\n❌ Error fatal:", e.message); process.exit(1); });
