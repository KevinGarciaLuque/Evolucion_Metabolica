// Zona horaria por país. La base de datos guarda todo en UTC (el servidor MySQL corre en UTC);
// aquí se resuelve la zona de cada país (tenants.configuracion.zona_horaria, nombres IANA) y se
// calcula "hoy"/"ahora" como los ve ese país. Las fechas de calendario (nacimiento, consulta)
// no se convierten: solo los momentos exactos (creado el, auditoría, bitácora).
import poolMaster from "../config/db.master.js";

export const ZONA_POR_DEFECTO = {
  hn: "America/Tegucigalpa",
  mx: "America/Mexico_City",
  ec: "America/Guayaquil",
};
export const ZONA_GENERAL = "UTC";

export function zonaValida(zona) {
  if (!zona || typeof zona !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // codigo -> { zona, hasta }

/** Zona horaria configurada para el país (por código de tenant: "hn", "mx"…). */
export async function zonaDeTenant(codigo) {
  const clave = String(codigo || "").toLowerCase();
  const c = cache.get(clave);
  if (c && c.hasta > Date.now()) return c.zona;

  let zona = null;
  try {
    const [[fila]] = await poolMaster.query("SELECT configuracion FROM tenants WHERE codigo = ?", [clave]);
    let conf = fila?.configuracion;
    if (typeof conf === "string") conf = JSON.parse(conf);
    zona = conf?.zona_horaria || null;
  } catch { /* sin master: se usa la zona por defecto */ }

  if (!zonaValida(zona)) zona = ZONA_POR_DEFECTO[clave] || ZONA_GENERAL;
  cache.set(clave, { zona, hasta: Date.now() + TTL_MS });
  return zona;
}

export function olvidarZona(codigo) {
  if (codigo) cache.delete(String(codigo).toLowerCase());
  else cache.clear();
}

function partes(zona, fecha = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  return Object.fromEntries(f.formatToParts(fecha).map((p) => [p.type, p.value]));
}

/** "YYYY-MM-DD" de hoy en esa zona. */
export function hoyEn(zona, fecha = new Date()) {
  const p = partes(zona, fecha);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "YYYY-MM-DD HH:MM:SS" de ahora en esa zona. */
export function ahoraEn(zona, fecha = new Date()) {
  const p = partes(zona, fecha);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** Desfase de la zona respecto a UTC en el instante dado, p. ej. "-06:00" (para SQL: CONVERT_TZ(x,'+00:00',?)). */
export function desfaseEn(zona, fecha = new Date()) {
  const p = partes(zona, fecha);
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const min = Math.round((comoUtc - Math.floor(fecha.getTime() / 1000) * 1000) / 60000);
  const signo = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  return `${signo}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Fecha larga legible ("31 de octubre de 2026") en esa zona. */
export function fechaLargaEn(zona, locale = "es-MX", fecha = new Date()) {
  return new Intl.DateTimeFormat(locale, { timeZone: zona, day: "numeric", month: "long", year: "numeric" }).format(fecha);
}

/** Versión síncrona para código que no puede esperar: usa la zona en caché o la por defecto del país. */
export function zonaCacheada(codigo) {
  const clave = String(codigo || "").toLowerCase();
  const c = cache.get(clave);
  return c ? c.zona : (ZONA_POR_DEFECTO[clave] || ZONA_GENERAL);
}
export const hoySync = (codigo) => hoyEn(zonaCacheada(codigo));

// Atajos por código de país
export const hoyDe = async (codigo) => hoyEn(await zonaDeTenant(codigo));
export const ahoraDe = async (codigo) => ahoraEn(await zonaDeTenant(codigo));
export const desfaseDe = async (codigo) => desfaseEn(await zonaDeTenant(codigo));

/** Desfase ("-06:00") que tenía la zona en un día de calendario dado ("YYYY-MM-DD"), respetando horario de verano. */
export const desfaseDelDia = (zona, dia) => desfaseEn(zona, new Date(`${dia}T12:00:00Z`));
