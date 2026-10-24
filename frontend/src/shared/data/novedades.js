// Registro de cambios del sistema. Es la fuente única de las "Novedades" (botón ✨)
// y de la versión que se muestra en el pie del menú lateral.
//
// Regla: en CADA push se agrega una entrada NUEVA al inicio de este arreglo
// (versión semver: patch = correcciones, minor = funciones nuevas, major = cambios grandes).
// La versión mostrada es siempre la de la primera entrada.
export const NOVEDADES = [
  {
    version: "1.1.0",
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
    fecha: "2026-07-24",
    titulo: "Versión inicial de RENACED México",
    cambios: [
      "Registro de pacientes, consultas, laboratorio, tratamiento y evaluación",
      "Escaneo de reportes PDF de monitoreo continuo de glucosa",
      "Dashboard, reportes y mapa de pacientes",
    ],
  },
];

export const VERSION = NOVEDADES[0].version;
