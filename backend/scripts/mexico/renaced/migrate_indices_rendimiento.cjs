// migrate_indices_rendimiento.cjs
// Crea los índices que necesita RENACED para seguir rápido con millones de registros:
//  - FULLTEXT en nombre/apellidos (búsqueda de pacientes por palabra, sin LIKE '%x%')
//  - índices compuestos para "último diagnóstico / laboratorio / consulta por paciente"
//  - índices de orden y filtros del listado (fecha_alta, residencia, expediente, folio)
//
// Seguro de re-ejecutar: omite lo que ya existe. Por defecto solo MUESTRA lo que haría.
//   node scripts/mexico/renaced/migrate_indices_rendimiento.cjs            (simulación)
//   node scripts/mexico/renaced/migrate_indices_rendimiento.cjs --aplicar  (crea los índices)
// Bases: RENACED_DB_NAMES="renaced_mexico,..." o RENACED_MX_DB_NAME (por defecto renaced_mexico).
// Con tablas muy grandes la creación puede tardar minutos: conviene correrlo en horario de poco uso.

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", "..", ".env") });

const APLICAR = process.argv.includes("--aplicar");

const BASES = (process.env.RENACED_DB_NAMES || process.env.RENACED_MX_DB_NAME || "renaced_mexico")
  .split(",").map((s) => s.trim()).filter(Boolean);

// [tabla, nombre_indice, columnas[], tipo]
const INDICES = [
  ["paciente",    "idx_ft_nombre",      ["nombre", "ap_pat", "ap_mat"],              "FULLTEXT"],
  ["paciente",    "idx_ap_pat_nombre",  ["ap_pat", "nombre"],                        ""],
  ["paciente",    "idx_expediente",     ["expediente"],                              ""],
  ["paciente",    "idx_folio_renaced",  ["folio_renaced"],                           ""],
  ["paciente",    "idx_fecha_alta",     ["fecha_alta"],                              ""],
  ["paciente",    "idx_unidad_alta",    ["unidad_servicio_id", "fecha_alta"],        ""],
  ["paciente",    "idx_residencia",     ["estado_residencia", "municipio_residencia"], ""],
  ["diagnostico", "idx_pac_captura",    ["paciente_id", "fecha_captura"],            ""],
  ["laboratorio", "idx_pac_muestra",    ["paciente_id", "fecha_muestra"],            ""],
  ["consulta",    "idx_pac_fecha",      ["paciente_id", "fecha_consulta"],           ""],
  ["escaneo_mcg", "idx_pac_fecha_esc",  ["paciente_id", "fecha"],                    ""],
  ["escaneo_mcg", "idx_creado_en",      ["creado_en"],                               ""],
];

async function main() {
  console.log(APLICAR ? "\n⚙️  MODO APLICAR\n" : "\n🔍 SIMULACIÓN (agrega --aplicar para crear los índices)\n");
  for (const base of BASES) {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST, port: process.env.DB_PORT,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      database: base, connectTimeout: 60000,
    });
    console.log(`📦 ${base}`);
    for (const [tabla, nombre, cols, tipo] of INDICES) {
      const [[{ t }]] = await conn.query(
        "SELECT COUNT(*) t FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [base, tabla]);
      if (!t) { console.log(`   · ${tabla}.${nombre}: tabla no existe, se omite`); continue; }
      const [existentes] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [base, tabla]);
      const nombres = new Set(existentes.map((c) => c.COLUMN_NAME));
      const faltan = cols.filter((c) => !nombres.has(c));
      if (faltan.length) { console.log(`   · ${tabla}.${nombre}: faltan columnas (${faltan.join(", ")}), se omite`); continue; }
      const [[{ ya }]] = await conn.query(
        "SELECT COUNT(*) ya FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?",
        [base, tabla, nombre]);
      if (ya) { console.log(`   ✓ ${tabla}.${nombre}: ya existe`); continue; }
      const sql = `ALTER TABLE \`${tabla}\` ADD ${tipo} INDEX \`${nombre}\` (${cols.map((c) => `\`${c}\``).join(", ")})`;
      if (!APLICAR) { console.log(`   + ${tabla}.${nombre}: se crearía`); continue; }
      const t0 = Date.now();
      await conn.query(sql);
      console.log(`   ✅ ${tabla}.${nombre} creado (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }
    await conn.end();
  }
  console.log("\nListo.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
