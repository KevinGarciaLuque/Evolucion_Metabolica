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

// ─── Utilidades para reportes en inglés / formatos numéricos ─────────────────
const MESES_EN = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// "Jul 21, 2026" / "July 28, 2026" → "2026-07-21"
function fechaEn(str) {
  const m = str && str.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s*(\d{4})/);
  if (!m) return null;
  const mes = MESES_EN[m[1].toLowerCase().substring(0, 3)];
  return mes ? iso(m[3], mes, m[2]) : null;
}

// "12/06/26" → "2026-06-12"
function fechaDMY(d, m, y) {
  const anio = String(y).length === 2 ? 2000 + parseInt(y, 10) : y;
  return iso(anio, m, d);
}

// "<1" → 0.5, "46" → 46
function pct(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (t.startsWith("<")) return 0.5;
  const v = parseFloat(t.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

// GMI estimado a partir del promedio (fórmula de consenso internacional)
const gmiDesdePromedio = (prom) =>
  prom == null ? null : Math.round((3.31 + 0.02392 * prom) * 10) / 10;

// Registro con todos los campos en null; cada parser sólo rellena los suyos.
function resultado(monitor, dispositivo, datos, extras = []) {
  const base = {
    monitor, dispositivo,
    periodo_dias: null, periodo_tipo: null, fecha_inicio: null, fecha_fin: null,
    glucosa_promedio: null, gmi: null, cv: null, desv_std: null,
    tiempo_activo: null, escaneos_dia: null,
    tir: null, tar: null, tar_muy_alto: null, tar_alto: null,
    tbr: null, tbr_bajo: null, tbr_muy_bajo: null,
    gri: null, eventos_hipoglucemia: null, duracion_hipoglucemia: null,
  };
  const r = { ...base, ...datos };
  r.periodo_tipo = tipoPeriodo(r.periodo_dias);
  r.extras = extras.filter((e) => e.valor != null && e.valor !== "");
  return r;
}

// Dato extra propio del monitor: { label, valor } ya formateado para mostrarse.
const ex = (label, valor, unidad = "") =>
  ({ label, valor: valor == null ? null : `${valor}${unidad}` });

// ─── Parser: Dexcom Clarity ──────────────────────────────────────────────────
function parseDexcomClarity(texto) {
  const t = texto.replace(/\x00/g, " ");

  const per = t.match(/(\d+)\s*days?\s*•\s*\w+\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})\s*-\s*\w+\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  const rango = t.match(/Time in Range\s*\n\s*(<?\d+)%\s*Very High\s*\n\s*(<?\d+)%\s*High\s*\n\s*(<?\d+)%\s*In Range\s*\n\s*(<?\d+)%\s*Low\s*\n\s*(<?\d+)%\s*Very Low/i);
  const [muyAlto, alto, enRango, bajo, muyBajo] = rango ? rango.slice(1).map(pct) : [];
  const obj = t.match(/Target Range:\s*\n?\s*(\d+)\s*-\s*(\d+)\s*mg\/dL/i);
  const disp = (t.match(/\bDexcom\s+(G\d+|ONE\+?)/i) || [])[1];

  return resultado("Dexcom Clarity", disp ? `Dexcom ${disp}` : "Dexcom", {
    periodo_dias: per ? parseInt(per[1], 10) : null,
    fecha_inicio: per ? fechaEn(per[2]) : null,
    fecha_fin: per ? fechaEn(per[3]) : null,
    glucosa_promedio: buscarNum(t, [/Average glucose\s*\n\s*(\d+(?:\.\d+)?)/i]),
    gmi: buscarNum(t, [/GMI\s*\n\s*(\d+(?:\.\d+)?)\s*%/i]),
    cv: buscarNum(t, [/Coefficient of Variation\s*\n\s*(\d+(?:\.\d+)?)/i]),
    desv_std: buscarNum(t, [/Standard deviation\s*\n\s*(\d+(?:\.\d+)?)/i]),
    tiempo_activo: buscarNum(t, [/Time active\s*\n\s*(\d+(?:\.\d+)?)\s*%/i]),
    tir: enRango ?? null,
    tar: rango ? suma(muyAlto, alto) : null,
    tar_muy_alto: muyAlto ?? null,
    tar_alto: alto ?? null,
    tbr: rango ? suma(bajo, muyBajo) : null,
    tbr_bajo: bajo ?? null,
    tbr_muy_bajo: muyBajo ?? null,
  }, [
    ex("Rango objetivo del reporte", obj ? `${obj[1]}–${obj[2]} mg/dL (no estándar)` : null),
    ex("Días con datos", (t.match(/Days with data\s*\n\s*(\d+\/\d+)/i) || [])[1], " días"),
    ex("Calibraciones por día", buscarNum(t, [/Avg\. calibrations per day\s*\n\s*(\d+(?:\.\d+)?)/i])),
  ]);
}

// ─── Parser: Tidepool (AGP) ──────────────────────────────────────────────────
function parseTidepoolAGP(texto) {
  const t = texto.replace(/\x00/g, " ");

  const per = t.match(/(\d+)\s*Days?:\s*([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
  let fecha_inicio = null, fecha_fin = null;
  if (per) {
    const mIni = MESES_EN[per[2].toLowerCase().substring(0, 3)];
    const mFin = MESES_EN[per[4].toLowerCase().substring(0, 3)];
    const anioFin = parseInt(per[6], 10);
    fecha_fin = mFin ? iso(anioFin, mFin, per[5]) : null;
    fecha_inicio = mIni && mFin ? iso(mIni > mFin ? anioFin - 1 : anioFin, mIni, per[3]) : null;
  }

  const muyAlto = pct((t.match(/\nVery High\s+(<?\d+)%/i) || [])[1]);
  const alto = t.match(/\nHigh\s+(<?\d+)%\s+(\d+)%/i);
  const bajo = pct((t.match(/\nLow\s+(<?\d+)%/i) || [])[1]);
  const muyBajo = pct((t.match(/\nVery Low\s+(<?\d+)%/i) || [])[1]);
  const tbrTotal = pct((t.match(/(\d+)%\s*Goal:\s*<\s*4%/i) || [])[1]);

  const promedios = [...t.matchAll(/Average Glucose mg\/dL\s+(\d+(?:\.\d+)?)/gi)].map((m) => parseFloat(m[1]));

  return resultado("Tidepool (AGP)", "Tidepool", {
    periodo_dias: per ? parseInt(per[1], 10) : null,
    fecha_inicio, fecha_fin,
    glucosa_promedio: promedios[0] ?? null,
    gmi: buscarNum(t, [/Glucose Management Indicator \(GMI\) %\s+(\d+(?:\.\d+)?)/i]),
    cv: buscarNum(t, [/Glucose Variability %\s+(\d+(?:\.\d+)?)/i]),
    tiempo_activo: buscarNum(t, [/Time CGM Active:\s*(\d+(?:\.\d+)?)\s*%/i]),
    tir: pct((t.match(/\nTarget\s+(\d+)%/i) || [])[1]),
    tar: alto ? pct(alto[2]) : muyAlto,
    tar_muy_alto: muyAlto,
    tar_alto: alto ? pct(alto[1]) : null,
    tbr: tbrTotal ?? suma(bajo, muyBajo),
    tbr_bajo: bajo,
    tbr_muy_bajo: muyBajo,
  }, [
    ex("Lecturas de glucómetro (BGM)", (t.match(/Number of Readings\s+(\d+)/i) || [])[1]),
    ex("Promedio glucómetro (BGM)", promedios[1], " mg/dL"),
  ]);
}

// ─── Parser: Medtronic CareLink (MiniMed) ────────────────────────────────────
function parseCareLink(texto) {
  const t = texto.replace(/\x00/g, " ");

  const per = t.match(/Per[ií]odo de informe \((\d+)\s*D[ií]as\)\s*-\s*(\d{2})\/(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})\/(\d{2})/i);
  const prom = t.match(/PROMEDIO DE GLUCOSA DEL SENSOR\s*\n\s*(\d+(?:[.,]\d+)?)\s*±\s*(\d+(?:[.,]\d+)?)/i);

  // "Tiempo en rango" lista los % de arriba hacia abajo omitiendo los rangos en 0:
  // el mayor es el rango objetivo, lo anterior es arriba y lo posterior es abajo.
  let tir = null, tar_muy_alto = null, tar_alto = null, tbr_bajo = null, tbr_muy_bajo = null;
  const bloque = t.match(/Tiempo en rango\s*\n((?:\s*\d+(?:[.,]\d+)?\s*%\s*\n)+)/i);
  if (bloque) {
    const v = [...bloque[1].matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map((m) => parseFloat(m[1].replace(",", ".")));
    const iMax = v.indexOf(Math.max(...v));
    tir = v[iMax];
    const arriba = v.slice(0, iMax), abajo = v.slice(iMax + 1);
    if (arriba.length >= 2) { tar_muy_alto = arriba[0]; tar_alto = arriba[1]; }
    else if (arriba.length === 1) tar_alto = arriba[0];
    if (abajo.length >= 2) { tbr_bajo = abajo[0]; tbr_muy_bajo = abajo[1]; }
    else if (abajo.length === 1) tbr_bajo = abajo[0];
  }
  const tar = bloque ? (suma(tar_muy_alto, tar_alto) ?? 0) : null;
  const tbr = bloque ? (suma(tbr_bajo, tbr_muy_bajo) ?? 0) : null;

  const bolus = t.match(/BOLUS \((\d+)\s*%\)\s*\n\s*(\d+(?:\.\d+)?)\s*U/i);
  const basal = t.match(/BASAL \((\d+)\s*%\)\s*\n\s*(\d+(?:\.\d+)?)\s*U/i);
  const auto = t.match(/AUTOCORRECCI[ÓO]N\s*(\d+(?:\.\d+)?)\s*U\s*\((\d+)\s*%\)/i);
  const comidas = t.match(/(\d+)\s*±\s*\d+\s*g\s+(\d+(?:\.\d+)?)/);

  return resultado("Medtronic CareLink", (t.match(/Origen de datos:\s*(MiniMed\s*\w+)/i) || [])[1] || "Medtronic MiniMed", {
    periodo_dias: per ? parseInt(per[1], 10) : null,
    fecha_inicio: per ? fechaDMY(per[2], per[3], per[4]) : null,
    fecha_fin: per ? fechaDMY(per[5], per[6], per[7]) : null,
    glucosa_promedio: prom ? parseFloat(prom[1].replace(",", ".")) : null,
    desv_std: prom ? parseFloat(prom[2].replace(",", ".")) : null,
    gmi: buscarNum(t, [/\(ICG\)\s*\n\s*(\d+(?:[.,]\d+)?)\s*%/i]),
    cv: buscarNum(t, [/\(CV\)\s*\n\s*(\d+(?:[.,]\d+)?)\s*%/i]),
    tiempo_activo: buscarNum(t, [/USO DEL SENSOR\s*\n\s*(\d+(?:[.,]\d+)?)\s*%/i]),
    tir, tar, tar_muy_alto, tar_alto, tbr, tbr_bajo, tbr_muy_bajo,
  }, [
    ex("Dosis diaria total", buscarNum(t, [/DOSIS DIARIA TOTAL\s*\n\s*(\d+(?:\.\d+)?)\s*U/i]), " U"),
    ex("Bolo", bolus ? `${bolus[2]} U (${bolus[1]} %)` : null),
    ex("Autocorrección", auto ? `${auto[1]} U (${auto[2]} %)` : null),
    ex("Basal", basal ? `${basal[2]} U (${basal[1]} %)` : null),
    ex("Uso de SmartGuard", buscarNum(t, [/USO DE SMARTGUARD\s*\n\s*(\d+(?:\.\d+)?)\s*%/i]), " %"),
    ex("Carbohidratos introducidos / día", comidas ? `${comidas[1]} g` : null),
    ex("Comidas introducidas / día", comidas ? comidas[2] : null),
  ]);
}

// ─── Parser: Tandem t:slim (Control-IQ, CGM Dexcom) ──────────────────────────
function parseTandem(texto) {
  const t = texto.replace(/\x00/g, " ");

  const dias = buscarNum(t, [/^\s*(\d+(?:\.\d+)?)\s*days\s*\n\s*Number of Days/i]);
  const per = t.match(/Dashboard\s*\|\s*\w+\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})\s*-\s*\w+\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  const promedio = buscarNum(t, [/Time in Range\s*\n\s*(\d+(?:\.\d+)?)\s*mg\/dL/i]);
  const objetivo = t.match(/Target Range\s+\d+%\s+(\d+)\s*-\s*(\d+)\s*mg\/dL/i);
  const cgmInactivo = buscarNum(t, [/CGM Inactive\d?\s+(\d+(?:\.\d+)?)\s*%/i]);

  // Resumen diario de insulina: 4 líneas "65% 15.82 u/day" en el orden
  // Basal, Food Bolus, Correction Bolus, Control-IQ Auto Bolus.
  const ins = [...t.matchAll(/(\d+)%\s+(\d+(?:\.\d+)?)\s*u\/day/gi)].map((m) => ({ pct: m[1], u: m[2] }));
  const insTxt = (i) => (ins[i] ? `${ins[i].u} U (${ins[i].pct} %)` : null);

  return resultado("Tandem t:slim (Control-IQ)", "Tandem t:slim + CGM Dexcom", {
    periodo_dias: dias != null ? Math.round(dias) : null,
    fecha_inicio: per ? fechaEn(per[1]) : null,
    fecha_fin: per ? fechaEn(per[2]) : null,
    glucosa_promedio: promedio,
    gmi: gmiDesdePromedio(promedio),
    tiempo_activo: cgmInactivo != null ? 100 - cgmInactivo : null,
    tir: buscarNum(t, [/Target Range\s+(\d+(?:\.\d+)?)\s*%\s+\d+\s*-\s*\d+\s*mg\/dL/i]),
    tar: buscarNum(t, [/Above Target\s+(\d+(?:\.\d+)?)\s*%\s+>/i]),
    tbr: buscarNum(t, [/Below Target\s+(\d+(?:\.\d+)?)\s*%\s+</i]),
  }, [
    ex("Rango objetivo del reporte", objetivo ? `${objetivo[1]}–${objetivo[2]} mg/dL (no estándar)` : null),
    ex("GMI", promedio != null ? "estimado a partir del promedio" : null),
    ex("Dosis diaria total", buscarNum(t, [/Average Total Daily Dose\s+(\d+(?:\.\d+)?)\s*units/i]), " U"),
    ex("Basal", insTxt(0)),
    ex("Bolo de comida", insTxt(1)),
    ex("Bolo de corrección", insTxt(2)),
    ex("Auto-bolo Control-IQ", insTxt(3)),
    ex("Control-IQ activo", buscarNum(t, [/Time in Use\s+(\d+(?:\.\d+)?)\s*%/i]), " %"),
    ex("Control-IQ apagado", buscarNum(t, [/Control-IQ Set to Off\s+(\d+(?:\.\d+)?)\s*%/i]), " %"),
    ex("Bomba inactiva", buscarNum(t, [/Pump Inactive\d?\s+(\d+(?:\.\d+)?)\s*%/i]), " %"),
    ex("Pruebas de glucosa (BG) / día", buscarNum(t, [/Average BG Tests\s+(\d+(?:\.\d+)?)\s*times/i])),
  ]);
}

// ─── Detección de tipo de monitor ────────────────────────────────────────────
// Catálogo de monitores: clave, nombre visible, parser y firma de texto que lo identifica.
// El orden importa: el reporte de Tandem menciona "Dexcom", así que va antes que Dexcom.
export const MONITORES = [
  { clave: "tandem", nombre: "Tandem t:slim (Control-IQ)", parser: parseTandem,
    firma: (t) => t.includes("control-iq") && t.includes("average daily insulin summary") },
  { clave: "tidepool_agp", nombre: "Tidepool (AGP)", parser: parseTidepoolAGP,
    firma: (t) => t.includes("tidepool") || t.includes("agp report: continuous glucose monitoring") },
  { clave: "carelink", nombre: "Medtronic CareLink", parser: parseCareLink,
    firma: (t) => t.includes("minimed") || (t.includes("panel de control del") && t.includes("smartguard")) },
  { clave: "dexcom_clarity", nombre: "Dexcom Clarity", parser: parseDexcomClarity,
    firma: (t) => t.includes("dexcom clarity") },
  { clave: "libreview_agp", nombre: "FreeStyle Libre (AGP)", parser: parseLibreViewAGP,
    firma: (t) => t.includes("informe del agp") || t.includes("perfil ambulatorio de glucosa") ||
      t.includes("freestyle libre") || t.includes("librelink") || t.includes("libreview") },
];

function detectarMonitor(texto) {
  const t = texto.toLowerCase();
  return MONITORES.find((m) => m.firma(t))?.clave ?? null;
}

/**
 * Parsea un PDF de monitoreo continuo de glucosa para RENACED.
 * Detecta el tipo de reporte y aplica el parser correspondiente.
 * @param {string} rutaArchivo Ruta absoluta al PDF
 * @param {string} [tipoForzado] Clave de MONITORES para omitir la detección automática
 */
export async function parsearPDFRenaced(rutaArchivo, tipoForzado) {
  const buffer = fs.readFileSync(rutaArchivo);
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const texto = data.text || "";

  const clave = tipoForzado || detectarMonitor(texto);
  const monitor = MONITORES.find((m) => m.clave === clave);
  if (!monitor) {
    const err = new Error(
      "No se reconoció el formato del reporte PDF. Admitidos: " +
      MONITORES.map((m) => m.nombre).join(", ") + ". Puedes elegir el tipo manualmente."
    );
    err.code = "FORMATO_NO_RECONOCIDO";
    throw err;
  }

  const datos = monitor.parser(texto);
  return { ...datos, extras: datos.extras ?? [], monitor_clave: monitor.clave, textoExtraido: texto.substring(0, 6000) };
}
