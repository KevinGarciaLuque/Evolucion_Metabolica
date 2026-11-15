// Lee el PDF de un examen de laboratorio y lo traduce a las columnas de `laboratorio`.
// Probado con el formato del Laboratorio Central del INCMNSZ ("PRUEBA UNIDADES VALORES DE REFERENCIA"):
// cada resultado va en una línea "Nombre  valor  unidad  referencia".
import { createRequire } from "module";
import fs from "fs";
import { leerExamen } from "./laboratoriosMx.js";

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
    re: /^glucosa(\s*,?\s*(en\s+ayuno?s?|en\s+suero|s[eé]rica|suero|plasm[aá]tica(\s+en\s+ayuno?s?)?))?(?=\s+\d)/i },
  { col: "vitamina_d",          label: "Vitamina D (25-OH)",            unidad: "ng/ml",
    re: /^(25\s*-?\s*(oh|hidroxi)\s*)?vitamina\s+d(\s+25\s*-?\s*(oh|hidroxi))?/i },
  { col: "volumen_urinario",    label: "Volumen urinario",              unidad: "ml",
    re: /^volumen\s+urinario/i },
  { col: "microalbuminuria",    label: "Albuminuria",                   unidad: "mg",
    re: /^(microalbuminuria|microalb[uú]mina|albuminuria(\s+cuantitativa)?|albumina\s+en\s+orina)/i },
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
    re: /^(creatinina|creatina)\s*,?\s+(urinaria|en\s+orina|orina)/i },
  { col: "tasa_filtracion",     label: "Depuración de creatinina / TFG", unidad: "ml/min",
    re: /^(depuraci[oó]n\s+de\s+creatinina|tasa\s+de\s+filtrado|filtrado\s+glomerular|tfg)/i },
  { col: "rel_album_creat",     label: "Relación albúmina/creatinina",  unidad: "mg/g",
    re: /^relaci[oó]n\s+albumina\s*\/\s*creatinina/i },
  { col: "creatinina",          label: "Creatinina sérica",             unidad: "mg/dl",
    re: /^creatinina(\s*,?\s*(s[eé]rica|en\s+suero|suero))?(?=\s+\d)/i },
  { col: "colesterol_total",    label: "Colesterol total",              unidad: "mg/dl",
    re: /^(colesterol\s+total|colesterol(?=\s+\d))/i },
  { col: "hdl",                 label: "Colesterol HDL",                unidad: "mg/dl",
    re: /^(colesterol\s+hdl|colesterol\s+de\s+lipoprote[ií]nas?\s+de\s+alta\s+densidad|lipoprote[ií]nas?\s+de\s+alta\s+densidad(\s*\(hdl\))?|hdl)/i },
  { col: "ldl",                 label: "Colesterol LDL",                unidad: "mg/dl",
    re: /^(colesterol\s+ldl(\s*\((medido|calculado)\))?|colesterol\s+de\s+ldl|lipoprote[ií]nas?\s+de\s+baja\s+densidad(\s*\(ldl\))?|ldl)/i },
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

// Análisis que solo tienen sentido en orina (el resto se ignora si la fila viene de orina).
const SOLO_ORINA = new Set(["microalbuminuria", "creatinina_urinaria", "rel_album_creat", "volumen_urinario"]);

const normUnidad = (u) => String(u || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/μ/g, "µ").replace(/\s/g, "");
// Unidades equivalentes que no merecen aviso
const UNIDAD_EQUIV = [["mg", "mg/l", "mg/24h"], ["µui/ml", "µu/ml", "uui/ml", "uiu/ml", "miu/l", "mui/l", "mul/l", "µiu/ml"], ["ui/ml", "iu/ml", "u/ml"]];
const mismaUnidad = (a, b) => normUnidad(a) === normUnidad(b) || UNIDAD_EQUIV.some((g) => g.includes(normUnidad(a)) && g.includes(normUnidad(b)));

/** Analiza el texto de un examen y devuelve los valores reconocidos (columnas) y todos los demás resultados. */
export function analizarTextoLaboratorio(texto, laboratorioForzado) {
  const ex = leerExamen(texto, laboratorioForzado);
  const valores = {};
  const detalle = [];   // reconocidos → columna de `laboratorio`
  const otros = [];     // el resto de resultados del PDF
  const avisos = [];
  const vistos = new Set();

  for (const f of ex.filas) {
    let a = null;
    for (const cand of ANALITOS) {
      if (valores[cand.col] != null) continue;
      if (!cand.re.test(`${f.nombre} ${f.valor}`)) continue;
      const deOrina = f.origen === "orina";
      if (SOLO_ORINA.has(cand.col) !== deOrina && !(SOLO_ORINA.has(cand.col) && /orina|urinari|albumin/i.test(f.nombre))) continue;
      a = cand; break;
    }
    if (a) {
      if (f.menor_mayor) { avisos.push(`${a.label}: el resultado viene como "${f.menor_mayor}${f.valor}", captúralo a mano`); continue; }
      if (f.unidad && !mismaUnidad(f.unidad, a.unidad)) avisos.push(`${a.label}: unidad "${f.unidad}" distinta a la esperada (${a.unidad}); verifica el valor`);
      valores[a.col] = f.valor;
      detalle.push({ col: a.col, label: a.label, valor: f.valor, unidad: f.unidad || a.unidad, linea: f.linea });
    } else {
      const k = `${norm(f.nombre)}|${f.origen}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      otros.push({ nombre: f.nombre, valor: f.valor, unidad: f.unidad, referencia: f.referencia, origen: f.origen, signo: f.menor_mayor });
    }
  }
  return {
    valores, detalle, otros, avisos,
    laboratorio: ex.laboratorio, laboratorio_nombre: ex.laboratorio_nombre,
    fecha_muestra: ex.fecha_muestra, curp: ex.curp, cabecera: ex.cabecera,
  };
}

export async function parsearPDFLaboratorio(ruta, laboratorio) {
  const parser = new PDFParse({ data: fs.readFileSync(ruta) });
  const data = await parser.getText();
  const res = analizarTextoLaboratorio(data.text, laboratorio);
  if (!res.detalle.length && !res.otros.length) {
    const e = new Error("No se reconoció ningún análisis en el PDF. Verifica que sea un examen de laboratorio con texto (no una foto).");
    e.code = "FORMATO_NO_RECONOCIDO";
    throw e;
  }
  return res;
}
