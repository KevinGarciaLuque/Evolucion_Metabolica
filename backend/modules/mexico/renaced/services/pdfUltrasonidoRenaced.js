// Lee el PDF de un estudio de ultrasonido (probado con Salud Digna). No extrae valores numéricos:
// guarda fecha, tipo de estudio, indicación, hallazgos y conclusión para el expediente.
import { createRequire } from "module";
import fs from "fs";
import { fechaTextual } from "./laboratoriosMx.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// Líneas de pie de página que se repiten en cada hoja
const PIE = /^(estos resultados han sido descargados|dr\.?a?\s|ultrasonografista|ced\.?\s*prof|atentamente|--\s*\d+\s+of\s+\d+\s*--|se recomienda llevar|n[º°]\s*cliente|a quien corresponda)/i;

const dmy = (s) => {
  const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
};

/** Texto del PDF → { estudio, fecha_estudio, indicacion, tecnica, hallazgos, conclusion, sugerencia, ... } */
export function analizarTextoUltrasonido(texto) {
  const t = String(texto || "").replace(/\x00/g, " ").normalize("NFC");
  const lineas = t.split(/\r?\n/).map((l) => l.replace(/[\t\u00a0]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);

  // El informe se reparte entre páginas: se quita el pie y los encabezados repetidos de cada hoja.
  const finInforme = lineas.findIndex((l, i) => i > 3 && /^(reimpresi[oó]n de resultados|rsv\d+|estudios realizados en el centro)/i.test(l));
  const cuerpo = (finInforme > 0 ? lineas.slice(0, finInforme) : lineas).filter((l) => !PIE.test(l));
  const iDesc = cuerpo.findIndex((l) => /^descripci[oó]n de hallazgos/i.test(l));
  const texto2 = cuerpo.slice(iDesc >= 0 ? iDesc + 1 : 0);

  // Secciones por etiqueta: "Indicación del estudio:", "Técnica:", "Hallazgos:", "Conclusión:", "Sugerencia:"
  const ETIQ = [["indicacion", /^indicaci[oó]n del estudio\s*:?\s*/i], ["tecnica", /^t[eé]cnica\s*:?\s*/i],
    ["hallazgos", /^hallazgos\s*:?\s*/i], ["conclusion", /^conclusi[oó]n(?:es)?\s*:?\s*/i], ["sugerencia", /^sugerencia\s*:?\s*/i]];
  const sec = { indicacion: [], tecnica: [], hallazgos: [], conclusion: [], sugerencia: [] };
  let actual = null;
  for (const l of texto2) {
    // los datos del paciente de la siguiente hoja (Folio, Edad, Sexo…) no son contenido
    if (/^(folio|edad|sexo|m[eé]dico|fecha de (nacimiento|toma|validaci[oó]n)|paciente)\s*:/i.test(l) || /^\d{9,}$/.test(l)) continue;
    if (/^nota\s*:/i.test(l)) { actual = null; continue; }   // aviso legal del laboratorio
    const et = ETIQ.find(([, re]) => re.test(l));
    if (et) { actual = et[0]; const resto = l.replace(et[1], "").trim(); if (resto) sec[actual].push(resto); continue; }
    if (actual) sec[actual].push(l);
  }
  const unir = (a) => a.join("\n").replace(/\n(?=[a-záéíóúñ(])/g, " ").trim() || null;

  // Tipo de estudio ("Nombre del estudio :" va en una columna y su valor en otra línea)
  const crudo = t.split("\n").find((l) => /^\s*ULTRASONIDO\b/i.test(l)) || "";
  const estudio = crudo.split("\t")[0].replace(/\s+/g, " ").trim() || null;

  const fecha = fechaTextual(lineas.find((l) => /\d{1,2} de [a-záéíóú]+ de \d{4}/i.test(l)) || "")
    || dmy((t.match(/fecha de toma\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) || [])[1]);
  const sucursal = (t.match(/sucursal\s*:?\s*([A-ZÁÉÍÓÚÑ ]{3,30})/) || [])[1]?.trim() || (t.match(/\b(PUEBLA|CDMX|MONTERREY|GUADALAJARA)\b/) || [])[1] || null;
  const radiologo = (t.match(/DR\.?A?\.?\s+([A-ZÁÉÍÓÚÑ ]{8,60})\s*\n\s*ULTRASONOGRAFISTA/) || [])[1]?.trim() || null;
  const fechaNac = dmy((t.match(/fecha de nacimiento\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) || [])[1]);

  return {
    estudio: estudio && sucursal ? estudio.replace(new RegExp("\\s+" + sucursal + "$", "i"), "") : estudio, fecha_estudio: fecha, sucursal, ultrasonografista: radiologo,
    indicacion: unir(sec.indicacion), tecnica: unir(sec.tecnica), hallazgos: unir(sec.hallazgos),
    conclusion: unir(sec.conclusion), sugerencia: unir(sec.sugerencia),
    cabecera: t.slice(0, 2500), fecha_nacimiento: fechaNac,
  };
}

export async function parsearPDFUltrasonido(ruta) {
  const parser = new PDFParse({ data: fs.readFileSync(ruta) });
  const data = await parser.getText();
  const r = analizarTextoUltrasonido(data.text);
  if (!r.hallazgos && !r.conclusion) {
    const e = new Error("No se reconoció un informe de ultrasonido en el PDF. Verifica que sea un estudio con texto (no una foto).");
    e.code = "FORMATO_NO_RECONOCIDO";
    throw e;
  }
  return r;
}
