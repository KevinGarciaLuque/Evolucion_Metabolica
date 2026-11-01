// Zona horaria del país. El servidor guarda los momentos exactos (creado el, auditoría…) en UTC y
// el usuario recibe `zona_horaria` (nombre IANA, ej. "America/Tegucigalpa") al iniciar sesión.
// Aquí se resuelve la zona activa y se formatea/calcula "hoy" con ella, en vez de usar el reloj
// del navegador. Las fechas de calendario ("YYYY-MM-DD": nacimiento, consulta) no se convierten.

const POR_PAIS = {
  hn: "America/Tegucigalpa",
  mx: "America/Mexico_City",
  ec: "America/Guayaquil",
};
const ZONA_HN = POR_PAIS.hn;

const leerJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };

function valida(z) {
  if (!z) return false;
  try { new Intl.DateTimeFormat("es", { timeZone: z }); return true; } catch { return false; }
}

/** Zona activa: la del país de la sesión (RENACED si la ruta es /renaced, si no la del panel principal). */
export function zonaActual() {
  const enRenaced = typeof location !== "undefined" && location.pathname.startsWith("/renaced");
  const u = leerJSON(enRenaced ? "renaced_usuario" : "usuario");
  if (valida(u?.zona_horaria)) return u.zona_horaria;
  if (enRenaced) return POR_PAIS[u?.tenant] || POR_PAIS.mx;
  if (u?.rol === "SUPER_ADMIN") return Intl.DateTimeFormat().resolvedOptions().timeZone; // sin país: la del equipo
  return ZONA_HN;
}

const localeDe = () => (typeof location !== "undefined" && location.pathname.startsWith("/renaced") ? "es-MX" : "es-HN");

function partes(fecha, zona = zonaActual()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  return Object.fromEntries(f.formatToParts(fecha).map((p) => [p.type, p.value]));
}

/** "YYYY-MM-DD" de hoy en la zona del país. */
export function hoyISO(fecha = new Date(), zona = zonaActual()) {
  const p = partes(fecha, zona);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "YYYY-MM-DDTHH:mm" de ahora en la zona del país (para <input type="datetime-local">). */
export function ahoraInput(fecha = new Date()) {
  const p = partes(fecha);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export const anioActual = () => Number(partes(new Date()).year);
export const horaActual = () => Number(partes(new Date()).hour);

/** Date "pared" de hoy (año/mes/día de la zona del país a las 12:00) para cálculos de edad, día del año, etc. */
export function hoyComoFecha() {
  const p = partes(new Date());
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), 12, 0, 0);
}

/** Interpreta un valor del servidor como instante: "YYYY-MM-DD HH:MM:SS" se toma como UTC. null si no es válido. */
export function aInstante(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  let s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; // fecha de calendario: no es un instante
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) s = `${s.replace(" ", "T")}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fecha y hora (o solo fecha) de un valor del servidor en la zona del país. Fechas de calendario pasan sin convertir. */
export function fmtFechaHora(v, opciones, locale = localeDe()) {
  const d = aInstante(v);
  if (!d) return fmtFecha(v, opciones, locale);
  return d.toLocaleString(locale, {
    timeZone: zonaActual(), day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", ...opciones,
  });
}

/** Solo fecha. Una fecha de calendario ("YYYY-MM-DD") se muestra tal cual (sin desfase); un instante se pasa a la zona del país. */
export function fmtFecha(v, opciones = { day: "2-digit", month: "2-digit", year: "numeric" }, locale = localeDe()) {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = aInstante(v);
  if (d && !(m && s.length === 10)) {
    return d.toLocaleDateString(locale, { ...opciones, timeZone: zonaActual() });
  }
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString(locale, { ...opciones, timeZone: "UTC" });
  }
  return s;
}

/** Hora de un instante del servidor en la zona del país. */
export function fmtHora(v, opciones = { hour: "2-digit", minute: "2-digit" }, locale = localeDe()) {
  const d = aInstante(v);
  return d ? d.toLocaleTimeString(locale, { ...opciones, timeZone: zonaActual() }) : "";
}

/** "hoy" como texto largo, p. ej. "sábado, 31 de octubre de 2026". */
export function hoyLargo(opciones = { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale = localeDe()) {
  return new Date().toLocaleDateString(locale, { ...opciones, timeZone: zonaActual() });
}

/** Zonas sugeridas para el selector del Super Admin. */
export const ZONAS_SUGERIDAS = [
  ["America/Tegucigalpa", "Honduras (UTC−6)"],
  ["America/Mexico_City", "México centro (UTC−6)"],
  ["America/Tijuana", "México noroeste (Baja California)"],
  ["America/Monterrey", "México Monterrey"],
  ["America/Cancun", "México Quintana Roo (UTC−5)"],
  ["America/Guatemala", "Guatemala (UTC−6)"],
  ["America/El_Salvador", "El Salvador (UTC−6)"],
  ["America/Managua", "Nicaragua (UTC−6)"],
  ["America/Costa_Rica", "Costa Rica (UTC−6)"],
  ["America/Panama", "Panamá (UTC−5)"],
  ["America/Bogota", "Colombia (UTC−5)"],
  ["America/Guayaquil", "Ecuador (UTC−5)"],
  ["America/Lima", "Perú (UTC−5)"],
  ["America/Caracas", "Venezuela (UTC−4)"],
  ["America/Santo_Domingo", "República Dominicana (UTC−4)"],
  ["America/La_Paz", "Bolivia (UTC−4)"],
  ["America/Santiago", "Chile"],
  ["America/Argentina/Buenos_Aires", "Argentina (UTC−3)"],
  ["America/Sao_Paulo", "Brasil (UTC−3)"],
  ["America/Montevideo", "Uruguay (UTC−3)"],
  ["America/Asuncion", "Paraguay"],
  ["Europe/Madrid", "España"],
  ["UTC", "UTC"],
];

/** Zona de un país (objeto de /admin/tenants): su configuración, o la habitual de su código, o la del equipo. */
export function zonaDelTenant(t) {
  let conf = t?.configuracion;
  if (typeof conf === "string") { try { conf = JSON.parse(conf); } catch { conf = null; } }
  if (valida(conf?.zona_horaria)) return conf.zona_horaria;
  return POR_PAIS[t?.codigo] || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Zonas horarias de México (se elige una por clínica). */
export const ZONAS_MEXICO = [
  ["America/Mexico_City", "Centro (CDMX, Jalisco, Puebla…)"],
  ["America/Cancun", "Sureste (Quintana Roo, UTC−5 todo el año)"],
  ["America/Mazatlan", "Pacífico (Sinaloa, Nayarit, BCS)"],
  ["America/Hermosillo", "Sonora (UTC−7 todo el año)"],
  ["America/Tijuana", "Noroeste (Baja California)"],
  ["America/Ciudad_Juarez", "Frontera (Ciudad Juárez)"],
  ["America/Matamoros", "Frontera (Matamoros, Reynosa…)"],
];
