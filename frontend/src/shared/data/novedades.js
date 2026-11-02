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
    version: "1.13.3",
    alcance: "honduras",
    fecha: "2026-11-02",
    titulo: "La edad del paciente muestra años y meses",
    cambios: [
      "La edad ahora se muestra con años y meses, por ejemplo \"8 años 7 meses\" (y con meses o días en bebés)",
      "Aplica en el encabezado y la información del paciente, el listado y el formulario",
    ],
  },
  {
    version: "1.13.2",
    alcance: "honduras",
    fecha: "2026-11-02",
    titulo: "La edad del paciente se calcula automáticamente",
    cambios: [
      "La edad ya no queda fija: se calcula siempre a partir de la fecha de nacimiento y se actualiza sola cuando el paciente cumple años",
      "Aplica en el listado, el detalle, el mapa, los filtros por edad, el dashboard, los análisis y los reportes",
      "Los pacientes sin fecha de nacimiento conservan la edad registrada",
    ],
  },
  {
    version: "1.13.1",
    alcance: "mexico",
    fecha: "2026-11-01",
    titulo: "Consentimientos: mejor conteo de pendientes",
    cambios: [
      "Los pacientes sin documento firmado ya no aparecen como \"archivo no disponible\": solo se marcan como pendientes los que realmente tienen un documento registrado",
      "El conteo de documentos faltantes en Importar BD ahora es el real",
    ],
  },
  {
    version: "1.13.0",
    alcance: "mexico",
    fecha: "2026-11-01",
    titulo: "Importar consentimientos firmados desde la pantalla",
    cambios: [
      "En Importar BD (Super Admin) hay una nueva sección para subir los PDF de avisos de privacidad y consentimientos del sistema anterior, sin usar la terminal",
      "Muestra cuántos documentos hacen falta, sube solo los necesarios en tandas y avanza con una barra de progreso",
      "Se puede repetir sin problema: continúa con los que falten",
      "Los archivos de RENACED (consentimientos, PDF de monitores y laboratorios, respaldos) ahora se guardan en el volumen del servidor y no se pierden al actualizar la aplicación",
    ],
  },
  {
    version: "1.12.1",
    alcance: "mexico",
    fecha: "2026-11-01",
    titulo: "Nuevo encabezado en el expediente",
    cambios: [
      "El expediente del paciente usa el mismo encabezado en tarjeta que la consulta, con iniciales, tipo de diabetes, sexo, edad, expediente y CURP",
      "Botones \"Volver a pacientes\", \"Consentimientos\" y \"Editar\" con icono y mejor presentación",
      "La edad en el expediente ahora muestra años y meses (o meses/días en bebés)",
    ],
  },
  {
    version: "1.12.0",
    alcance: "mexico",
    fecha: "2026-11-01",
    titulo: "Nuevo encabezado en la consulta",
    cambios: [
      "El encabezado de la consulta es ahora una tarjeta con las iniciales del paciente, su tipo de diabetes, sexo, edad y expediente",
      "Botones \"Volver a consultas\" y \"Ver expediente\" más claros y fáciles de pulsar",
      "La edad se muestra con años y meses (y con meses o días en bebés), por ejemplo \"3 años 4 meses\" o \"2 días\"",
    ],
  },
  {
    version: "1.11.0",
    alcance: "global",
    fecha: "2026-11-01",
    titulo: "Zona horaria por país y por clínica",
    cambios: [
      "Cada país usa su propia zona horaria: el \"hoy\", las horas y las fechas de los reportes ya no dependen del reloj del equipo ni del servidor",
      "En México cada clínica puede tener su zona horaria (centro, sureste, pacífico, Sonora, noroeste, frontera)",
      "El Super Admin elige la zona de cada país al crear o editar el país",
      "Los contadores y filtros de la bitácora y la auditoría usan el día del país",
      "Pacientes (México): ahora se busca también por número de expediente",
      "El Super Admin ve las novedades de todos los países",
    ],
  },
  {
    version: "1.10.0",
    alcance: "mexico",
    fecha: "2026-10-31",
    titulo: "Actualizar la base desde el sistema anterior",
    cambios: [
      "Importar BD ahora tiene el modo \"Actualizar\": recarga los datos de pacientes desde el nuevo archivo del sistema anterior sin tocar usuarios ni clínicas",
      "Barra de progreso con porcentaje, como al copiar archivos: muestra la subida, la carga del archivo y cada paso de la migración",
      "Los pacientes que ya existían conservan su folio RENACED",
    ],
  },
  {
    version: "1.9.0",
    alcance: "mexico",
    fecha: "2026-10-31",
    titulo: "Consentimientos firmados en el expediente",
    cambios: [
      "Nuevo botón \"Consentimientos\" en el expediente del paciente para ver el aviso de privacidad y el consentimiento informado firmados",
      "Se pueden subir o reemplazar los documentos (PDF o imagen) desde la misma ventana",
      "Los documentos solo se abren con sesión iniciada y respetan la clínica del usuario",
    ],
  },
  {
    version: "1.8.2",
    alcance: "mexico",
    fecha: "2026-10-31",
    titulo: "Lectura de triglicéridos en el examen",
    cambios: [
      "Al subir el PDF del examen ahora también se lee el valor de triglicéridos",
    ],
  },
  {
    version: "1.8.1",
    alcance: "mexico",
    fecha: "2026-10-31",
    titulo: "Corrección al registrar pacientes",
    cambios: [
      "Se corrigió el error \"Error al registrar paciente\" al guardar un paciente nuevo",
    ],
  },
  {
    version: "1.8.0",
    alcance: "mexico",
    fecha: "2026-10-31",
    titulo: "Subir examen de laboratorio en PDF",
    cambios: [
      "Nuevo botón \"Subir examen (PDF)\" en Laboratorio, en la consulta y en el expediente: lee el PDF y llena los resultados",
      "Revisas los valores antes de guardar; avisa si el nombre del examen no coincide con el paciente",
      "El PDF queda guardado y se puede abrir con \"Ver PDF\" en la tabla de laboratorio",
      "Laboratorio ahora incluye vitamina D, ácido úrico, anticuerpos, péptido C al azar y más análisis",
    ],
  },
  {
    version: "1.7.1",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Avisos más visibles",
    cambios: [
      "Cuando hay una novedad nueva, el botón ✨ de la barra superior late con aros pulsantes ámbar",
      "Cuando hay notificaciones sin leer, la campana 🔔 suena con aros pulsantes rojos y el contador late",
      "Las animaciones se calman al abrir el panel y respetan la opción de \"reducir movimiento\" del dispositivo",
    ],
  },
  {
    version: "1.7.0",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Tarjetas de país en la página principal",
    cambios: [
      "Las tarjetas de cada país en la página principal ahora son botones: un clic lleva directo al inicio de sesión de ese país",
      "Cada tarjeta muestra \"Iniciar sesión →\" para que se vea que se puede tocar",
    ],
  },
  {
    version: "1.6.0",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Nuevo menú de usuario",
    cambios: [
      "Menú de usuario rediseñado: avatar redondo con tus iniciales, tu nombre, tu rol y opciones con íconos",
      "Nueva opción \"Mi perfil\" con tus datos (usuario, rol, país, clínica y médico vinculado)",
      "Nueva opción \"Ayuda y soporte\" con consejos para instalar y actualizar la app",
      "\"Cerrar sesión\" ahora se destaca en rojo",
    ],
  },
  {
    version: "1.5.2",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Mejoras de pantalla en el celular",
    cambios: [
      "Corregido: en el celular la barra superior ya cabe completa y la pantalla no se corre ni se corta hacia un lado",
      "Las gráficas del dashboard de RENACED se acomodan en una sola columna en pantallas pequeñas",
      "La barra fija de la consulta se mantiene arriba al desplazarse en el celular",
    ],
  },
  {
    version: "1.5.1",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Corrección de la app en iPhone",
    cambios: [
      "Corregido: en iPhone la barra de estado (hora y batería) ya no tapa el encabezado de la app instalada",
    ],
  },
  {
    version: "1.5.0",
    alcance: "mexico",
    fecha: "2026-10-24",
    titulo: "Consultas firmadas por el médico",
    cambios: [
      "Cada usuario puede vincularse a su médico (desde Usuarios → Médico vinculado)",
      "Las consultas quedan registradas a nombre del médico del usuario que las captura, y se ve en la hoja de consulta y en el historial",
      "Si el usuario no tiene médico vinculado, la hoja lo avisa antes de guardar",
    ],
  },
  {
    version: "1.4.0",
    alcance: "global",
    fecha: "2026-10-24",
    titulo: "Instala la app y actualízala con un clic",
    cambios: [
      "Ahora se puede instalar como app desde el login de cada país (botón \"Instalar como app\") y queda anclada en el inicio del celular o del escritorio",
      "En iPhone el botón muestra los pasos para agregarla a la pantalla de inicio desde Safari",
      "Cuando hay una versión nueva aparece el aviso \"Hay una nueva versión\"; con un clic en \"Actualizar ahora\" se instala y se ven los cambios al momento",
      "La app abre aunque falle la conexión (con la última versión guardada)",
    ],
  },
  {
    version: "1.3.0",
    alcance: "mexico",
    fecha: "2026-10-24",
    titulo: "Consulta en una sola hoja, sin pestañas",
    cambios: [
      "Toda la consulta se captura en una sola pantalla con apartados que se abren al hacer clic, ordenados en tres grupos: Consulta de hoy, Ficha del paciente y Casos especiales",
      "Consulta de hoy: Visita, Laboratorio, Tratamiento, Complicaciones, Educación, Estilo de vida, Toxicomanías y Eventos agudos se guardan con la fecha de la consulta, con un solo botón",
      "Ficha del paciente: Diagnóstico, Comorbilidades, Patologías y Antecedentes ginecobstétricos (solo mujeres) conservan sus propias fechas",
      "Casos especiales: Embarazo (solo mujeres) y Reclasificación del tipo de diabetes",
      "Franja de resumen al abrir la consulta: tipo de diabetes, evolución, patologías, última HbA1c, tratamiento y última consulta",
      "En la primera consulta (sin diagnóstico) la Ficha del paciente aparece primero y con el Diagnóstico abierto; en seguimientos se abre primero la consulta de hoy",
      "El historial ahora también muestra Estilo de vida, Toxicomanías y Eventos agudos",
      "Corregido: Patologías, Eventos, Embarazo y Reclasificación ya guardan correctamente en la base de datos",
    ],
  },
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

/** Novedades visibles para un país: las globales + las de ese país. "todos" (Super Admin) ve todas. */
export const novedadesDe = (alcance) =>
  alcance === "todos"
    ? NOVEDADES
    : NOVEDADES.filter((n) => n.alcance === "global" || n.alcance === alcance);

/** Versión de la aplicación: es una sola para todos los países (la de la entrada más reciente). */
export const VERSION = NOVEDADES[0].version;
