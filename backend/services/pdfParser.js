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

  // ─── Extracción posicional del bloque TDR (Syai X1) ─────────────────────────
  // El PDF Syai X1 lista PRIMERO todos los labels y LUEGO todos los % en orden:
  // Los % aparecen después de "<54 mg/dL" y antes de "GRI:"
  // Orden: [0]=Muy Alto(>250)  [1]=Alto(181-250)  [2]=Objetivo(TIR)
  //        [3]=Bajo(54-69)     [4]=Muy Bajo(<54)
  const tdrPercents = (() => {
    const m = texto.match(/<54\s*mg\/dL([\s\S]{3,700}?)GRI[：:\s]/i);
    if (!m) return null;
    const bloque = m[1];
    const nums = [];
    const re = /(\d+[,.]?\d*)\s*%/g;
    let hit;
    while ((hit = re.exec(bloque)) !== null) {
      nums.push(parseFloat(hit[1].replace(",", ".")));
      if (nums.length === 5) break;
    }
    return nums.length >= 2 ? nums : null;
  })();

  // ─── TAR (Tiempo Arriba del Rango >180 mg/dL) ────────────────────────────────
  const tar = extraer(texto, [
    /(?:encima|arriba|sobre)\s+del\s+objetivo[^：:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /TAR[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /tiempo\s+(?:arriba|sobre|encima|alto)[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /(?:>180|>10[,.]0)[^:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /(\d+[,.]?\d*)\s*%\s*\(\s*[13]\s*d[ií]a[s]?\s*[14]/i,
  ]);

  // ─── TAR Muy Alto (>250 mg/dL) ───────────────────────────────────────────────
  const tarMuyAlto = (tdrPercents && tdrPercents[0] != null)
    ? tdrPercents[0]
    : extraer(texto, [
        /muy\s+alto[^(]*>250[^(]*?(\d+[,.]?\d*)\s*%/i,
        />250\s*mg\/dL[^0-9]*(\d+[,.]?\d*)\s*%/i,
      ]);

  // ─── TAR Alto (181-250 mg/dL) ────────────────────────────────────────────────
  const tarAlto = (tdrPercents && tdrPercents[1] != null)
    ? tdrPercents[1]
    : extraer(texto, [
        /(?<!muy\s)alto[^(]*181\s*[-–]\s*250[^(]*?(\d+[,.]?\d*)\s*%/i,
        /181\s*[-–]\s*250[^0-9]*(\d+[,.]?\d*)\s*%/i,
      ]);

  // ─── TBR (Tiempo Abajo del Rango <70 mg/dL) ──────────────────────────────────
  const tbr = extraer(texto, [
    /(?:debajo|bajo|abajo)\s+del\s+objetivo[^：:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /TBR[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /tiempo\s+(?:abajo|bajo|debajo)[：:\s]+(\d+[,.]?\d*)\s*%/i,
    /(?:<70|<3[,.]9)[^:\n]*[：:]\s*(\d+[,.]?\d*)\s*%/i,
    /(\d+[,.]?\d*)\s*%\s*\(\s*3\s*horas/i,
  ]);

  // ─── TBR Bajo (54-69 mg/dL) ──────────────────────────────────────────────────
  const tbrBajo = (tdrPercents && tdrPercents[3] != null)
    ? tdrPercents[3]
    : extraer(texto, [
        /(?<!muy\s)bajo[^(]*54\s*[-–]\s*69[^(]*?(\d+[,.]?\d*)\s*%/i,
        /54\s*[-–]\s*69[^0-9]*(\d+[,.]?\d*)\s*%/i,
      ]);

  // ─── TBR Muy Bajo (<54 mg/dL) ────────────────────────────────────────────────
  const tbrMuyBajo = (tdrPercents && tdrPercents[4] != null)
    ? tdrPercents[4]
    : extraer(texto, [
        /muy\s+bajo[^(]*<54[^(]*?(\d+[,.]?\d*)\s*%/i,
        /<54[^0-9]*(\d+[,.]?\d*)\s*%/i,
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
    tarMuyAlto,
    tarAlto,
    tbr,
    tbrBajo,
    tbrMuyBajo,
    gmi,
    cv,
    tiempoActivo,
    glucosaPromedio,
    gri,
    eventosHipoglucemia: eventosHipo,
    duracionHipoglucemia: duracionHipo,
    textoCompleto: texto.substring(0, 5000), // primeros 5000 chars para revisión
  };
}
