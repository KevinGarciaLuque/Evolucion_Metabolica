// Lee la "Nota de evolución" y la "Receta" que exporta la plataforma de Clínica EnDi (DataHealth) y las
// traduce a los campos de la consulta de RENACED. NO guarda nada en el expediente: devuelve lo reconocido
// para que la doctora lo revise (el archivo sí se conserva en la pestaña Documentos del paciente).
//
// Tipos de PDF que reconoce:
//  · nota_evolucion → "CONSULTA - NOTA DE EVOLUCIÓN": medidas y vitales, PSOAP (problemas, medicamentos, laboratorios,
//                     impresión diagnóstica, plan), diagnósticos CIE y receta. La de primera vez trae además la
//                     "Historia Clínica" (antecedentes), que se traduce con el mismo motor de la historia clínica.
//  · receta         → hoja de receta: medicamentos con su indicación y los estudios por solicitar.
import { createRequire } from "module";
import fs from "fs";
import { ETIQUETAS, INSULINAS, ORALES, segmentarHistoria, traducirHistoria } from "./pdfHistoriaClinicaRenaced.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const MESES3 = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
const pad = (n) => String(n).padStart(2, "0");
const num = (v) => { const m = String(v ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/); return m ? m[0] : ""; };

/** "03-Nov-2026" → "2026-11-03" */
function fechaDMA(v) {
  const m = String(v || "").match(/(\d{1,2})-([A-Za-zñ]{3})[a-z]*-(\d{4})/);
  return m && MESES3[norm(m[2])] ? `${m[3]}-${pad(MESES3[norm(m[2])])}-${pad(m[1])}` : "";
}

// ── Limpieza: quita el encabezado y el pie que se repiten en cada página ─────────────────────────
const RE_PIE = [
  /^Creado con DataHealth/i, /^Informaci[oó]n confidencial$/i, /^P[aá]gina \d+ de \d+$/i, /^--\s*\d+\s+of\s+\d+\s*--$/i,
  /^C[eé]dula Profesional:/i,
];
const RE_ENCABEZADO = [
  /^CONSULTA - NOTA DE EVOLUCI[OÓ]N$/i, /^Endocrinolog[ií]a y Diabetes$/i, /^Ced\. Prof\./i, /^Av\. Paseo de las Palmas/i, /^Lomas de Chapultepec/i,
  /^Sexo:/i, /^Fecha de Nacimiento:/i, /^CURP:/i, /^Expediente #/i,
];
const RE_MEDICO = /^Dra?\.\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ ]+$/;

function limpiar(texto) {
  const crudas = String(texto || "").replace(/\x00/g, " ").normalize("NFC").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const cab = {};
  const lineas = [];
  for (const l of crudas) {
    if (RE_PIE.some((r) => r.test(l))) continue;
    if (RE_ENCABEZADO.some((r) => r.test(l))) {
      const k = (l.match(/^(Sexo|Fecha de Nacimiento|CURP|Expediente)/i) || [])[1];
      if (k && !cab[k.toLowerCase()]) cab[k.toLowerCase()] = l.replace(/^[^:#]+[:#]\s*/, "");
      continue;
    }
    if (/^Paciente:/i.test(l)) { cab.paciente ||= l.replace(/^Paciente:\s*/i, ""); continue; }
    if (RE_MEDICO.test(l) && l.split(" ").length <= 6) { cab.medico ||= l; continue; }
    lineas.push(l);
  }
  return { lineas, cab };
}

// ── Utilidades de bloques ─────────────────────────────────────────────────────────────────────────
const idx = (lineas, re, desde = 0) => { for (let i = desde; i < lineas.length; i++) if (re.test(lineas[i])) return i; return -1; };
const RE_FECHA_CONSULTA = /^(\d{1,2}-[A-Za-zñ]{3}-\d{4})\s+\d{1,2}:\d{2}\s+\(Hora/;

/** Valor de "Etiqueta: valor" dentro de unas líneas. */
function campo(lineas, etiqueta) {
  const re = new RegExp(`^${etiqueta}\\s*:\\s*(.*)$`, "i");
  for (const l of lineas) { const m = l.match(re); if (m) return m[1].trim(); }
  return "";
}

// ── Medidas y vitales ─────────────────────────────────────────────────────────────────────────────
function leerMedidas(lineas) {
  const v = {};
  const p = num(campo(lineas, "Peso")); if (p) v.peso = p;
  const est = campo(lineas, "Estatura");
  if (est) { let n = parseFloat(num(est)); if (n && n < 3) n = Math.round(n * 100); if (n) v.estatura = String(n); }
  const s = num(campo(lineas, "Presión Sistólica")); if (s) v.pa_sistolica = s;
  const d = num(campo(lineas, "Presión DIastólica") || campo(lineas, "Presión Diastólica")); if (d) v.pa_diastolica = d;
  const m = num(campo(lineas, "Músculo")); if (m) v.musculo_kg = m;
  const g = num(campo(lineas, "Grasa kg")); if (g) v.grasa_kg = g;
  const gp = num(campo(lineas, "Grasa %")); if (gp) v.grasa_pct = gp;
  const gv = num(campo(lineas, "Grasa visceral")); if (gv) v.grasa_visceral = gv;
  const otros = [["Temperatura", "Temperatura"], ["Frecuencia Cardíaca", "Frecuencia cardíaca"], ["Frecuencia Respiratoria", "Frecuencia respiratoria"], ["Oximetría", "Oximetría"]]
    .map(([k, et]) => [et, campo(lineas, k)]).filter(([, x]) => x);
  return { visita: v, otros };
}

// ── Laboratorios dentro de la nota (bloques "2026-10-05-Labs" / "20261112-Labs Olarte y Akle") ─────
const RE_BLOQUE_LAB = /^(\d{4})-?(\d{2})-?(\d{2})\s*-?\s*(.*)$/;
const ANALITOS = [
  ["hba1c", /^HbA1c\s+([\d.]+)/i], ["glucosa_ayuno", /^Glucosa\s+([\d.]+)$/i], ["creatinina", /^Cr\s+([\d.]+)$/i],
  ["tasa_filtracion", /^TFGe\s+([\d.]+)/i], ["colesterol_total", /^Col\s+([\d.]+)$/i], ["trigliceridos", /^TG\s+([\d.]+)$/i],
  ["hdl", /^HDL\s+([\d.]+)$/i], ["ldl", /^LDL\s+([\d.]+)$/i], ["tsh", /^TSH\s+([\d.]+)$/i], ["acido_urico", /^ac\.?\s*[uú]rico\s+([\d.]+)$/i],
  ["vitamina_d", /^25-OH-Vitamina D\s+([\d.]+)$/i], ["rel_album_creat", /^RAC\s+([\d.]+)/i],
];

function leerLaboratorio(lineas) {
  const bloques = [];
  let actual = null;
  for (const l of lineas) {
    const m = l.match(RE_BLOQUE_LAB);
    if (m && +m[1] > 1990 && +m[1] < 2100 && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) {
      actual = { fecha: `${m[1]}-${m[2]}-${m[3]}`, titulo: m[4], lineas: [] };
      bloques.push(actual);
      continue;
    }
    if (/^(Impresi[oó]n diagn[oó]stica|Archivos|Plan:|Cita )/i.test(l)) { actual = null; continue; }
    if (actual) actual.lineas.push(l);
  }
  const labs = bloques.filter((b) => /\blabs?\b/i.test(b.titulo) && !/\bdmo\b/i.test(b.titulo));
  const lectura = labs.map((b) => {
    const valores = {};
    for (const seg of b.lineas.flatMap((x) => x.split(/[,;]/)).map((x) => x.trim())) {
      for (const [col, re] of ANALITOS) { const m = seg.match(re); if (m && !(col in valores)) valores[col] = m[1]; }
    }
    return { ...b, valores };
  }).filter((b) => Object.keys(b.valores).length);
  // El bloque con valores más reciente (los demás son historia que ya vive en el expediente)
  lectura.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return { reciente: lectura[0] || null, total: labs.length };
}

// ── Monitoreo continuo (reportes de 14/90 días pegados en la nota) ───────────────────────────────
function leerMonitores(lineas) {
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^Per[ií]odo del informe:\s*(.+?)\s*\((\d+) d[ií]as\)/i);
    if (!m) continue;
    const bloque = lineas.slice(i, i + 16).join(" | ");
    const g = (re) => (bloque.match(re) || [])[1];
    const partes = [
      g(/Glucosa promedio:\s*(\d+)/i) && `promedio ${g(/Glucosa promedio:\s*(\d+)/i)} mg/dL`,
      g(/\(GMI\):\s*([\d.]+)/i) && `GMI ${g(/\(GMI\):\s*([\d.]+)/i)}%`,
      g(/\(%CV\):\s*([\d.]+)/i) && `CV ${g(/\(%CV\):\s*([\d.]+)/i)}%`,
      g(/Rango objetivo: 70 - 180 mg\/dL --- (\d+)%/i) && `tiempo en rango ${g(/Rango objetivo: 70 - 180 mg\/dL --- (\d+)%/i)}%`,
      g(/Baja: 54 - 69 mg\/dL --- (\d+)%/i) && `bajas ${g(/Baja: 54 - 69 mg\/dL --- (\d+)%/i)}%`,
      g(/Sensor activo:\s*([\d.]+)/i) || g(/Tiempo de sensor activo:\s*([\d.]+)/i) ? `sensor activo ${g(/Tiempo de sensor activo:\s*([\d.]+)/i)}%` : "",
    ].filter(Boolean);
    salida.push({ etiqueta: `Monitor de glucosa · ${m[1]} (${m[2]} días)`, valor: partes.join(" · ") });
  }
  return salida;
}

// ── Receta / tratamiento ──────────────────────────────────────────────────────────────────────────
const FORMA_FARMACEUTICA = /\b(Tableta|C[aá]psula|Soluci[oó]n|Comprimido|Polvo|Ung[uü]ento|Parche|Gotas|Jarabe|Crema|Suspensi[oó]n)\b/i;
const FIN_RECETA = /^(\d+\.\s|Cita \d|Favor de realizar|Hemoglobina Glicosilada|Qu[ií]mica Sangu[ií]nea)/i;

/** Líneas del apartado de medicamentos → [{ encabezado, indicacion }] */
function leerMedicamentos(lineas) {
  const items = [];
  for (const l of lineas) {
    if (FIN_RECETA.test(l)) break;
    const esEncabezado = / - /.test(l) && FORMA_FARMACEUTICA.test(l) || /^(Freestyle|Tiras reactivas|Tabletas de glucosa)/i.test(l);
    if (esEncabezado) items.push({ encabezado: l, indicacion: "" });
    else if (items.length && !items.at(-1).indicacion && !/^(Siempre|Si toma|Si un d[ií]a|No tomar|En caso de olvidar)/i.test(l)) items.at(-1).indicacion = l;
  }
  return items;
}

function frecuenciaDe(texto) {
  const t = norm(texto);
  if (/microinfusora/.test(t)) return "Microinfusora";
  const esq = String(texto).match(/\b(\d)-(\d)-(\d)\b/); if (esq) return esq[0];
  if (/cada semana|semanal/.test(t)) return "Semanal";
  if (/diario|cada 24/.test(t)) return "Diario";
  if (/alimentos|comidas|relacion insulina/.test(t)) return "Con alimentos";
  return "";
}

function tratamientoDeReceta(items, contexto) {
  const t = { terapia_id: "", insulinas: [], orales: [] };
  const microTxt = norm(contexto);
  const micro = /microinfusora|bomba de insulina|\b780g\b|\b670g\b|paradigm/.test(microTxt);
  const omitidos = [];
  for (const it of items) {
    const cab = norm(it.encabezado), ind = it.indicacion;
    // Medicamento de contingencia ("en caso de malfuncionamiento…"): no es el tratamiento vigente
    if (/en caso de/i.test(ind) && !/hipoglucemia/i.test(ind)) { omitidos.push(it.encabezado.split(" - ")[0]); continue; }
    const ins = INSULINAS.find(([re]) => re.test(cab));
    if (ins) {
      const dosis = num((ind.match(/(\d+(?:[.,]\d+)?)\s*(?:a\s*[\d.,]+\s*)?unidades/i) || [])[1]);
      if (!t.insulinas.some((x) => x.insulina_id === ins[1])) t.insulinas.push({ insulina_id: ins[1], dosis_unidades: dosis, frecuencia: frecuenciaDe(ind) || (micro && ins[1] === "6" ? "Microinfusora" : "") });
      continue;
    }
    if (/janumet/.test(cab)) {
      const mg = it.encabezado.match(/(\d+)\s*mg\s*,\s*(\d+)\s*mg/i);
      t.orales.push({ antidiabetico_id: "8", dosis_mg: mg?.[1] || "", frecuencia: frecuenciaDe(ind) });
      t.orales.push({ antidiabetico_id: "1", dosis_mg: mg?.[2] || "", frecuencia: frecuenciaDe(ind) });
      continue;
    }
    const ora = ORALES.find(([re]) => re.test(cab));
    if (ora && !t.orales.some((x) => x.antidiabetico_id === ora[1])) {
      const mg = num((ind.match(/(\d+(?:[.,]\d+)?)\s*mg/i) || it.encabezado.match(/(\d+(?:[.,]\d+)?)\s*mg/i) || [])[1]);
      t.orales.push({ antidiabetico_id: ora[1], dosis_mg: mg, frecuencia: frecuenciaDe(ind) });
    }
  }
  if (!t.insulinas.length && !t.orales.length && !micro) return { trat: null, omitidos };
  t.terapia_id = t.insulinas.length || micro ? (t.orales.length ? "4" : "3") : "2";
  if (micro) { t.esquema_insulina_id = "5"; t.dispositivo_id = "3"; }
  return { trat: t, omitidos };
}

// ── Diagnósticos CIE-10 ───────────────────────────────────────────────────────────────────────────
const CIE_PATOLOGIA = { E03: "HIPOTIROIDISMO", E78: "DISLIPIDEMIA", I10: "HIPERTENSIÓN ARTERIAL", I70: "ATEROSCLEROSIS", M81: "OSTEOPOROSIS", "M87.1": "OSTEONECROSIS", E66: "OBESIDAD", E05: "HIPERTIROIDISMO", I25: "ENFERMEDAD CORONARIA" };

function leerDiagnosticos(lineas) {
  const pat = [];
  let tipo = "";
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(.+?)\s+([A-Z]\d{2}(?:\.[\dX]+)?)$/);
    if (!m) continue;
    const [, desc, cie] = m;
    if (/^E1[0-4]/.test(cie)) { if (cie === "E10") tipo = "1"; else if (cie === "E11") tipo = "2"; continue; }   // diabetes: ya es el diagnóstico del paciente
    const sig = lineas[i + 1] && !/\s[A-Z]\d{2}(?:\.[\dX]+)?$/.test(lineas[i + 1]) && !/^(Receta|Alergias|Archivos)/i.test(lineas[i + 1]) ? lineas[i + 1] : "";
    const nombre = CIE_PATOLOGIA[cie] || CIE_PATOLOGIA[cie.split(".")[0]] || desc.toUpperCase();
    if (!pat.some((p) => p.nombre === nombre)) pat.push({ nombre, fecha_dx: "", activa: 1, observaciones: [`CIE-10 ${cie}`, sig].filter(Boolean).join(" · ") });
  }
  return { pat, tipo };
}

// ── Historia clínica de primera vez (antecedentes) ───────────────────────────────────────────────
const ALIAS = {
  "observaciones diabetes tipo 1": "Diabetes tipo 1", "especifique si fuma": "Fuma", "especifique si consume alcohol": "Alcohol",
};
const CONOCIDAS = new Set(Object.values(ETIQUETAS).flat().map(norm));

function historiaDePrimeraVez(lineas) {
  const i = idx(lineas, /^Historia Cl[ií]nica$/i);
  const f = idx(lineas, RE_FECHA_CONSULTA);
  if (i < 0 || (f >= 0 && f < i)) return null;
  const bloque = lineas.slice(i, f >= 0 ? f : undefined).map((l) => {
    const m = l.match(/^([^:]{3,70}):\s*(.*)$/);
    if (!m) return l;
    const k = norm(m[1]);
    const nombre = ALIAS[k] || (CONOCIDAS.has(k) ? m[1] : null);
    return nombre ? `${nombre} ${m[2]}`.trim() : l;
  });
  const seg = segmentarHistoria(["Datos personales", ...bloque].join("\n"));
  return traducirHistoria(seg);
}

// ── Lectura de la nota completa ──────────────────────────────────────────────────────────────────
function leerNota(lineas, cab) {
  const r = { paciente: {}, visita: {}, lab: {}, diagnostico: {}, ago: {}, patologias: [], estilo: {}, tox: {}, trat: null, avisos: [], no_importado: [] };
  const extra = (etiqueta, valor) => { if (valor && String(valor).trim()) r.no_importado.push({ etiqueta, valor: String(valor).trim() }); };

  // Primera vez: antecedentes
  const hist = historiaDePrimeraVez(lineas);
  if (hist) {
    for (const k of ["diagnostico", "ago", "estilo", "tox"]) Object.assign(r[k], hist[k]);
    r.patologias.push(...hist.patologias.map((p) => ({ ...p, observaciones: String(p.observaciones || "").replace(/\.{2,}/g, ".") })));
    r.trat = hist.trat;
    r.no_importado.push(...hist.no_importado);
    r.avisos.push(...hist.avisos.filter((a) => !/HbA1c .* cuestionario/.test(a)));
  }

  const iFecha = idx(lineas, RE_FECHA_CONSULTA);
  const cuerpo = iFecha >= 0 ? lineas.slice(iFecha) : lineas;
  if (iFecha >= 0) r.fecha_consulta = fechaDMA(lineas[iFecha]);

  const iPsoap = idx(cuerpo, /^Nota PSOAP$/i);
  const iArch = idx(cuerpo, /^Archivos$/i, Math.max(iPsoap, 0));
  const iAler = idx(cuerpo, /^Alergias$/i);
  const iDx = idx(cuerpo, /^Diagn[oó]sticos$/i);
  const iRec = idx(cuerpo, /^Receta$/i);
  const finMedidas = iPsoap >= 0 ? iPsoap : cuerpo.length;
  const psoap = cuerpo.slice(Math.max(iPsoap, 0), [iArch, iAler, iDx, iRec].filter((x) => x > 0).sort((a, b) => a - b)[0] ?? cuerpo.length);

  // Medidas y vitales
  const med = leerMedidas(cuerpo.slice(0, finMedidas));
  r.visita = { ...med.visita, ...r.visita };
  const vit = med.otros.map(([k, v]) => `${k} ${v}`).join(" · ");
  extra("Signos vitales (sin campo en la hoja)", vit);

  // Laboratorio
  const lab = leerLaboratorio(psoap);
  if (lab.reciente) {
    r.lab = { ...lab.reciente.valores, fecha_muestra: lab.reciente.fecha };
    if (r.lab.glucosa_ayuno) r.avisos.push("La nota no dice si la glucosa fue en ayuno: se puso en «Glucosa en ayuno». Corrígela si fue al azar.");
    r.avisos.push(`Laboratorio: se tomaron los valores del examen del ${lab.reciente.fecha}${lab.reciente.titulo ? ` (${lab.reciente.titulo})` : ""}. La nota trae ${lab.total} fecha${lab.total === 1 ? "" : "s"} de laboratorio; las anteriores ya deben estar en el expediente (puedes subir esos PDF en Laboratorio).`);
  }

  // Diagnósticos y alergias
  if (iDx >= 0) {
    const fin = [iRec].filter((x) => x > iDx)[0] ?? cuerpo.length;
    const d = leerDiagnosticos(cuerpo.slice(iDx + 1, fin));
    if (d.tipo && !r.diagnostico.tipo_diabetes_id) r.diagnostico.tipo_diabetes_id = d.tipo;
    for (const p of d.pat) if (!r.patologias.some((x) => norm(x.nombre) === norm(p.nombre))) r.patologias.push(p);
  }
  if (iAler >= 0) {
    const fin = [iDx, iRec].filter((x) => x > iAler).sort((a, b) => a - b)[0] ?? cuerpo.length;
    extra("Alergias", cuerpo.slice(iAler + 1, fin).join(" ").replace(/^Alergia:\s*/i, ""));
  }

  // Tratamiento (receta)
  if (iRec >= 0) {
    const { trat, omitidos } = tratamientoDeReceta(leerMedicamentos(cuerpo.slice(iRec + 1)), cuerpo.join(" "));
    if (trat) r.trat = trat;
    if (omitidos.length) r.avisos.push(`No se importó como tratamiento vigente (es de contingencia): ${omitidos.join(", ")}.`);
  }

  // Lo que no tiene campo: problemas, impresión, plan, cita, estudios solicitados, monitores
  const ip = idx(psoap, /^Impresi[oó]n diagn[oó]stica:/i);
  const iPlan = idx(psoap, /^Plan:/i);
  const iCita = idx(psoap, /^Cita /i, Math.max(ip, 0));
  if (ip >= 0) {
    const finImp = [iCita, iPlan, idx(psoap, /^Archivos$/i, ip)].filter((x) => x > ip).sort((a, b) => a - b)[0] ?? psoap.length;
    extra("Impresión diagnóstica", psoap.slice(ip, finImp).join(" ").replace(/^Impresi[oó]n diagn[oó]stica:\s*/i, ""));
  }
  if (iCita >= 0) extra("Próxima cita", psoap.slice(iCita, iPlan > iCita ? iPlan : undefined).join(" "));
  if (iPlan >= 0) extra("Plan", psoap.slice(iPlan, idx(psoap, /^Archivos$/i, iPlan) > 0 ? idx(psoap, /^Archivos$/i, iPlan) : undefined).join(" · ").replace(/^Plan:\s*/i, ""));
  const iProb = idx(psoap, /^Problemas y medicamentos:/i);
  if (iProb >= 0) extra("Problemas y medicamentos (nota)", psoap.slice(iProb, iProb + 14).join(" ").replace(/^Problemas y medicamentos:\s*/i, "").slice(0, 900));
  const iEst = idx(cuerpo, /^Hemoglobina Glicosilada|^Qu[ií]mica Sangu[ií]nea/i, Math.max(iRec, 0));
  if (iEst >= 0) extra("Estudios solicitados para la siguiente cita", cuerpo.slice(iEst).filter((l) => !/^Dra?\./.test(l)).join(" · "));
  r.no_importado.push(...leerMonitores(psoap));
  return r;
}

function leerReceta(lineas) {
  const r = { paciente: {}, visita: {}, lab: {}, diagnostico: {}, ago: {}, patologias: [], estilo: {}, tox: {}, trat: null, avisos: [], no_importado: [] };
  r.fecha_consulta = fechaDMA(lineas[0]);
  const cuerpo = lineas.slice(2).filter((l) => !RE_PIE.some((x) => x.test(l)) && !/^\d{1,2}-[A-Za-zñ]{3}-\d{4}$/.test(l) && !/\S\s\d{1,2}-[A-Za-zñ]{3}-\d{4}$/.test(l));
  const { trat, omitidos } = tratamientoDeReceta(leerMedicamentos(cuerpo), cuerpo.join(" "));
  if (trat) r.trat = trat;
  if (omitidos.length) r.avisos.push(`No se importó como tratamiento vigente (es de contingencia): ${omitidos.join(", ")}.`);
  const iEst = idx(cuerpo, /^Favor de realizar/i);
  if (iEst >= 0) r.no_importado.push({ etiqueta: "Estudios solicitados", valor: cuerpo.slice(iEst + 1).join(" · ") });
  const iCita = idx(cuerpo, /^Cita \d/i);
  if (iCita >= 0) r.no_importado.push({ etiqueta: "Próxima cita", valor: cuerpo.slice(iCita, iEst > iCita ? iEst : iCita + 2).join(" ") });
  r.no_importado.push({ etiqueta: "Medicamentos de la receta", valor: leerMedicamentos(cuerpo).map((m) => m.encabezado.replace(/\s+-\s+.*$/, "")).filter((x, i, a) => a.indexOf(x) === i).join(" · ") });
  return r;
}

/** Texto → tipo de documento. */
export function detectarTipo(texto) {
  if (/CONSULTA - NOTA DE EVOLUCI[OÓ]N/i.test(texto)) return "nota_evolucion";
  const l = String(texto || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (l.length > 3 && /^\d{1,2}-[A-Za-zñ]{3}-\d{4}$/.test(l[0]) && /\d{1,2}-[A-Za-zñ]{3}-\d{4}$/.test(l[1]) && /Favor de realizar|\bsc\b|tableta|c[aá]psula|Soluci[oó]n/i.test(texto)) return "receta";
  return null;
}

export const TIPOS_DOCUMENTO = { nota_evolucion: "Nota de evolución", receta: "Receta", historia_clinica: "Historia clínica", otro: "Otro" };

export async function parsearNotaEvolucion(ruta) {
  const parser = new PDFParse({ data: fs.readFileSync(ruta) });
  const data = await parser.getText();
  const tipo = detectarTipo(data.text);
  if (!tipo) {
    const e = new Error("No se reconoció una nota de evolución ni una receta en el PDF. Verifica que sea el PDF de la plataforma de la clínica, con texto (no una foto).");
    e.code = "FORMATO_NO_RECONOCIDO";
    throw e;
  }
  const { lineas, cab } = limpiar(data.text);
  const r = tipo === "nota_evolucion" ? leerNota(lineas, cab) : leerReceta(data.text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
  r.tipo_documento = tipo;
  // El encabezado se usa solo para comprobar que el PDF es del paciente
  r.cabecera = `Paciente: ${cab.paciente || (tipo === "receta" ? data.text.split(/\r?\n/)[1] : "")}`;
  r.titulo = `${TIPOS_DOCUMENTO[tipo]}${r.fecha_consulta ? ` · ${r.fecha_consulta}` : ""}`;
  return r;
}
