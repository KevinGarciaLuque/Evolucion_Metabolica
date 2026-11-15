// Motor de lectura de exámenes de laboratorio de varios laboratorios de México.
//
// Cada laboratorio imprime sus resultados con otra disposición. Aquí se detecta el laboratorio
// por una firma de texto (como el catálogo MONITORES del escaneo de MCG) y se convierten todas
// las líneas a filas homogéneas { nombre, valor, unidad, referencia, origen }. Después, el
// catálogo ANALITOS (pdfLaboratorioRenaced.js) decide cuáles van a una columna de `laboratorio`
// y el resto se guarda como "otros resultados".

// ── Utilidades ────────────────────────────────────────────────────────────────
const UNIDAD =
  "(?:%|(?:x\\s*)?10\\s*[\\^∧]\\s*\\d\\s*\\/\\s*[µμu]?\\s*l|miles\\/mm3|millones\\/mm3|" +
  "[a-zµμ]{1,8}\\s?\\/\\s?[a-zµμ0-9.]{1,10}(?:\\/[0-9.]+m2)?|fl|pg|index|seg(?:undos)?)";
const UNIDAD_INI = new RegExp("^" + UNIDAD + "(?=\\s|$|\\d)", "i");
const UNIDAD_BUSCA = new RegExp("(?:^|\\s)(" + UNIDAD + ")(?=\\s|$)", "i");
const NUM = "[<>]?\\s*\\d+(?:[.,]\\d+)?";

const RUIDO = /^(fecha|p[aá]g|orden|edad|registro|tel[eé]fono|hoja|folio|c\.?p\.?\b|av\.?\s|blvd|campus|usuario|instrumento|m[eé]todo|metodolog[ií]a|muestra|nota|liberad|paciente|sexo|g[eé]nero|m[eé]dico|expediente|sucursal|dr\.?\b|dra\.?\b|q\.f\.b|c[eé]dula|nacimiento|factura|empresa|estatus|toma|impresi[oó]n|cuarto|servicio|lic\.)/i;
const CUALITATIVO = /\b(negativo|positivo|normal|ausente|presente|trazas|escaso|abundante)\b/i;

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const aNumero = (s) => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));

function fechaDMY(s) {
  const m = s && String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
export function fechaTextual(s) {
  const m = norm(s).match(/(\d{1,2}) de ([a-z]+) de (\d{4})/);
  return m && MESES[m[2]] ? `${m[3]}-${String(MESES[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

function limpiarNombre(n) {
  return n.replace(/\s+(Recomendado|Normal|Deseable|Aceptable)\b.*$/i, "").replace(/[\s:,*]+$/, "").replace(/\s+/g, " ").trim();
}
function nombreValido(n) {
  const t = n.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  // Rangos de interpretación ("Deseable menor de 130", "Alto mayor de 190") no son análisis
  if (/^(deseable|alto|bajo|muy\s+alto|l[ií]mite|limitr[oó]fe|[oó]ptimo|cerca|normal|riesgo|aceptable)\b/i.test(n) || /\b(de|a|que)$/i.test(n)) return false;
  return t.length >= 3 && n.length <= 90 && !RUIDO.test(n) && !CUALITATIVO.test(n) && !UNIDAD_BUSCA.test(" " + n.split(/\s+/).slice(-1)[0] + " ");
}

// ── Formas de línea ───────────────────────────────────────────────────────────
// A) "Nombre  valor  unidad  referencia"  (o "Nombre  referencia  unidad  valor" en Santa Fe)
function filaNombreValor(linea) {
  const L = linea.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
  let m = L.match(new RegExp("^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ#(][^\\d]*?(?:\\d[^\\d\\s]*[^\\d]*?)*?)\\s+(?:\\*\\s*)?(" + NUM + ")(?=\\s|$)(.*)$"));
  // número pegado al nombre: "…en Orina de una Micción18.05 mg/g Normal …"
  if (!m) m = L.match(new RegExp("^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ#(][^\\d]*[a-záéíóúñ)])(\\d+[.,]\\d+)(?=\\s+" + UNIDAD + ")(.*)$", "i"));
  if (!m) return null;
  let [, nombre, valorTxt, resto] = m;
  nombre = limpiarNombre(nombre);
  if (!nombreValido(nombre)) return null;
  resto = resto.trim().replace(/^\*+\s*/, "");   // "61.7 * mg/dL": asterisco de fuera de rango
  let unidad = "", ref = "";
  if (/^-\s*\d/.test(resto)) {
    // el "valor" era el inicio de la referencia: "4.40 - 5.60  10^6/uL  6.11" → el resultado va al final
    const f = resto.match(new RegExp("^-\\s*(\\d+(?:[.,]\\d+)?)(?:\\s+(" + UNIDAD + "))?\\s+(" + NUM + ")\\s*$", "i"));
    if (!f) return null;
    ref = `${valorTxt.trim()} - ${f[1]}`; unidad = f[2] || ""; valorTxt = f[3];
  } else {
    const un = resto.match(UNIDAD_INI);
    const hayRango = new RegExp("^" + NUM + "\\s*-\\s*\\d").test(resto) || /^[<>=]/.test(resto);
    if (!un && !hayRango) return null;
    if (un) { unidad = un[0]; ref = resto.slice(un[0].length).trim(); }
    else { ref = resto; unidad = (resto.match(UNIDAD_BUSCA) || [])[1] || ""; }
  }
  return { nombre, valorTxt, unidad, ref };
}

// B) Satélite: "unidad<TAB>valor<TAB>Nombre referencia"
function filaUnidadPrimero(linea) {
  const m = linea.match(new RegExp("^(" + UNIDAD + ")\\t\\s*(" + NUM + ")\\t\\s*(.+)$", "i"));
  if (!m) return null;
  let resto = m[3].replace(/\t/g, " ").trim();
  const corte = resto.search(new RegExp("\\s" + NUM + "(?:\\s|$)|\\s(?:Recomendado|Normal|Deseable|Aceptable)\\b|\\s[<>]"));
  const nombre = limpiarNombre(corte > 0 ? resto.slice(0, corte) : resto);
  if (!nombreValido(nombre)) return null;
  return { nombre, valorTxt: m[2], unidad: m[1], ref: corte > 0 ? resto.slice(corte).trim() : "" };
}

// C) Nombre en una línea y "valor  referencia  unidad" en la siguiente
function filaValorSuelto(linea, nombre) {
  const m = linea.replace(/\t/g, " ").match(new RegExp("^(" + NUM + ")(?=\\s|$)(.*)$"));
  if (!m) return null;
  const resto = m[2].trim();
  const un = resto.match(UNIDAD_BUSCA);
  return { nombre: limpiarNombre(nombre), valorTxt: m[1], unidad: un ? un[1] : "", ref: resto };
}

const ES_NOMBRE_SUELTO = (l) =>
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ#(]/.test(l) && !/\t/.test(l) && !/\d\s+\S*\s*$/.test(l) && l.length <= 80 &&
  !RUIDO.test(l) && !/[.]\s*$/.test(l.replace(/\.{2,}/g, "")) && nombreValido(limpiarNombre(l));

const ORINA = /orina|urinari|urian[aá]lisis|uroan[aá]lisis|\bego\b/i;
const SANGRE = /sangre|suero|plasma|qu[ií]mica|biometr|hematolog|perfil|inmuno|hormon|f[uú]nci[oó]n|l[ií]pidos|tiroid/i;

/** Convierte el texto de un PDF en filas de resultados. */
function extraerFilas(texto, { unidadPrimero = false, valorSuelto = false } = {}) {
  const lineas = texto.replace(/\x00/g, " ").normalize("NFC").split(/\r?\n/)
    .map((l) => l.replace(/[  ]+/g, " ").replace(/ ?\t ?/g, "\t").trim()).filter(Boolean);
  // Nombre partido en dos líneas: "Colesterol HDL Lipoproteina de alta" + "densidad 52 =40> mg/dL"
  for (let i = lineas.length - 2; i >= 0; i--) {
    if (lineas[i].length > 15 && !/\d/.test(lineas[i]) && !/\t/.test(lineas[i]) && /^[a-záéíóúñ]+\s+\d/.test(lineas[i + 1]) && /[A-Za-z]$/.test(lineas[i])) {
      lineas.splice(i, 2, `${lineas[i]} ${lineas[i + 1]}`);
    }
  }
  const filas = [];
  let origen = "sangre", pendiente = null, distancia = 0;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    let f = null;
    if (unidadPrimero) f = filaUnidadPrimero(l);
    if (!f) f = filaNombreValor(l);
    if (!f && valorSuelto && pendiente) f = filaValorSuelto(l, pendiente);
    if (f) {
      pendiente = null;
      const valor = aNumero(f.valorTxt.replace(/^[<>]\s*/, ""));
      if (Number.isFinite(valor)) {
        const orinaFila = ORINA.test(f.nombre) ? "orina" : origen;
        filas.push({ nombre: f.nombre, valor, menor_mayor: /^[<>]/.test(f.valorTxt.trim()) ? f.valorTxt.trim()[0] : null,
          unidad: f.unidad, referencia: f.ref.slice(0, 60), origen: orinaFila, linea: l });
      }
      continue;
    }
    // Encabezados de sección: cambian el origen (sangre/orina) de las filas siguientes
    if (l.length < 70 && !/\d{4,}/.test(l)) {
      if (ORINA.test(l) && !/^(glucosa|cetonas|prote[ií]nas)/i.test(l)) origen = "orina";
      else if (SANGRE.test(l) && !ORINA.test(l)) origen = "sangre";
    }
    if (valorSuelto) {
      if (ES_NOMBRE_SUELTO(l)) { pendiente = l; distancia = 0; }
      else if (pendiente && ++distancia > 5) pendiente = null;
    }
  }
  return filas;
}

// ── Catálogo de laboratorios ──────────────────────────────────────────────────
// Orden: las firmas más específicas primero. `fecha(texto)` devuelve la fecha de toma (aaaa-mm-dd).
const reFecha = (...labels) => (t) => {
  for (const re of labels) { const m = t.match(re); if (m) { const f = fechaDMY(m[1]); if (f) return f; } }
  return null;
};
const DMY = "(\\d{1,2}\\/\\d{1,2}\\/\\d{4})";

export const LABORATORIOS = [
  { clave: "saluddigna", nombre: "Salud Digna (Centro Analítico de Puebla)", firma: /centro anal[ií]tico de puebla|salud-digna|reimpresi[oó]n de resultados/i, opciones: {},
    // toma = fecha-hora más antigua del informe (las otras son validación e impresión)
    fecha: (t) => {
      const f = [...t.matchAll(/(\d{2}\/\d{2}\/\d{4})\s*\d{2}:\d{2}:\d{2}/g)].map((m) => fechaDMY(m[1])).filter(Boolean).sort();
      return f[0] || null;
    } },
  { clave: "chopo", nombre: "Laboratorio Chopo", firma: /chopo\.com\.mx/i, opciones: {},
    // "Fecha de Registro:" queda suelta; la fecha-hora de registro es la primera con hora del encabezado
    fecha: (t) => { const m = t.slice(0, 1500).match(/(\d{2}\/\d{2}\/\d{4})\s+\d{1,2}:\d{2}/); return m ? fechaDMY(m[1]) : null; } },
  { clave: "bioderef", nombre: "Bioderef", firma: /bioderef|centro de toma\s*:/i, opciones: { valorSuelto: true },
    fecha: reFecha(new RegExp("fecha\\s+toma\\s+de\\s+muestra[^\\d\\n]*" + DMY, "i")) },
  { clave: "lmp", nombre: "Laboratorio Médico Polanco (LMP)", firma: /laboratorio\s+m[eé]dico\s+polanco|\(LMP\)/i, opciones: { valorSuelto: true },
    fecha: (t) => {
      // "Toma:" e "Impresión:" quedan sueltas; la toma es la fecha-hora más antigua del encabezado
      const f = [...t.slice(0, 1500).matchAll(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/g)].map((m) => fechaDMY(m[1])).filter(Boolean).sort();
      return f[0] || null;
    } },
  { clave: "quest", nombre: "Quest Diagnostics", firma: /quest|estatus de reporte/i, opciones: { valorSuelto: true },
    fecha: reFecha(new RegExp("fecha\\s+toma\\s+muestra[^\\d\\n]*" + DMY, "i")) },
  { clave: "santafe", nombre: "Laboratorio ABC Campus Santa Fe", firma: /campus santa fe|cobas pro/i, opciones: {},
    fecha: reFecha(new RegExp("fecha\\s+toma[^\\d\\n]*" + DMY, "i")) },
  { clave: "satelite", nombre: "Laboratorio Satélite", firma: /FOR-OYA-001|sucursal:\s*sat[eé]lite|ESTUDIOS \/ EXAMEN\s+UNIDADES/i, opciones: { unidadPrimero: true },
    fecha: reFecha(new RegExp("f\\.\\s*toma\\s+de\\s+muestra[^\\d\\n]*" + DMY, "i"), new RegExp("f\\.\\s*orden\\s+de\\s+trabajo[^\\d\\n]*" + DMY, "i")) },
  { clave: "incmnsz", nombre: "Laboratorio Central INCMNSZ", firma: /incmnsz|PRUEBA UNIDADES VALORES DE REFERENCIA|laboratorio central/i, opciones: {},
    fecha: reFecha(new RegExp("fecha\\s+(?:de\\s+)?(?:toma|muestra|recolecci[oó]n|extracci[oó]n)[^\\d\\n]*" + DMY, "i"), new RegExp("fecha\\s+(?:de\\s+)?creaci[oó]n[^\\d\\n]*" + DMY, "i")) },
];
const GENERICO = { clave: "generico", nombre: "Otro laboratorio (formato genérico)", opciones: { valorSuelto: true },
  fecha: reFecha(new RegExp("fecha\\s+(?:de\\s+)?(?:toma|muestra)[^\\d\\n]*" + DMY, "i"), new RegExp("fecha\\s+(?:de\\s+)?(?:creaci[oó]n|registro)[^\\d\\n]*" + DMY, "i")) };

export function detectarLaboratorio(texto, clave) {
  if (clave) { const l = LABORATORIOS.find((x) => x.clave === clave); if (l) return l; }
  return LABORATORIOS.find((l) => l.firma.test(texto)) || GENERICO;
}

/** Texto del PDF → { laboratorio, filas, fecha_muestra, curp, cabecera }. */
export function leerExamen(texto, claveForzada) {
  const t = String(texto || "").replace(/\x00/g, " ").normalize("NFC");
  const lab = detectarLaboratorio(t, claveForzada);
  const filas = extraerFilas(t, lab.opciones);
  return {
    laboratorio: lab.clave,
    laboratorio_nombre: lab.nombre,
    filas,
    fecha_muestra: lab.fecha(t),
    curp: (t.match(/\b[A-Z]{4}\d{6}[HM][A-Z]{5}/) || [])[0] || null,
    cabecera: t.slice(0, 2500),
  };
}
