/**
 * Migra el texto libre histórico del campo `anticuerpos` al formato estructurado
 * "Anti-GAD65: X, Anti-IA2: X, ZnT8: X, ICA: X, IAA: X" (X = Positivo/Negativo/Pendiente).
 *
 * Por seguridad clínica, SOLO convierte automáticamente los textos sin ambigüedad
 * (frases claras de "negativo" o "pendiente/no solicitado", o listas explícitas de
 * qué anticuerpo salió positivo). Todo lo demás (valores numéricos de titulación,
 * "No aplica", texto muy corto/ambiguo) se deja SIN TOCAR para revisión manual —
 * seguirá mostrándose como texto libre en la ficha del paciente.
 *
 * Uso:
 *   node migrar_anticuerpos_legacy.cjs            → solo muestra el plan (dry-run)
 *   node migrar_anticuerpos_legacy.cjs --aplicar   → aplica los cambios en BD
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

const CLAVES = ["Anti-GAD65", "Anti-IA2", "ZnT8", "ICA", "IAA"];

const ALIAS = {
  "Anti-GAD65": [/anti[\s-]?gad[\s-]?65/i, /\bgad ?65\b/i, /\bgad\b/i],
  "Anti-IA2":   [/anti[\s-]?ia[\s-]?2/i, /\bia[\s-]?2\b/i],
  "ZnT8":       [/znt8/i, /zinc 8/i],
  "ICA":        [/\bica\b/i],
  "IAA":        [/\biaa\b/i, /anti[\s-]?insulina/i],
};

// Quita del texto los nombres de anticuerpos reconocidos (que ya traen dígitos,
// p.ej. "ZnT8", "GAD65", "IA-2") y dice si sobran números — esos sí son
// titulaciones reales que no debemos interpretar automáticamente.
function tieneNumerosReales(contenido) {
  let restante = contenido;
  Object.values(ALIAS).flat().forEach((re) => {
    restante = restante.replace(new RegExp(re.source, "gi"), "");
  });
  return /\d/.test(restante);
}

function estadoBase(valor) {
  return CLAVES.reduce((acc, k) => ({ ...acc, [k]: valor }), {});
}

function serializar(estado) {
  return CLAVES.map((k) => `${k}: ${estado[k]}`).join(", ");
}

function yaEstructurado(texto) {
  const partes = texto.split(",").map((p) => p.trim());
  if (partes.length !== CLAVES.length) return false;
  const validos = ["Positivo", "Negativo", "Pendiente"];
  return CLAVES.every((k, i) => {
    const [kk, v] = partes[i].split(":").map((s) => s.trim());
    return kk === k && validos.includes(v);
  });
}

// Frases que indican "no se ha hecho / resultado no disponible" → todo Pendiente
const RE_PENDIENTE = /pendiente|no se han solicitado|no se han enviado|no se realizaron|no solicitados|no se lo ha[sn]? realizado|ya se solicitaron|se entreg[oó] boleta|pend\.?$|no se le realizaron/i;

// Frases que indican "todo negativo"
const RE_NEGATIVO = /^\s*(anticuerpos\s+)?negativos?\s*$/i;

function clasificar(nombre, textoOriginal) {
  const texto = textoOriginal.trim();

  if (yaEstructurado(texto)) return { accion: "OMITIR_YA_ESTRUCTURADO" };

  if (RE_NEGATIVO.test(texto)) {
    return { accion: "AUTO", nuevoTexto: serializar(estadoBase("Negativo")) };
  }

  // "ACS Negativos (Pendiente ZnT8)" → todo Negativo salvo el nombrado dentro del paréntesis
  // Si el paréntesis trae números (titulaciones), no confiamos en el split por coma → MANUAL.
  const negConExcepcion = texto.match(/negativos?\s*\(pendiente\s+([^)]+)\)/i);
  if (negConExcepcion && !tieneNumerosReales(negConExcepcion[1])) {
    const estado = estadoBase("Negativo");
    const nombresExcep = negConExcepcion[1].split(/[,y]/i);
    let ok = true;
    nombresExcep.forEach((n) => {
      const clave = CLAVES.find((k) => ALIAS[k].some((re) => re.test(n)));
      if (clave) estado[clave] = "Pendiente"; else ok = false;
    });
    if (ok) return { accion: "AUTO", nuevoTexto: serializar(estado) };
  }

  // "ACS POSITIVOS (Anti-GAD 65, Anti-IA2, ZnT8)" → los nombrados Positivo, resto Pendiente
  // Si trae números (titulaciones tipo "IA2: 819 ZnT8:104"), el split por coma no es confiable → MANUAL.
  const posLista = texto.match(/positivos?\s*\(([^)]+)\)/i);
  if (posLista && !tieneNumerosReales(posLista[1])) {
    const estado = estadoBase("Pendiente");
    const nombres = posLista[1].split(/[,y]/i);
    let algunoReconocido = false;
    nombres.forEach((n) => {
      const clave = CLAVES.find((k) => ALIAS[k].some((re) => re.test(n)));
      if (clave) { estado[clave] = "Positivo"; algunoReconocido = true; }
    });
    if (algunoReconocido) return { accion: "AUTO", nuevoTexto: serializar(estado) };
  }

  if (RE_PENDIENTE.test(texto)) {
    return { accion: "AUTO", nuevoTexto: serializar(estadoBase("Pendiente")) };
  }

  return { accion: "MANUAL", motivo: "Texto ambiguo o con valores numéricos — requiere revisión clínica" };
}

async function run() {
  const aplicar = process.argv.includes("--aplicar");
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "railway",
  });

  const [rows] = await conn.query(
    "SELECT id, nombre, anticuerpos FROM pacientes WHERE anticuerpos IS NOT NULL AND anticuerpos <> ''"
  );

  let auto = 0, manual = 0, omitidos = 0;
  console.log(aplicar ? "🔧 Aplicando migración de anticuerpos legado...\n" : "🔎 Plan de migración (dry-run, no se modifica nada)...\n");

  for (const r of rows) {
    const r2 = clasificar(r.nombre, r.anticuerpos);
    if (r2.accion === "OMITIR_YA_ESTRUCTURADO") { omitidos++; continue; }
    if (r2.accion === "MANUAL") {
      manual++;
      console.log(`  🟡 MANUAL  #${r.id} ${r.nombre} — "${r.anticuerpos}"`);
      continue;
    }
    auto++;
    console.log(`  ✅ AUTO    #${r.id} ${r.nombre}\n       antes: "${r.anticuerpos}"\n       ahora: "${r2.nuevoTexto}"`);
    if (aplicar) {
      await conn.query("UPDATE pacientes SET anticuerpos = ? WHERE id = ?", [r2.nuevoTexto, r.id]);
    }
  }

  console.log(`\n────────────────────────────────────`);
  console.log(`  Auto-convertidos : ${auto}`);
  console.log(`  Necesitan revisión manual : ${manual}`);
  console.log(`  Ya estructurados (omitidos) : ${omitidos}`);
  console.log(aplicar ? "\n🎉 Cambios aplicados en la base de datos." : "\n(Dry-run: no se aplicó nada. Vuelve a correr con --aplicar para guardar los cambios.)");

  await conn.end();
}

run().catch(console.error);
