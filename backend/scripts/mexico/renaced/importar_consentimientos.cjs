// importar_consentimientos.cjs
// Lleva los avisos de privacidad y consentimientos firmados del sistema PHP anterior a RENACED.
// La ficha de cada paciente ya trae la ruta (aviso_ruta / consentimiento_ruta, migradas);
// aquí solo se mueven los archivos a uploads/renaced_consentimientos/.
//
// Por defecto SOLO SIMULA (cuenta qué archivos existen y cuáles faltan). Desde backend/:
//
//   node scripts/mexico/renaced/importar_consentimientos.cjs
//       → resumen: archivos referenciados, encontrados, faltantes y tamaño total
//
//   node scripts/mexico/renaced/importar_consentimientos.cjs --copiar
//       → copia los archivos a backend/uploads/renaced_consentimientos (servidor local)
//
//   node scripts/mexico/renaced/importar_consentimientos.cjs --subir --api https://TU-BACKEND/api \
//        --email admin@... --password ...
//       → sube los archivos por la API (producción) en tandas; solo lo permite un administrador.
//         Se puede repetir sin problema: los archivos ya enviados se sobrescriben.
//
// Opciones: --dump <ruta .sql>  --origen <carpeta docs/subidas>

const fs = require("fs");
const path = require("path");

const arg = (n, def) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : def; };
const flag = (n) => process.argv.includes(`--${n}`);

const BACKEND = path.join(__dirname, "..", "..", "..");
const DUMP = arg("dump", path.join(BACKEND, "RENACED PHP", "renaced1.sql"));
const ORIGEN = arg("origen", path.join(BACKEND, "RENACED PHP", "renaced-diabetestipo1.mx", "registro", "docs", "subidas"));
const DESTINO = path.join(BACKEND, "uploads", "renaced_consentimientos");
const TANDA_MB = 60;

const nfc = (s) => s.normalize("NFC");

function referenciados() {
  const sql = fs.readFileSync(DUMP, "utf8");
  const rutas = sql.match(/\.\.\/\.\.\/docs\/subidas\/[^']+/g) || [];
  return [...new Set(rutas.map((r) => nfc(r.split("/").pop())))];
}

// Los nombres en disco pueden traer los acentos descompuestos (NFD): se indexan en NFC.
function indiceDisco() {
  const idx = new Map();
  for (const f of fs.readdirSync(ORIGEN)) idx.set(nfc(f), path.join(ORIGEN, f));
  return idx;
}

async function subir(archivos) {
  const api = arg("api"), email = arg("email"), password = arg("password");
  if (!api || !email || !password) throw new Error("Faltan --api, --email y --password");
  const login = await fetch(`${api}/renaced/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  const { token, error } = await login.json();
  if (!token) throw new Error(`Login falló: ${error || login.status}`);

  let enviados = 0, tanda = [], peso = 0;
  const enviar = async () => {
    if (!tanda.length) return;
    const fd = new FormData();
    for (const [nombre, ruta] of tanda) fd.append("archivos", new Blob([fs.readFileSync(ruta)]), nombre);
    const r = await fetch(`${api}/renaced/consentimientos/archivos`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (!r.ok) throw new Error(`La API respondió ${r.status}: ${await r.text()}`);
    enviados += tanda.length;
    console.log(`   ${enviados}/${archivos.length} enviados`);
    tanda = []; peso = 0;
  };
  for (const a of archivos) {
    const mb = fs.statSync(a[1]).size / 1048576;
    if (tanda.length && (peso + mb > TANDA_MB || tanda.length >= 30)) await enviar();
    tanda.push(a); peso += mb;
  }
  await enviar();
}

(async () => {
  const refs = referenciados();
  const disco = indiceDisco();
  const encontrados = refs.filter((r) => disco.has(r));
  const faltan = refs.filter((r) => !disco.has(r));
  const bytes = encontrados.reduce((t, r) => t + fs.statSync(disco.get(r)).size, 0);

  console.log(`\nReferenciados en la base: ${refs.length}`);
  console.log(`Encontrados en ${ORIGEN}: ${encontrados.length} (${(bytes / 1048576).toFixed(0)} MB)`);
  console.log(`Faltantes: ${faltan.length}`);
  if (faltan.length) fs.writeFileSync(path.join(BACKEND, "consentimientos_faltantes.txt"), faltan.join("\n"));
  if (faltan.length) console.log("   (lista en backend/consentimientos_faltantes.txt)");

  const pares = encontrados.map((r) => [r, disco.get(r)]);
  if (flag("copiar")) {
    fs.mkdirSync(DESTINO, { recursive: true });
    for (const [nombre, ruta] of pares) fs.copyFileSync(ruta, path.join(DESTINO, nombre));
    console.log(`\n✅ ${pares.length} archivos copiados a ${DESTINO}`);
  } else if (flag("subir")) {
    console.log("\nSubiendo por la API…");
    await subir(pares);
    console.log(`\n✅ ${pares.length} archivos subidos`);
  } else {
    console.log("\n(simulación: usa --copiar o --subir para aplicar)");
  }
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
