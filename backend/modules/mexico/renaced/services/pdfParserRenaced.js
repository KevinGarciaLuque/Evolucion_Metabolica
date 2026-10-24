import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ─── Utilidades ───────────────────────────────────────────────────────────────
const MESES = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function num(m) {
  if (!m) return null;
  const v = parseFloat(String(m[1]).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function buscarNum(texto, patrones) {
  for (const p of patrones) {
    const m = texto.match(p);
    const v = num(m);
    if (v != null) return v;
  }
  return null;
}

// "6 jul 2026" / "6 jul. 2026" / "19 julio 2026" → "2026-07-19"
function fechaEsp(str) {
  if (!str) return null;
  const m = str.match(/(\d{1,2})\s+de?\s*([a-záéíóú]+)\.?\s+(?:de\s+)?(\d{4})/i)
    || str.match(/(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})/i);
  if (!m) return null;
  const dia = m[1];
  const mes = MESES[m[2].toLowerCase().replace(/\.$/, "")] || MESES[m[2].toLowerCase().substring(0, 3)];
  if (!mes) return null;
  return `${m[3]}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function tipoPeriodo(dias) {
  if (dias == null) return null;
  if (dias <= 20) return "2s";
  if (dias >= 60 && dias <= 100) return "3m";
  return "otro";
}

function suma(...vals) {
  const nums = vals.filter((v) => v != null);
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) * 10) / 10;
}

// ─── Parser: AGP FreeStyle Libre (LibreView) ─────────────────────────────────
function parseLibreViewAGP(texto) {
  const t = texto.replace(/\x00/g, " ");

  // Periodo: "14 Días 6 jul 2026  19 jul 2026"
  const per = t.match(/(\d+)\s*D[ií]as\s+(\d{1,2}\s+[a-záéíóú]+\.?\s+\d{4})\s+(\d{1,2}\s+[a-záéíóú]+\.?\s+\d{4})/i)
    || t.match(/(\d{1,2})\s+[a-záéíóú]+\s+\d{4}\s*[-–]\s*(\d{1,2})\s+[a-záéíóú]+\s+\d{4}\s*\((\d+)\s*D[ií]as\)/i);

  let periodo_dias = null, fecha_inicio = null, fecha_fin = null;
  if (per) {
    if (per[3] && /[a-z]/i.test(per[2])) {
      periodo_dias = parseInt(per[1], 10);
      fecha_inicio = fechaEsp(per[2]);
      fecha_fin = fechaEsp(per[3]);
    }
  }
  if (periodo_dias == null) {
    const d = t.match(/\((\d+)\s*D[ií]as\)/i) || t.match(/(\d+)\s*D[ií]as/i);
    if (d) periodo_dias = parseInt(d[1], 10);
  }
  if (!fecha_inicio || !fecha_fin) {
    const rango = t.match(/(\d{1,2}\s+[a-záéíóú]+\s+\d{4})\s*[-–]\s*(\d{1,2}\s+[a-záéíóú]+\s+\d{4})/i);
    if (rango) { fecha_inicio = fecha_inicio || fechaEsp(rango[1]); fecha_fin = fecha_fin || fechaEsp(rango[2]); }
  }

  const tir = buscarNum(t, [
    /70\s+180\s*\(mg\/dL\)\s*Objetivo:\s*>\s*70%\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /Objetivo:\s*>\s*70%\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /%\s*dentro del rango\s*\n\s*(\d+(?:[.,]\d+)?)/i,
  ]);

  const tar_muy_alto = buscarNum(t, [
    /Muy elevado\s*\n\s*<\s*5%\s*(\d+(?:[.,]\d+)?)\s*%/i,
    />\s*250[^\n]*?\n?\s*(\d+(?:[.,]\d+)?)\s*%/i,
  ]);
  const tar_alto = buscarNum(t, [
    /(?:^|\n)\s*Alta\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /181\s*[-–]\s*250[^\n]*?(\d+(?:[.,]\d+)?)\s*%/i,
  ]);
  let tar = buscarNum(t, [
    /Objetivo:\s*<\s*25%\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /%\s*arriba del rango[\s\S]{0,40}?(\d+)\s*\n/i,
  ]);
  if (tar == null) tar = suma(tar_muy_alto, tar_alto);

  const tbr_bajo = buscarNum(t, [
    /(?:^|\n)\s*Baja\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /54\s*[-–]\s*69[^\n]*?(\d+(?:[.,]\d+)?)\s*%/i,
  ]);
  const tbr_muy_bajo = buscarNum(t, [
    /Muy bajo\s*\n\s*<\s*1%\s*(\d+(?:[.,]\d+)?)\s*%/i,
    /<\s*54[^\n]*?\n?\s*(\d+(?:[.,]\d+)?)\s*%/i,
  ]);
  let tbr = buscarNum(t, [
    /Objetivo:\s*<\s*4%\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /%\s*debajo del rango[\s\S]{0,40}?(\d+)\s*\n/i,
  ]);
  if (tbr == null) tbr = suma(tbr_bajo, tbr_muy_bajo);

  const glucosa_promedio = buscarNum(t, [
    /Glucosa promedio\s*\n\s*Objetivo:\s*<\s*\d+\s*mg\/dL\s*[\t ]*(\d+(?:[.,]\d+)?)\s*mg\/dL/i,
    /PROMEDIO\s*\n\s*GLUCOSA\s*\n\s*(\d+(?:[.,]\d+)?)\s*mg\/dL/i,
    /Glucosa promedio[\s\S]{0,80}?(\d{2,3}(?:[.,]\d+)?)\s*mg\/dL/i,
  ]);

  const gmi = buscarNum(t, [
    /Indicador de control de glucosa\s*GMI[\s\S]{0,120}?(\d+(?:[.,]\d+)?)\s*%/i,
    /GMI\s*(\d+(?:[.,]\d+)?)\s*%/i,
  ]);

  const cv = buscarNum(t, [
    /coeficiente de variaci[óo]n[\s\S]{0,120}?Objetivo:\s*<\s*\d+\s*%\s*(\d+(?:[.,]\d+)?)\s*%/i,
    /Variabilidad de glucosa[\s\S]{0,160}?Objetivo:\s*<\s*\d+\s*%\s*(\d+(?:[.,]\d+)?)\s*%/i,
    /coeficiente de variaci[óo]n[\s\S]{0,80}?(\d+(?:[.,]\d+)?)\s*%/i,
  ]);

  const tiempo_activo = buscarNum(t, [
    /Tiempo de sensor activo\s*(\d+(?:[.,]\d+)?)\s*%/i,
    /EST[ÁA]\s*ACTIVO\s*[\t ]*(\d+(?:[.,]\d+)?)\s*%/i,
    /Uso del sensor[\s\S]{0,120}?(\d+(?:[.,]\d+)?)\s*%/i,
  ]);

  const escaneos_dia = buscarNum(t, [
    /Escaneos\/Vistas promedio\s*[\t ]*(\d+(?:[.,]\d+)?)\s*\/\s*d[íi]a/i,
  ]);

  const eventos_hipoglucemia = buscarNum(t, [
    /EVENTOS DE GLUCOSA BAJA\s*\n\s*(\d+)/i,
    /Eventos de glucosa baja\s*\n\s*(\d+)/i,
  ]);
  const duracion_hipoglucemia = buscarNum(t, [
    /Duraci[óo]n promedio\s*[\t ]*(\d+)\s*Min/i,
  ]);

  const gri = buscarNum(t, [/GRI[：:\s]+(\d+(?:[.,]\d+)?)/i]);
  const desv_std = buscarNum(t, [/desviaci[óo]n est[áa]ndar[\s\S]{0,60}?(\d+(?:[.,]\d+)?)/i]);

  const dispositivo = (t.match(/Dispositivo\(s\)\s*(FreeStyle\s*\w+)/i) || [])[1] || "FreeStyle Libre";

  return {
    monitor: "FreeStyle Libre (AGP)",
    dispositivo,
    periodo_dias,
    periodo_tipo: tipoPeriodo(periodo_dias),
    fecha_inicio,
    fecha_fin,
    glucosa_promedio,
    gmi,
    cv,
    desv_std,
    tiempo_activo,
    escaneos_dia,
    tir,
    tar,
    tar_muy_alto,
    tar_alto,
    tbr,
    tbr_bajo,
    tbr_muy_bajo,
    gri,
    eventos_hipoglucemia,
    duracion_hipoglucemia,
  };
}

// ─── Detección de tipo de monitor ────────────────────────────────────────────
function detectarMonitor(texto) {
  const t = texto.toLowerCase();
  if (t.includes("informe del agp") || t.includes("perfil ambulatorio de glucosa") ||
      t.includes("freestyle libre") || t.includes("librelink") || t.includes("libreview")) {
    return "libreview_agp";
  }
  // Espacio para los otros monitores de México (Dexcom, Medtronic, Syai, etc.)
  return null;
}

/**
 * Parsea un PDF de monitoreo continuo de glucosa para RENACED.
 * Detecta el tipo de reporte y aplica el parser correspondiente.
 * @param {string} rutaArchivo Ruta absoluta al PDF
 */
export async function parsearPDFRenaced(rutaArchivo) {
  const buffer = fs.readFileSync(rutaArchivo);
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const texto = data.text || "";

  const tipo = detectarMonitor(texto);
  if (tipo !== "libreview_agp") {
    const err = new Error(
      "No se reconoció el formato del reporte PDF. Por ahora sólo se admite el reporte AGP de FreeStyle Libre (LibreView)."
    );
    err.code = "FORMATO_NO_RECONOCIDO";
    throw err;
  }

  const datos = parseLibreViewAGP(texto);
  return { ...datos, textoExtraido: texto.substring(0, 6000) };
}
