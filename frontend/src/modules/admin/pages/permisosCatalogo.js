// Catálogo de módulos que el Super Admin puede habilitar/deshabilitar por país y por usuario.
// Debe reflejar MODULOS_VALIDOS_TENANT en backend/modules/admin/controllers/tenantUsuarios.controller.js.
// "Importar BD" NO está aquí a propósito: es exclusivo del Super Admin y no se puede asignar.

export const GRUPOS = [
  { id: "principal",   nombre: "Principal" },
  { id: "clinico",     nombre: "Atención clínica" },
  { id: "herramientas", nombre: "Herramientas" },
  { id: "analisis",    nombre: "Análisis y reportes" },
  { id: "admin",       nombre: "Administración" },
];

const HONDURAS = [
  { clave: "dashboard",        nombre: "Dashboard",         grupo: "principal",    desc: "Resumen general y gráficas" },
  { clave: "consolidado",      nombre: "Consolidado",       grupo: "principal",    desc: "Vista consolidada de indicadores" },
  { clave: "pacientes",        nombre: "Pacientes",         grupo: "clinico",      desc: "Expedientes, alta y edición de pacientes" },
  { clave: "consultas",        nombre: "Consultas",         grupo: "clinico",      desc: "Hoja de consulta e historial" },
  { clave: "mensajes",         nombre: "Mensajes",          grupo: "clinico",      desc: "Mensajería con pacientes" },
  { clave: "analisis",         nombre: "Analizar PDF",      grupo: "herramientas", desc: "Lectura automática de exámenes en PDF" },
  { clave: "importaciones",    nombre: "Importación HEU",   grupo: "herramientas", desc: "Importar datos desde archivos HEU" },
  { clave: "backup_pacientes", nombre: "Backup Pacientes",  grupo: "herramientas", desc: "Respaldo y descarga de pacientes" },
  { clave: "mapa",             nombre: "Mapa",              grupo: "analisis",     desc: "Distribución geográfica de pacientes" },
  { clave: "reportes",         nombre: "Reportes",          grupo: "analisis",     desc: "Reportes y exportaciones" },
  { clave: "permisos",         nombre: "Permisos",          grupo: "admin",        desc: "Gestionar permisos del país" },
  { clave: "usuarios",         nombre: "Usuarios",          grupo: "admin",        desc: "Alta y administración de usuarios" },
  { clave: "auditoria",        nombre: "Auditoría",         grupo: "admin",        desc: "Bitácora de acciones del sistema" },
];

const RENACED = [
  { clave: "dashboard",    nombre: "Dashboard",    grupo: "principal",    desc: "Resumen general y gráficas del país" },
  { clave: "pacientes",    nombre: "Pacientes",    grupo: "clinico",      desc: "Expedientes, alta y edición de pacientes" },
  { clave: "consultas",    nombre: "Consultas",    grupo: "clinico",      desc: "Hoja de consulta, historial y laboratorios" },
  { clave: "importar_pdf", nombre: "Importar PDF", grupo: "herramientas", desc: "Botón para leer historia clínica, notas de evolución y recetas desde un PDF" },
  { clave: "mapa",         nombre: "Mapa",         grupo: "analisis",     desc: "Distribución geográfica de pacientes" },
  { clave: "reportes",     nombre: "Reportes",     grupo: "analisis",     desc: "Reportes y exportaciones a Excel / CSV" },
  { clave: "clinicas",     nombre: "Clínicas",     grupo: "admin",        desc: "Alta y administración de clínicas" },
  { clave: "usuarios",     nombre: "Usuarios",     grupo: "admin",        desc: "Alta y administración de usuarios" },
];

export function catalogoModulos(codigo) {
  return codigo === "hn" ? HONDURAS : RENACED;
}

export function agruparModulos(catalogo) {
  return GRUPOS
    .map((g) => ({ ...g, modulos: catalogo.filter((m) => m.grupo === g.id) }))
    .filter((g) => g.modulos.length > 0);
}

export const PERFIL_LABELS = {
  1: "Administrador", 2: "Médico", 3: "Asistente", 4: "Enfermera", 5: "Investigador",
  6: "Admin. de Clínica", 7: "Consulta nacional",
};
