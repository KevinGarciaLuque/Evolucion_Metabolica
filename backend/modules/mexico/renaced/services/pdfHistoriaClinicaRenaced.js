// Lee la "Historia clínica" que exporta la plataforma de Clínica EnDi (PDF de primera vez) y la
// traduce a los campos de RENACED. NO guarda nada: devuelve lo reconocido para que la doctora lo revise.
// Probado con un PDF real; si otro PDF trae etiquetas distintas, el campo queda vacío (no se inventa).
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const MESES3 = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const pad = (n) => String(n).padStart(2, "0");

// Secciones del PDF (encabezado → clave)
const SECCIONES = [
  [/^datos personales$/i, "personal"], [/^historia cl[ií]nica$/i, "historia"], [/^motivo de consulta$/i, "motivo"],
  [/^antecedentes heredo-?familiares$/i, "heredo"], [/^ant\.? personales no patol[oó]gicos$/i, "nopat"],
  [/^ant\.? personales patol[oó]gicos$/i, "pat"], [/^antecedentes gineco-?obst[eé]tricos$/i, "go"],
  [/^alimentaci[oó]n$/i, "alim"], [/^distr[eé]s por diabetes$/i, "distres"], [/^autocuidado de diabetes$/i, "auto"],
  [/^microinfusora$/i, "micro"], [/^cuestionarios$/i, "cuest"],
];

// Etiquetas que interesan, por sección. El valor es el resto de la línea (más las líneas que continúan).
export const ETIQUETAS = {
  personal: ["Nombre(s)", "Apellido Paterno", "Apellido Materno", "Fecha de Nacimiento", "Sexo", "Celular", "Hogar", "Ocupación", "Email", "Seguro", "CURP"],
  motivo: ["Motivo de consulta", "Referido por"],
  heredo: ["Diabetes tipo 1", "Diabetes tipo 2", "Enfermedades tiroideas"],
  nopat: ["Tipo de sangre", "Fuma", "Alcohol", "Otras sustancias", "Haces ejercicio", "Qué tipo de ejercicio", "Frecuencia de ejercicio", "Nivel máximo de estudios"],
  pat: ["Alergias", "Cuáles alergias", "Te han hospitalizado", "Fecha y motivo de hospitalización", "Te han realizado alguna cirugía", "Fecha y motivo de cirugías",
    "Enfermedades tiroideas fecha diagnóstico", "Notas enfermedades tiroideas", "Enfermedades tiroideas", "Hipertensión arterial", "Cardiopatías", "Cáncer",
    "Notas sobrepeso", "Sobrepeso", "Obesidad", "Diabetes fecha diagnóstico", "Notas diabetes", "Diabetes", "Problemas de colesterol o triglicéridos",
    "Qué tipo de nacimiento tuviste", "Recibiste lactancia"],
  go: ["Edad primera menstruación", "Fecha última menstruación", "Número de embarazos", "Número de partos", "Número de cesáreas", "Número de abortos", "Método de planificación familiar"],
  alim: ["Cuál es tu estatura", "Cuál es tu peso"],
  distres: ["Vives con diabetes", "Cuándo te diagnosticaron"],
  auto: ["Nivel de HbA1c", "Medidor glucosa en sangre", "Otro medidor de glucosa en sangre", "Medidor flash o continuo de glucosa", "Frecuencia hipoglucemia",
    "Hipoglucemias severas", "Retinopatía", "Nefropatía", "Neuropatía", "Enfermedad vascular periférica", "Pie diabético", "Tipos de insulina", "Cómo te aplicas la insulina"],
  micro: ["Modelo de microinfusora", "Otro modelo de microinfusora"],
};
// Orden por longitud descendente: "Diabetes fecha diagnóstico" debe probarse antes que "Diabetes"
for (const k of Object.keys(ETIQUETAS)) ETIQUETAS[k].sort((a, b) => b.length - a.length);

// Etiquetas del PDF que no importamos: sirven para no pegarlas al valor anterior
const OTRA_ETIQUETA = /^(Te han|Golpes|Esquema de|Enfermedad|Hipertensi|Cardiopat|C[aá]ncer|Tuberculosis|Patolog|Problemas de|Qu[eé] tipo|Recibiste|Tuviste|Tipo de|Antecedentes|Periodo|Cu[aá]nt|El sangrado|N[uú]mero|M[eé]todo|Mastograf|Densitometr|Papanicolaou|Fecha|Resultados|Vacuna|Has tenido|Cu[aá]l|Desayuno|Comida|Cena|Comes|Notas|Vasos|Otros|Bebidas|Nivel|Medidor|Monitoreo|Glucosa|Frecuencia|S[ií]ntomas|Hipoglucemias|Glucagon|Tiras|Alimentos|Carbohidratos|Unidades|C[oó]mo|Modelo|Plan B|Qu[eé] har[ií]as)/;
const PIE =/^(--\s*\d+\s+of\s+\d+\s*--|.+\d{1,2}-[A-Za-z]{3}-\d{4})$/;

/** Texto del PDF → { seccion: { etiqueta: valor } } */
export function segmentarHistoria(texto) {
  const lineas = String(texto || "").replace(/\x00/g, " ").normalize("NFC").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const datos = {};
  let sec = null, actual = null, previa = "";
  for (const l of lineas) {
    const s = SECCIONES.find(([re]) => re.test(l));
    if (s) { sec = s[1]; actual = null; previa = ""; continue; }
    if (!sec) continue;
    const lab = (ETIQUETAS[sec] || []).find((e) => norm(l) === norm(e) || norm(l).startsWith(norm(e) + " "));
    if (!lab && PIE.test(l)) continue;   // pie de página: "Nombre de la paciente 24-Jul-2026" / "-- 3 of 14 --"
    if (lab) {
      datos[sec] ||= {};
      const valor = l.slice(lab.length).trim();
      if (!(lab in datos[sec])) { datos[sec][lab] = valor; actual = [sec, lab]; } else actual = null;
    } else if (actual) {
      // Línea sin etiqueta conocida: continúa el valor anterior si empieza en minúscula, si la anterior llenó el renglón
      // o si es el domicilio ("Hogar", que ocupa varias líneas)
      if (/^[a-záéíóúñ(]/.test(l) || (previa.length >= 48 && !OTRA_ETIQUETA.test(l)) || actual[1] === "Hogar") datos[actual[0]][actual[1]] += (actual[1] === "Hogar" ? "\n" : " ") + l;
      else actual = null;
    }
    previa = l;
  }
  return datos;
}

// ── Conversores ───────────────────────────────────────────────────────────────
const siNo = (v) => { const n = norm(v); return !n ? "" : /^(si|s[ií])\b/.test(n) ? "SI" : /^(no|ninguno|ninguna)\b/.test(n) ? "NO" : ""; };
const numero = (v) => { const m = String(v || "").replace(",", ".").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; };
const anio = (v) => (String(v || "").match(/\b(19|20)\d{2}\b/) || [])[0] || "";
function fechaDMA(v) {            // "29-Dic-1999"
  const m = String(v || "").match(/(\d{1,2})-([A-Za-zñ]{3})[a-z]*-(\d{4})/);
  return m && MESES3[norm(m[2])] ? `${m[3]}-${pad(MESES3[norm(m[2])])}-${pad(m[1])}` : "";
}
function fechaTexto(v) {          // "18 jul 2026" / "18 de julio de 2026" / "25/10/2026"
  const dma = String(v || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dma) return `${dma[3]}-${pad(dma[2])}-${pad(dma[1])}`;
  const m = norm(v).match(/(\d{1,2})\s*(?:de\s+)?([a-z]{3,10})\.?\s*(?:de\s+)?(\d{4})/);
  if (!m) return "";
  const mes = MESES[m[2]] || MESES3[m[2].slice(0, 3)];
  return mes ? `${m[3]}-${pad(mes)}-${pad(m[1])}` : "";
}
const ESTADOS = { aguascalientes: "AS", "baja california": "BC", "baja california sur": "BS", campeche: "CC", chiapas: "CS", chihuahua: "CH", cdmx: "DF", "ciudad de mexico": "DF", "distrito federal": "DF",
  coahuila: "CL", colima: "CM", durango: "DG", guanajuato: "GT", guerrero: "GR", hidalgo: "HG", jalisco: "JC", "estado de mexico": "MC", edomex: "MC", michoacan: "MN", morelos: "MS", nayarit: "NT",
  "nuevo leon": "NL", oaxaca: "OC", puebla: "PL", queretaro: "QT", "quintana roo": "QR", "san luis potosi": "SP", sinaloa: "SL", sonora: "SR", tabasco: "TC", tamaulipas: "TS", tlaxcala: "TL",
  veracruz: "VZ", yucatan: "YN", zacatecas: "ZS" };
const PARENTESCOS = [[/\b(mama|madre)\b/, "Mamá"], [/\b(papa|padre)\b/, "Papá"], [/\bhermano\b/, "Hermano"], [/\bhermana\b/, "Hermana"],
  [/\babuelo\b/, "Abuelo"], [/\babuela\b/, "Abuela"], [/\btio\b/, "Tío"], [/\btia\b/, "Tía"]];

function familiares(valor) {
  const n = norm(valor);
  if (!n) return { si: "", lista: "" };
  if (/^(ninguno|ninguna|no)\b/.test(n)) return { si: "NO", lista: "" };
  const orden = ["Mamá", "Papá", "Hermano", "Hermana", "Abuelo", "Abuela", "Tío", "Tía", "Otro"];
  const marcados = new Set();
  for (const [re, p] of PARENTESCOS) if (re.test(n)) marcados.add(p);
  // "Tío/Primo": el catálogo de RENACED no distingue primo; se marca Tío y se avisa
  return { si: "SI", lista: orden.filter((p) => marcados.has(p)).join(", "), primo: /primo|prima/.test(n) };
}

export const INSULINAS = [[/fiasp/, "15"], [/glargina.*u\s*-?300|toujeo/, "14"], [/lispro|humalog|admelog|lyumjev/, "6"], [/aspart|novorapid|novolog/, "7"], [/glulisina|apidra/, "8"],
  [/degludec|tresiba/, "4"], [/detemir|levemir/, "3"], [/glargina|lantus|basaglar|abasaglar/, "2"], [/\bnph\b|insulatard|humulin n/, "1"]];
export const ORALES = [[/ozempic|semaglutida|rybelsus|liraglutida|victoza|saxenda|dulaglutida|trulicity|wegovy|exenatida/, "7"], [/metformina|glucophage/, "1"],
  [/empagliflozina|dapagliflozina|jardiance|forxiga|canagliflozina/, "9"], [/sitagliptina|januvia|linagliptina|trajenta|vildagliptina/, "8"], [/glibenclamida|glimepirida|gliclazida/, "2"]];

/** Estructura de datos → campos de RENACED. */
export function traducirHistoria(d) {
  const P = d.personal || {}, H = d.heredo || {}, N = d.nopat || {}, T = d.pat || {}, G = d.go || {}, A = d.auto || {}, AL = d.alim || {}, DI = d.distres || {}, M = d.micro || {};
  const avisos = [], no_importado = [];
  const r = { paciente: {}, visita: {}, lab: {}, diagnostico: {}, ago: {}, patologias: [], estilo: {}, tox: {}, trat: null };

  // ── Paciente ──
  if (P["Nombre(s)"]) r.paciente.nombre = P["Nombre(s)"];
  if (P["Apellido Paterno"]) r.paciente.ap_pat = P["Apellido Paterno"];
  if (P["Apellido Materno"]) r.paciente.ap_mat = P["Apellido Materno"];
  const fn = fechaDMA(P["Fecha de Nacimiento"]); if (fn) r.paciente.fecha_nacimiento = fn;
  const sx = norm(P.Sexo); if (sx) r.paciente.sexo = sx.startsWith("fem") ? "F" : sx.startsWith("mas") ? "M" : "";
  if (P.CURP) r.paciente.curp = P.CURP.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (P.Celular) r.paciente.telefonos = P.Celular.replace(/[^\d]/g, "");
  if (P.Email) r.paciente.email = P.Email.trim();
  if (P.Hogar) {
    const l = P.Hogar.split("\n").map((x) => x.trim()).filter(Boolean);
    r.paciente.calle_num = l[0] || "";
    if (l[1]) r.paciente.colonia = l[1];
    const cp = l.map((x) => x.match(/^(.*?)\s*(\d{5})$/)).find(Boolean);
    if (cp) { r.paciente.codigo_postal = cp[2]; const est = ESTADOS[norm(cp[1])]; if (est) r.paciente.estado_residencia = est; }
  }
  const seg = norm(P.Seguro);
  if (seg) {
    r.paciente.seguro_medico_id = /imss bienestar/.test(seg) ? "10" : /imss/.test(seg) ? "1" : /issste/.test(seg) ? "2" : /pemex/.test(seg) ? "4" : /sedena/.test(seg) ? "5"
      : /semar/.test(seg) ? "6" : /sin seguro|ninguno/.test(seg) ? "8" : "7"; // aseguradoras (GNP, AXA, MetLife…) = Privado
  }
  const edu = norm(N["Nivel máximo de estudios"]);
  if (edu) r.paciente.nivel_educativo_id = /posgrado|maestr|doctorad/.test(edu) ? "9" : /licenciatura|universidad/.test(edu) ? "8" : /prepa|bachiller/.test(edu) ? "6"
    : /secundaria/.test(edu) ? "5" : /primaria/.test(edu) ? "3" : /tecnic/.test(edu) ? "7" : "";
  if (!r.paciente.nivel_educativo_id) delete r.paciente.nivel_educativo_id;

  // ── Visita y laboratorio ──
  let est = numero(AL["Cuál es tu estatura"]); const peso = numero(AL["Cuál es tu peso"]);
  if (est && est < 3) est = Math.round(est * 100);            // venía en metros
  if (peso) r.visita.peso = String(peso);
  if (est) r.visita.estatura = String(est);
  const hb = numero(A["Nivel de HbA1c"]);
  if (hb) { r.lab.hba1c = String(hb); avisos.push("La HbA1c (6.3) la reportó la paciente en el cuestionario, no es de un examen: confírmala con el laboratorio."); }

  // ── Diagnóstico ──
  const dxTxt = T["Diabetes fecha diagnóstico"] || DI["Vives con diabetes"] || "";
  const tipo = /gestacional/i.test(dxTxt) ? "3" : /tipo\s*2/i.test(dxTxt) ? "2" : /tipo\s*1|lada/i.test(dxTxt) ? "1" : "";
  if (tipo) r.diagnostico.tipo_diabetes_id = tipo;
  const cuando = DI["Cuándo te diagnosticaron"] || dxTxt;
  const aDx = anio(cuando) || anio(dxTxt);
  if (aDx) {
    r.diagnostico.fecha_approx = 1; r.diagnostico.fecha_approx_anio = aDx;
    const mes = MESES[norm(cuando).split(/\s+/).find((w) => MESES[w])];
    if (mes) r.diagnostico.fecha_approx_mes = String(mes);
  }
  const d1 = familiares(H["Diabetes tipo 1"]), d2 = familiares(H["Diabetes tipo 2"]);
  if (d1.si) { r.diagnostico.antec_dm1 = d1.si; r.diagnostico.antec_dm1_familiares = d1.lista; }
  if (d2.si) { r.diagnostico.antec_dm2 = d2.si; r.diagnostico.antec_dm2_familiares = d2.lista; }
  if (d1.primo || d2.primo) avisos.push("En antecedentes familiares el PDF dice «Tío/Primo»: se marcó Tío; si era un primo, cámbialo a «Otro».");
  const nac = norm(T["Qué tipo de nacimiento tuviste"]);
  if (nac) r.diagnostico.nacido_por = /cesarea/.test(nac) ? "CESAREA" : /parto|vaginal|normal/.test(nac) ? "PARTO" : "OTRO";
  const lac = siNo(T["Recibiste lactancia"]); if (lac) r.diagnostico.lactancia_materna = lac;
  const tiro = siNo(T["Enfermedades tiroideas"]) || (T["Enfermedades tiroideas fecha diagnóstico"] ? "SI" : ""); if (tiro === "SI" || tiro === "NO") r.diagnostico.hipotiroidismo_dx = tiro;

  // ── Antecedentes ginecobstétricos ──
  const men = numero(G["Edad primera menstruación"]); if (men) r.ago.menarca = String(men);
  const fum = fechaTexto(G["Fecha última menstruación"]); if (fum) r.ago.fum = fum;
  const mac = norm(G["Método de planificación familiar"]);
  if (mac) r.ago.mac = /^(ninguno|no)\b/.test(mac) ? "NO" : "SI";
  const gpca = ["Número de embarazos", "Número de partos", "Número de cesáreas", "Número de abortos"].map((k) => G[k]).filter((x) => x !== undefined);
  if (gpca.length) no_importado.push({ etiqueta: "Embarazos / partos / cesáreas / abortos", valor: gpca.join(" / ") + " (registra los embarazos en la sección Embarazo si aplica)" });

  // ── Patologías asociadas ──
  const pat = (nombre, obs) => r.patologias.push({ nombre, fecha_dx: "", activa: 1, observaciones: obs || "" });
  if (tiro === "SI") {
    const nota = [T["Enfermedades tiroideas fecha diagnóstico"], T["Notas enfermedades tiroideas"]].filter(Boolean).join(". ");
    pat(/hipotiroid/i.test(nota) ? "HIPOTIROIDISMO" : "ENFERMEDAD TIROIDEA", nota);
  }
  if (siNo(T.Sobrepeso) === "SI") pat("SOBREPESO", T["Notas sobrepeso"]);
  if (siNo(T.Obesidad) === "SI") pat("OBESIDAD");
  if (siNo(T["Hipertensión arterial"]) === "SI") pat("HIPERTENSIÓN ARTERIAL");
  if (siNo(T["Problemas de colesterol o triglicéridos"]) === "SI") pat("DISLIPIDEMIA");
  if (siNo(T["Cardiopatías"]) === "SI") pat("CARDIOPATÍA");

  // ── Estilo de vida y toxicomanías ──
  const ej = siNo(N["Haces ejercicio"]);
  if (ej) { r.estilo.actividad_fisica = ej; if (ej === "SI") r.estilo.tipo_actividad = [N["Qué tipo de ejercicio"], N["Frecuencia de ejercicio"]].filter(Boolean).join(", "); }
  const tab = norm(N.Fuma), alc = norm(N.Alcohol), dro = norm(N["Otras sustancias"]);
  if (tab) r.tox.tabaco = /^no\b|nunca|no fumo/.test(tab) ? "NO" : "SI";
  if (alc) r.tox.alcohol = /^no\b|nunca|no bebo/.test(alc) ? "NO" : "SI";
  if (dro) r.tox.drogas = /^(ninguna|no)\b/.test(dro) ? "NO" : "SI";
  const obsTox = [N.Fuma && `Tabaco: ${N.Fuma}`, N.Alcohol && `Alcohol: ${N.Alcohol}`, dro && !/^(ninguna|no)\b/.test(dro) && `Otras sustancias: ${N["Otras sustancias"]}`].filter(Boolean).join(". ");
  if (obsTox) r.tox.observaciones = obsTox;

  // ── Tratamiento ──
  const fuente = norm([A["Tipos de insulina"], A["Cómo te aplicas la insulina"], M["Modelo de microinfusora"], M["Otro modelo de microinfusora"], T["Notas diabetes"], T["Notas sobrepeso"]].filter(Boolean).join(" . "));
  const ins = INSULINAS.find(([re]) => re.test(norm(A["Tipos de insulina"] || "") + " " + norm(T["Notas diabetes"] || "")));
  const ora = ORALES.find(([re]) => re.test(fuente));
  const micro = /microinfusora|bomba/.test(fuente);
  if (ins || ora || micro) {
    const t = { terapia_id: ins || micro ? (ora ? "4" : "3") : "2", insulinas: [], orales: [] };
    if (micro) { t.esquema_insulina_id = "5"; t.dispositivo_id = "3"; }
    if (ins) t.insulinas.push({ insulina_id: ins[1], dosis_unidades: "", frecuencia: micro ? "Microinfusora" : "" });
    if (ora) {
      const mg = (fuente.match(/(\d+(?:[.,]\d+)?)\s*mg/) || [])[1];
      t.orales.push({ antidiabetico_id: ora[1], dosis_mg: mg ? mg.replace(",", ".") : "", frecuencia: /semana/.test(fuente) ? "Semanal" : "" });
    }
    r.trat = t;
  }

  // ── Lo que no tiene campo en RENACED: se muestra para que la doctora lo use ──
  const extra = (etiqueta, valor) => { if (valor && !/^(no|ninguno|ninguna)$/i.test(String(valor).trim())) no_importado.push({ etiqueta, valor: String(valor).trim() }); };
  extra("Motivo de consulta", d.motivo?.["Motivo de consulta"]);
  extra("Referido por", d.motivo?.["Referido por"]);
  extra("Alergias", T["Cuáles alergias"] || (siNo(T.Alergias) === "SI" ? "Sí" : ""));
  extra("Hospitalizaciones", T["Fecha y motivo de hospitalización"]);
  extra("Cirugías", T["Fecha y motivo de cirugías"]);
  extra("Tipo de sangre", N["Tipo de sangre"]);
  extra("Glucómetro", [A["Medidor glucosa en sangre"], A["Otro medidor de glucosa en sangre"]].filter((x) => x && !/^otro$/i.test(x)).join(" "));
  extra("Monitor continuo", A["Medidor flash o continuo de glucosa"]);
  extra("Frecuencia de hipoglucemias", A["Frecuencia hipoglucemia"]);
  extra("Hipoglucemias severas", A["Hipoglucemias severas"]);
  extra("Microinfusora", [M["Modelo de microinfusora"] && !/^otro$/i.test(M["Modelo de microinfusora"]) ? M["Modelo de microinfusora"] : "", M["Otro modelo de microinfusora"]].filter(Boolean).join(" "));
  extra("Ocupación", P["Ocupación"]);

  // Complicaciones: si el PDF dice "No" a todas, no hay nada que importar (la ficha ya parte en "NO")
  const comps = ["Retinopatía", "Nefropatía", "Neuropatía", "Pie diabético", "Enfermedad vascular periférica"].filter((k) => siNo(A[k]) === "SI");
  if (comps.length) avisos.push(`El PDF reporta complicaciones (${comps.join(", ")}): captúralas en Comorbilidades, no se importan solas.`);
  return { ...r, avisos, no_importado };
}

export async function parsearHistoriaClinica(ruta) {
  const parser = new PDFParse({ data: fs.readFileSync(ruta) });
  const data = await parser.getText();
  const seg = segmentarHistoria(data.text);
  if (!seg.personal || !(seg.pat || seg.heredo || seg.auto)) {
    const e = new Error("No se reconoció una historia clínica en el PDF. Verifica que sea el PDF de historia clínica con texto (no una foto).");
    e.code = "FORMATO_NO_RECONOCIDO";
    throw e;
  }
  const r = traducirHistoria(seg);
  r.cabecera = data.text.slice(0, 1500);
  return r;
}
