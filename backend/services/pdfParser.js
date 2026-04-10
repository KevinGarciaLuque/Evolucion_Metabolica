import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

/**
 * Extrae un número de líneas de texto usando un array de patrones regex.
 * Devuelve el primer match encontrado o null.
 */
function extraer(texto, patrones) {
  for (const patron of patrones) {
    const m = texto.match(patron);
    if (m) return parseFloat(m[1].replace(",", "."));
  }
  return null;
}

/**
 * Extrae un string de texto usando un array de patrones regex.
 */
function extraerTexto(texto, patrones) {
  for (const patron of patrones) {
    const m = texto.match(patron);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Parsea el PDF del monitor Syai X1 y extrae las métricas clínicas.
 * @param {string} rutaArchivo Ruta absoluta al PDF
 * @returns {Promise<Object>} Objeto con las métricas extraídas
 */
export async function parsearPDFSyai(rutaArchivo) {
  const buffer = fs.readFileSync(rutaArchivo);
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const texto = data.text;

  // ─── Paciente ────────────────────────────────────────────────────────────────
  const nombrePaciente = extraerTexto(texto, [
    /^([A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\s[A-Za-záéíóúñÁÉÍÓÚÑ]+)+)\s*\n*Cuenta[：:]/m,
    /(?:nombre|paciente|patient)[:\s]+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\n|fecha|id|dob)/i,
  ]);

  // ─── Fechas ───────────────────────────────────────────────────────────────────
  const periodoMatch = texto.match(
    /(?:periodo|período|period)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[-–a]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  );
  const fechaInicio = periodoMatch ? periodoMatch[1] : null;
  const fechaFin    = periodoMatch ? periodoMatch[2] : null;

  // ─── TIR (Tiempo en Rango 70-180 mg/dL) ──────────────────────────────────────
  const tir = extraer(texto, [
    /(?<!encima\s+del\s+)(?<!debajo\s+del\s+)%\s*en\s+objetivo\s*\([^)]*\)[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /TIR[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /tiempo\s+en\s+rango[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /\ben\s+objetivo\s*\([^)]*>70[^)]*\)[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /(?:70[-–]180[^\n]*?)(\d+[,.]?\d*)\s*%/i,
  ]);

  // ─── TAR (Tiempo Arriba del Rango >180 mg/dL) ────────────────────────────────
  const tar = extraer(texto, [
    /(?:encima|arriba|sobre)\s+del\s+objetivo[^：:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /TAR[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /tiempo\s+(?:arriba|sobre|encima|alto)[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /(?:>180|>10[,.]0)[^:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /(\d+[,.]?\d*)\s*%\s*\(\s*[13]\s*d[ií]a[s]?\s*[14]/i,  // % encima matching
  ]);

  // ─── TBR (Tiempo Abajo del Rango <70 mg/dL) ──────────────────────────────────
  const tbr = extraer(texto, [
    /(?:debajo|bajo|abajo)\s+del\s+objetivo[^：:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /TBR[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /tiempo\s+(?:abajo|bajo|debajo)[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /(?:<70|<3[,.]9)[^:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /(\d+[,.]?\d*)\s*%\s*\(\s*3\s*horas/i,  // "1% (3 horas..."
  ]);

  // ─── GMI (Glucose Management Indicator) ──────────────────────────────────────
  const gmi = extraer(texto, [
    /GMI\)[^\n]*\n\s*(\d+[,.]?\d*)\s*%/i,
    /GMI[）)][^\n]*\n[^\n]*\n\s*(\d+[,.]?\d*)\s*%/i,
    /(?:indicador\s+de\s+gesti[oó]n\s+de\s+glucosa)[^%\n]*\n\s*(\d+[,.]?\d*)\s*%/i,
    /GMI[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /glucose\s+management\s+indicator[：:\s]+(\d+[,.]?\d*)/i,
  ]);

  // ─── CV (Coeficiente de Variación) ───────────────────────────────────────────
  const cv = extraer(texto, [
    /(?:coef?iciente?\s+de\s+vari(?:ación|acion)|%CV)[）)：:][^:：\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /\(%CV\)[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /CV[）)][：:\s]+(\d+[,.]?\d*)\s*%/i,
    /CV[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /coef?iciente?\s+de\s+vari(?:ación|acion)[：:\s]+(\d+[,.]?\d*)/i,
  ]);

  // ─── Tiempo activo (sensor wear) ─────────────────────────────────────────────
  const tiempoActivo = extraer(texto, [
    /tiempo\s+activo[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /tiempo\s+de\s+uso[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /sensor\s+(?:use|usage|active|activo)[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /TA[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /uso\s+del\s+sensor[：:\s]+(\d+[,.]?\d*)\s*%/i,
  ]);

  // ─── Glucosa promedio ─────────────────────────────────────────────────────────
  const glucosaPromedio = extraer(texto, [
    /glucosa\s+promedio[：:\s]+(\d+[,.]?\d*)\s*(?:mg\/dL)?/i,
    /promedio\s+de\s+glucosa[：:\s]+(\d+[,.]?\d*)/i,
    /mean\s+glucose[：:\s]+(\d+[,.]?\d*)/i,
    /average\s+glucose[：:\s]+(\d+[,.]?\d*)/i,
    /glucosa\s+media[：:\s]+(\d+[,.]?\d*)/i,
  ]);

  // ─── GRI (Glycemia Risk Index) ────────────────────────────────────────────────
  const gri = extraer(texto, [
    /GRI[：:\s]+(\d+[,.]?\d*)/i,
    /glycemia\s+risk\s+index[：:\s]+(\d+[,.]?\d*)/i,
    /índice\s+de\s+riesgo\s+de\s+glucemia[^:\n]*\n[^0-9]*(\d+[,.]?\d*)/i,
  ]);

  // ─── Hipoglucemia ─────────────────────────────────────────────────────────────
  const eventosHipo = extraer(texto, [
    /eventos?\s+de\s+hipoglucemia[：:\s]+(\d+)/i,
    /hipoglucemia[：:\s]+(\d+)\s*(?:veces?|eventos?)/i,
    /(?:low\s+events?)[：:\s]+(\d+)/i,
  ]);

  const duracionHipo = extraer(texto, [
    /duraci[oó]n\s+promedio[：:\s]+(\d+)\s*(?:min|minutos?)/i,
    /duraci[oó]n\s+(?:de\s+)?hipoglucemia[：:\s]+(\d+)\s*(?:min|minutos?)?/i,
    /tiempo\s+en\s+hipoglucemia[：:\s]+(\d+)/i,
  ]);

  return {
    nombrePaciente,
    fechaInicio,
    fechaFin,
    tir,
    tar,
    tbr,
    gmi,
    cv,
    tiempoActivo,
    glucosaPromedio,
    gri,
    eventosHipoglucemia: eventosHipo,
    duracionHipoglucemia: duracionHipo,
    textoCompleto: texto.substring(0, 3000), // primeros 3000 chars para revisión
  };
}
