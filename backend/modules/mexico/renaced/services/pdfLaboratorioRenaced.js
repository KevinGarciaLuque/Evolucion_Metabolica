// Lee el PDF de un examen de laboratorio y lo traduce a las columnas de `laboratorio`.
// Probado con el formato del Laboratorio Central del INCMNSZ ("PRUEBA UNIDADES VALORES DE REFERENCIA"):
// cada resultado va en una línea "Nombre  valor  unidad  referencia".
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// Cada análisis: columna, etiqueta, unidad esperada, patrón del nombre en la línea y
// (opcional) patrón de exclusión. El orden importa: lo más específico va primero.
export const ANALITOS = [
  { col: "hba1c",               label: "HbA1c",                         unidad: "%",
    re: /^(hemoglobina\s+glic[o]?silada(\s+a1c)?|hemoglobina\s+glucosilada|hba1c|hb\s*a1c)/i },
  { col: "peptido_c_azar",      label: "Péptido C al azar",             unidad: "ng/ml",
    re: /^p[eé]ptido\s+c\s+(al\s+azar|aleatorio)/i },
  { col: "c_peptido",           label: "Péptido C en ayunas",           unidad: "ng/ml",
    re: /^p[eé]ptido\s+c(\s+en\s+ayuno?s?)?(?=\s|$)/i },
  { col: "glucosa_postprandial", label: "Glucosa 2 h post-carga",       unidad: "mg/dl",
    re: /^glucosa\s+(2\s*h(rs?|oras)?|post\s*-?\s*(prandial|carga)|poscarga)/i },
  { col: "glucosa_azar",        label: "Glucosa al azar",               unidad: "mg/dl",
    re: /^glucosa\s+(al\s+azar|aleatoria|casual)/i },
  { col: "glucosa_ayuno",       label: "Glucosa en ayuno",              unidad: "mg/dl",
    re: /^glucosa(\s+(en\s+ayuno?s?|s[eé]rica|plasm[aá]tica(\s+en\s+ayuno?s?)?))?(?=\s+\d)/i },
  { col: "vitamina_d",          label: "Vitamina D (25-OH)",            unidad: "ng/ml",
    re: /^(25\s*-?\s*hidroxi\s*)?vitamina\s+d(\s+25\s*-?\s*hidroxi)?/i },
  { col: "volumen_urinario",    label: "Volumen urinario",              unidad: "ml",
    re: /^volumen\s+urinario/i },
  { col: "microalbuminuria",    label: "Albuminuria",                   unidad: "mg",
    re: /^(microalbuminuria|albuminuria(\s+cuantitativa)?|albumina\s+en\s+orina)/i },
  { col: "anti_gad",            label: "Anti-GAD",                      unidad: "nmol/l",
    re: /^anti\s*-?\s*gad(65)?/i },
  { col: "anti_insulina",       label: "Anti-Insulina",                 unidad: "nmol/l",
    re: /^(anti\s*-?\s*insulina|iaa)/i },
  { col: "anti_islotes",        label: "Anti-Islotes",                  unidad: "nmol/l",
    re: /^(anti\s*-?\s*islotes|ica)(?=\s)/i },
  { col: "anti_ia2",            label: "Anti-IA2",                      unidad: "nmol/l",
    re: /^anti\s*-?\s*ia\s*-?\s*2/i },
  { col: "anti_zct8",           label: "Anti-ZnT8",                     unidad: "nmol/l",
    re: /^anti\s*-?\s*(zct8|znt8|zn?t\s*8)/i },
  { col: "anti_tpo",            label: "Anti-TPO",                      unidad: "ui/ml",
    re: /^(anticuerpos\s+)?anti\s*-?\s*(tiroperoxidasa|peroxidasa|tpo)|^anticuerpos\s+antitiroperoxidasa/i },
  { col: "creatinina_urinaria", label: "Creatinina urinaria",           unidad: "mg/dl",
    re: /^creatinina\s+(urinaria|en\s+orina)/i },
  { col: "tasa_filtracion",     label: "Depuración de creatinina / TFG", unidad: "ml/min",
    re: /^(depuraci[oó]n\s+de\s+creatinina|tasa\s+de\s+filtrado|filtrado\s+glomerular|tfg)/i },
  { col: "rel_album_creat",     label: "Relación albúmina/creatinina",  unidad: "mg/g",
    re: /^relaci[oó]n\s+albumina\s*\/\s*creatinina/i },
  { col: "creatinina",          label: "Creatinina sérica",             unidad: "mg/dl",
    re: /^creatinina(\s+s[eé]rica)?(?=\s+\d)/i },
  { col: "colesterol_total",    label: "Colesterol total",              unidad: "mg/dl",
    re: /^colesterol\s+total/i },
  { col: "hdl",                 label: "Colesterol HDL",                unidad: "mg/dl",
    re: /^(colesterol\s+hdl|lipoprote[ií]nas?\s+de\s+alta\s+densidad(\s*\(hdl\))?|hdl)/i },
  { col: "ldl",                 label: "Colesterol LDL",                unidad: "mg/dl",
    re: /^(colesterol\s+ldl(\s*\((medido|calculado)\))?|lipoprote[ií]nas?\s+de\s+baja\s+densidad(\s*\(ldl\))?|ldl)/i },
  { col: "trigliceridos",       label: "Triglicéridos",                 unidad: "mg/dl",
    re: /^trigl[ií]c[eé]ridos/i },
  { col: "tsh",                 label: "TSH",                           unidad: "µui/ml",
    re: /^(tsh|hormona\s+estimulante\s+de\s+la\s+tiroides)/i },
  { col: "acido_urico",         label: "Ácido úrico",                   unidad: "mg/dl",
    re: /^[aá]cido\s+[uú]rico/i },
  { col: "insulinemia",         label: "Insulina basal",                unidad: "µui/ml",
    re: /^insulina(\s+(basal|en\s+ayuno?s?|s[eé]rica))?(?=\s+\d)/i },
];

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Unidad tal como viene → forma comparable ("mg/dL", "µUI/mL", "μUI/mL" …)
const normUnidad = (u) => norm(u).replace(/μ/g, "µ").replace(/\s/g, "");

const UNIDAD_RE = /^(%|[a-zµμ]{1,4}\/[a-zµμ]{1,4}|[a-zµμ]{1,4}\/\d*[a-z]{1,3}|x10[∧^]\d\/[µμ]l)/i;

function fechaDMY(s) {
  const m = s && s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Analiza el texto de un examen y devuelve los valores reconocidos. */
export function analizarTextoLaboratorio(texto) {
  const t = String(texto || "").replace(/\x00/g, " ").normalize("NFC");
  const lineas = t.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  const valores = {};
  const detalle = [];   // [{ col, label, valor, unidad, linea }]
  const avisos = [];

  for (const linea of lineas) {
    for (const a of ANALITOS) {
      if (valores[a.col] != null) continue;
      const m = linea.match(a.re);
      if (!m) continue;
      // lo que sigue al nombre: "218.1 mg/dL 74 - 100"
      const resto = linea.slice(m[0].length).trim();
      const mv = resto.match(/^[:=]?\s*([<>]?\s*\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (!mv) continue;
      if (/^[<>]/.test(mv[1].trim())) { avisos.push(`${a.label}: el resultado viene como "${mv[1].trim()}", captúralo a mano`); break; }
      const valor = parseFloat(mv[1].replace(",", "."));
      if (!Number.isFinite(valor)) continue;
      const um = mv[2].match(UNIDAD_RE);
      const unidad = um ? um[0] : "";
      if (unidad && normUnidad(unidad) !== normUnidad(a.unidad)) {
        avisos.push(`${a.label}: unidad "${unidad}" distinta a la esperada (${a.unidad}); verifica el valor`);
      }
      valores[a.col] = valor;
      detalle.push({ col: a.col, label: a.label, valor, unidad: unidad || a.unidad, linea });
      break;
    }
  }

  // Fecha de la muestra: la de toma si existe, si no la de creación de la orden (dd/mm/aaaa)
  let fecha_muestra = null;
  for (const re of [/fecha\s+(?:de\s+)?(?:toma|muestra|recolecci[oó]n|extracci[oó]n)[^\d\n]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
                    /fecha\s+(?:de\s+)?creaci[oó]n[^\d\n]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
                    /fecha[^\d\n]*(\d{1,2}\/\d{1,2}\/\d{4})/i]) {
    const m = t.match(re);
    if (m) { fecha_muestra = fechaDMY(m[1]); break; }
  }

  // Nombre del paciente en el encabezado ("APELLIDOS, NOMBRES" en mayúsculas)
  const nombrePdf = (lineas.find((l) => /^[A-ZÁÉÍÓÚÑ ]+,\s*[A-ZÁÉÍÓÚÑ ]+$/.test(l)) || "") || null;
  const curp = (t.match(/\b[A-Z]{4}\d{6}[HM][A-Z]{5}/) || [])[0] || null;

  return { valores, detalle, avisos, fecha_muestra, nombre_pdf: nombrePdf, curp };
}

export async function parsearPDFLaboratorio(ruta) {
  const parser = new PDFParse({ data: fs.readFileSync(ruta) });
  const data = await parser.getText();
  const res = analizarTextoLaboratorio(data.text);
  if (!res.detalle.length) {
    const e = new Error("No se reconoció ningún análisis en el PDF. Verifica que sea un examen de laboratorio con texto (no una foto).");
    e.code = "FORMATO_NO_RECONOCIDO";
    throw e;
  }
  return res;
}
