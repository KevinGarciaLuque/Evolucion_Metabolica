// cleanup_tratamiento_duplicados.cjs
// Deduplica la tabla `tratamiento` (destino) que quedó con copias EXACTAS por una
// doble ejecución de la migración. Conserva min(id) por grupo de columnas idénticas,
// borra el detalle de los duplicados y luego los tratamientos duplicados.
// Hace RESPALDO previo (tablas *_bk_<fecha>). NO toca tratamientos no duplicados.
// Ejecutar: node cleanup_tratamiento_duplicados.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const CFG = {
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
  connectTimeout: 60000,
};

// Columnas que definen un tratamiento (todas excepto id). Igualdad exacta = duplicado.
const COLS = [
  "paciente_id", "terapia_id", "esquema_insulina_id", "calculo_dosis_id", "dispositivo_id",
  "microinfusora_id", "sub_microinfusora_id", "monit_glucosa_id", "sub_monit_glucosa_id",
  "glucometro_id", "fecha_inicio", "activo", "usuario_id", "fecha_captura",
];

async function delBatch(conn, tabla, columna, ids) {
  let total = 0;
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const [r] = await conn.query(
      `DELETE FROM ${tabla} WHERE ${columna} IN (${chunk.map(() => "?").join(",")})`, chunk);
    total += r.affectedRows;
  }
  return total;
}

async function run() {
  const d = await mysql.createConnection(CFG);
  const DB = CFG.database;
  const STAMP = "20260627";
  console.log(`\n🔄  Conectado a ${DB}\n`);

  // 0) Estado inicial
  const [[ini]] = await d.query("SELECT COUNT(*) n FROM tratamiento");
  const [[iniD]] = await d.query("SELECT COUNT(*) n FROM tratamiento_insulina_detalle");
  console.log(`Inicial: tratamiento=${ini.n}  detalle=${iniD.n}`);

  // 1) RESPALDO
  for (const [src, bk] of [
    ["tratamiento", `tratamiento_bk_${STAMP}`],
    ["tratamiento_insulina_detalle", `tratamiento_insulina_detalle_bk_${STAMP}`],
  ]) {
    const [ex] = await d.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [DB, bk]);
    if (ex[0].n > 0) { console.log(`   ℹ respaldo ${bk} ya existe (lo reuso)`); continue; }
    await d.query(`CREATE TABLE ${bk} AS SELECT * FROM ${src}`);
    const [[c]] = await d.query(`SELECT COUNT(*) n FROM ${bk}`);
    console.log(`   ✅ respaldo ${bk}: ${c.n} filas`);
  }

  // 2) Calcular ids a conservar (min) y a borrar por grupo exacto
  const [rows] = await d.query(`SELECT id, ${COLS.join(",")} FROM tratamiento`);
  const minPorGrupo = new Map();
  for (const r of rows) {
    const key = COLS.map(c => (r[c] === null || r[c] === undefined) ? "∅" : String(r[c])).join("‖");
    const id = Number(r.id);
    if (!minPorGrupo.has(key) || id < minPorGrupo.get(key)) minPorGrupo.set(key, id);
  }
  const borrar = [];
  for (const r of rows) {
    const key = COLS.map(c => (r[c] === null || r[c] === undefined) ? "∅" : String(r[c])).join("‖");
    const id = Number(r.id);
    if (minPorGrupo.get(key) !== id) borrar.push(id);
  }
  console.log(`\nGrupos únicos: ${minPorGrupo.size}  |  tratamientos a BORRAR: ${borrar.length}`);

  if (borrar.length === 0) {
    console.log("Nada que borrar. Fin.");
    await d.end();
    return;
  }

  // 3) Borrar detalle de los tratamientos duplicados
  const detBorradas = await delBatch(d, "tratamiento_insulina_detalle", "tratamiento_id", borrar);
  console.log(`   🗑 detalle borrado: ${detBorradas}`);

  // 4) Borrar tratamientos duplicados
  const txBorrados = await delBatch(d, "tratamiento", "id", borrar);
  console.log(`   🗑 tratamientos borrados: ${txBorrados}`);

  // 5) Verificación
  const [[fin]] = await d.query("SELECT COUNT(*) n FROM tratamiento");
  const [[finD]] = await d.query("SELECT COUNT(*) n FROM tratamiento_insulina_detalle");
  const [[dup]] = await d.query(`
    SELECT COUNT(*) n FROM (
      SELECT COUNT(*) c FROM tratamiento GROUP BY ${COLS.join(",")} HAVING c>1
    ) x`);
  const [[orf]] = await d.query(`
    SELECT COUNT(*) n FROM tratamiento_insulina_detalle dt
    LEFT JOIN tratamiento t ON t.id=dt.tratamiento_id WHERE t.id IS NULL`);
  console.log(`\n✅ Final: tratamiento=${fin.n}  detalle=${finD.n}`);
  console.log(`   grupos duplicados restantes: ${dup.n}  (debe ser 0)`);
  console.log(`   detalle huérfano (sin tratamiento): ${orf.n}  (debe ser 0)`);
  console.log(`\nRespaldos: tratamiento_bk_${STAMP}, tratamiento_insulina_detalle_bk_${STAMP}`);

  await d.end();
}
run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
