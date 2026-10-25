// Registro de cambios del sistema. Es la fuente única de las "Novedades" (botón ✨)
// y de la versión que se muestra en el pie del menú lateral.
//
// Regla: en CADA push se agrega una entrada NUEVA al inicio de este arreglo
// (versión semver: patch = correcciones, minor = funciones nuevas, major = cambios grandes).
//
// Cada entrada lleva `alcance`:
//   "global"   → cambio de toda la aplicación: lo ven todos los países.
//   "mexico"   → solo RENACED México.      "honduras" → solo SAAPD Honduras.
//   (un país nuevo = usar el nombre de su carpeta en modules/<pais>)
// Cada país ve en el panel las entradas "global" + las suyas. La versión (VERSION) es una sola para todos.
export const NOVEDADES = [
  {
    version: "1.2.1",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Novedades en panel lateral y corrección en Honduras",
    cambios: [
      "Las novedades ahora se abren en un panel que se desliza desde la derecha",
      "Cada país ve solo las novedades de su país y las generales de toda la aplicación",
      "Corregido: la pantalla de Honduras se quedaba en blanco al entrar",
    ],
  },
  {
    version: "1.2.0",
    alcance: "mexico",
    fecha: "2026-10-24",
    titulo: "Hoja de consulta única e importación de reportes de monitores en RENACED",
    cambios: [
      "Ahora se pueden importar reportes PDF de Dexcom Clarity, Medtronic CareLink, Tandem y Tidepool, además de FreeStyle Libre",
      "El sistema reconoce solo el tipo de reporte; si no lo detecta, se puede elegir manualmente",
      "Nueva pestaña \"Reportes MCG\" en el paciente con el historial, la clasificación y el enlace al PDF original",
      "Se guardan también datos propios de cada monitor, como la insulina diaria de bombas Tandem y Medtronic",
      "\"Escanear PDF\" ahora se llama \"Importar MCG\", con un diseño renovado, animación de análisis y resumen visual de los rangos",
      "Consultas: ahora la consulta es una sola hoja con secciones que se abren al hacer clic (Visita, Laboratorio, Tratamiento, Complicaciones y Educación)",
      "La fecha de la consulta se captura una sola vez; solo se guarda lo que se llene",
      "Visita con más medidas: estatura en cm, ICA, ICC, músculo, grasa (kg y %), grasa visceral y perímetro cefálico; IMC, ICA e ICC se calculan solos",
      "Nuevo historial de consultas: línea de tiempo por fecha con visita, laboratorio, tratamiento, complicaciones y educación, incluyendo los datos del sistema anterior",
      "Corregido: los PDFs con acentos en el nombre ya se guardan con un nombre válido",
    ],
  },
  {
    version: "1.1.0",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Notificaciones, novedades y migración de base de datos",
    cambios: [
      "Nueva campana de notificaciones: pacientes en alto riesgo, escaneos recientes y avisos del Super Admin",
      "Nuevo botón de novedades con el historial de cambios del sistema",
      "El Super Admin puede importar la base del sistema anterior (renaced1.sql) desde Importar BD",
    ],
  },
  {
    version: "1.0.0",
    alcance: "mexico",
    fecha: "2026-07-24",
    titulo: "Versión inicial de RENACED México",
    cambios: [
      "Registro de pacientes, consultas, laboratorio, tratamiento y evaluación",
      "Escaneo de reportes PDF de monitoreo continuo de glucosa",
      "Dashboard, reportes y mapa de pacientes",
    ],
  },
];

/** Novedades visibles para un país: las globales + las de ese país. */
export const novedadesDe = (alcance) =>
  NOVEDADES.filter((n) => n.alcance === "global" || n.alcance === alcance);

/** Versión de la aplicación: es una sola para todos los países (la de la entrada más reciente). */
export const VERSION = NOVEDADES[0].version;
