// ──────────────────────────────────────────────────────────────────────────────
//  Generador de propuesta comercial — Evolución Metabólica
//  Ejecutar: node generar_propuesta.cjs
// ──────────────────────────────────────────────────────────────────────────────
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, VerticalAlign, convertInchesToTwip,
  PageBreak, Spacing,
} = require("docx");
const fs = require("fs");

// ── Paleta de colores ─────────────────────────────────────────────────────────
const C = {
  morado:      "6366F1",
  moradoClaro: "EEF2FF",
  verde:       "16A34A",
  verdeClaro:  "F0FDF4",
  azul:        "1E40AF",
  azulClaro:   "EFF6FF",
  gris:        "64748B",
  grisClaro:   "F8FAFC",
  naranja:     "D97706",
  naranjaClaro:"FFFBEB",
  rojo:        "DC2626",
  rojoClaro:   "FEF2F2",
  blanco:      "FFFFFF",
  negro:       "1E293B",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function titulo1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: C.morado,
        font: "Calibri",
      }),
    ],
  });
}

function titulo2(text, color = C.azul) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color,
        font: "Calibri",
      }),
    ],
  });
}

function titulo3(text, color = C.negro) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color,
        font: "Calibri",
      }),
    ],
  });
}

function parrafo(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({
        text,
        size: opts.size || 22,
        color: opts.color || C.negro,
        bold: opts.bold || false,
        italics: opts.italic || false,
        font: "Calibri",
      }),
    ],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 21,
        color: C.negro,
        bold,
        font: "Calibri",
      }),
    ],
  });
}

function separador() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { color: C.morado, space: 1, value: BorderStyle.SINGLE, size: 6 },
    },
    children: [],
  });
}

function espacio(n = 1) {
  return new Paragraph({ children: [new TextRun({ text: " ".repeat(n) })] });
}

function celdaEncabezado(text, bgColor = C.morado) {
  return new TableCell({
    shading: { fill: bgColor, type: ShadingType.CLEAR, color: bgColor },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            color: C.blanco,
            size: 20,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function celda(text, bgColor = C.blanco, bold = false, color = C.negro, center = false) {
  return new TableCell({
    shading: { fill: bgColor, type: ShadingType.CLEAR, color: bgColor },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold,
            color,
            size: 20,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

// ── DOCUMENTO ────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Evolución Metabólica",
  title: "Propuesta Comercial — Sistema Evolución Metabólica",
  description: "Propuesta para gestión de pacientes con diabetes usando MCG",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: C.negro },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.2),
            right:  convertInchesToTwip(1.2),
          },
        },
      },
      children: [

        // ═══════════════════════════════════════════════════════
        //  PORTADA
        // ═══════════════════════════════════════════════════════
        espacio(2),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "EVOLUCIÓN METABÓLICA",
              bold: true,
              size: 52,
              color: C.morado,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({
              text: "Sistema Clínico de Gestión para Diabetes con MCG",
              size: 30,
              color: C.gris,
              italics: true,
              font: "Calibri",
            }),
          ],
        }),
        separador(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: "PROPUESTA COMERCIAL",
              bold: true,
              size: 28,
              color: C.azul,
              font: "Calibri",
            }),
          ],
        }),
        parrafo("Dirigida a: Departamento de Endocrinología — Hospital Escuela Universitario", { center: true, color: C.gris }),
        parrafo("Fecha: Abril 2026", { center: true, color: C.gris }),
        espacio(4),

        // ═══════════════════════════════════════════════════════
        //  1. INTRODUCCIÓN
        // ═══════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("1. Introducción"),
        separador(),

        parrafo(
          "Evolución Metabólica es un sistema de información clínica especializado en el manejo integral de pacientes con diabetes mellitus que utilizan Monitoreo Continuo de Glucosa (MCG). Desarrollado específicamente para el contexto hospitalario hondureño, el sistema digitaliza y automatiza el flujo de trabajo de los equipos de endocrinología pediátrica, permitiendo un seguimiento preciso, basado en evidencia y alineado con los estándares internacionales de la ISPAD (International Society for Pediatric and Adolescent Diabetes)."
        ),
        espacio(),
        parrafo(
          "El sistema centraliza el expediente clínico digital del paciente, desde su registro hasta el análisis de sus métricas de glucosa, curvas de crecimiento, historial de insulinoterapia y comunicación directa con el paciente vía WhatsApp. Todo esto accesible desde cualquier dispositivo con conexión a internet, sin instalaciones locales requeridas."
        ),
        espacio(),
        parrafo(
          "Actualmente el sistema se encuentra en producción y en uso activo con datos reales de pacientes de Honduras, lo que garantiza su estabilidad y adaptación al entorno local."
        ),

        espacio(2),
        titulo2("¿Por qué un sistema especializado en MCG?", C.morado),
        parrafo(
          "Los monitores de glucosa generan reportes PDF con decenas de métricas (TIR, TAR, TBR, GMI, CV, GRI, entre otras). Sin un sistema especializado, los médicos transcriben estos datos manualmente, lo que consume tiempo valioso en consulta y aumenta el riesgo de errores. Evolución Metabólica extrae automáticamente estos datos del PDF, clasifica al paciente según criterios ISPAD y los almacena en su expediente en segundos."
        ),

        // ═══════════════════════════════════════════════════════
        //  2. MÓDULOS
        // ═══════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("2. Módulos del Sistema"),
        separador(),

        // ── 2.1 Dashboard ──────────────────────────────────────
        titulo2("2.1  Dashboard Epidemiológico", C.morado),
        parrafo("Panel de control con indicadores clave en tiempo real para la toma de decisiones clínicas y administrativas."),
        espacio(),
        bullet("Estadísticas globales: total de pacientes activos, número de análisis realizados, promedios de TIR, GMI, CV y glucosa promedio del universo de pacientes."),
        bullet("Distribución por clasificación ISPAD: cuántos pacientes están en rango Óptimo, Moderado o de Alto Riesgo."),
        bullet("Desagregación por departamento geográfico, por género y por grupo etario."),
        bullet("Filtro por institución: permite al jefe de servicio ver solo los pacientes de su hospital."),
        bullet("Visualizaciones con gráficas interactivas de barras y pasteles."),
        espacio(),
        parrafo("Ventaja clave: en hospitales de referencia que atienden múltiples instituciones (HMEP, IHSS, Hospital Escuela), cada médico ve únicamente sus pacientes sin comprometer la privacidad de los demás.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.2 Gestión de Pacientes ───────────────────────────
        titulo2("2.2  Gestión de Pacientes", C.morado),
        parrafo("Expediente clínico digital completo para cada paciente con diabetes."),
        espacio(),
        bullet("Registro con datos demográficos: nombre, edad, sexo, fecha de nacimiento, tipo de diabetes, fecha de debut, institución de referencia."),
        bullet("Georeferenciación automática: al guardar la dirección del paciente, el sistema obtiene sus coordenadas geográficas para ubicarlo en el mapa epidemiológico."),
        bullet("Historial completo de análisis MCG, consultas, crecimiento e insulinoterapia accesible desde una sola pantalla."),
        bullet("Búsqueda y filtrado avanzado por nombre, institución, clasificación o departamento."),
        bullet("Control de estado activo/inactivo del paciente."),
        espacio(),
        parrafo("Ventaja clave: elimina los expedientes en papel y permite que varios médicos accedan al mismo paciente de forma simultánea y segura.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.3 Análisis MCG ──────────────────────────────────
        titulo2("2.3  Análisis de Monitoreo Continuo de Glucosa (MCG)", C.morado),
        parrafo("Módulo central del sistema. Registra, clasifica y analiza los datos del monitor de glucosa de cada paciente."),
        espacio(),
        bullet("Registro de métricas completas: TIR, TAR total, TAR muy alto, TAR alto, TBR, TBR bajo, TBR muy bajo, GMI, CV, tiempo activo del sensor, glucosa promedio, GRI."),
        bullet("Clasificación automática ISPAD: el sistema determina si el paciente es Óptimo, Moderado o de Alto Riesgo sin intervención del médico."),
        bullet("Registro de eventos de hipoglucemia y duración total."),
        bullet("Seguimiento de cambios de dosis de insulina post-análisis."),
        bullet("Registro de HbA1c posterior al monitoreo para comparación."),
        bullet("Registro de limitaciones del paciente: conectividad a internet, alergias, situación económica."),
        bullet("Historial cronológico de análisis para visualizar evolución del paciente a lo largo del tiempo."),
        bullet("Número de registro automático por paciente (análisis 1, 2, 3…)."),
        espacio(),
        parrafo("Ventaja clave: la clasificación ISPAD automatizada convierte criterios internacionales complejos en una decisión clínica instantánea, reduciendo la variabilidad entre médicos.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.4 Carga de PDF ──────────────────────────────────
        titulo2("2.4  Parseo Automático de Reportes PDF (Syai X1)", C.morado),
        parrafo("Módulo único en la región: extrae automáticamente las métricas del reporte PDF generado por el monitor Syai X1."),
        espacio(),
        bullet("El médico sube el PDF del monitor y el sistema extrae TIR, TAR, TBR, GMI, CV, glucosa promedio y más, sin necesidad de transcripción manual."),
        bullet("El médico revisa los datos extraídos antes de confirmar el guardado."),
        bullet("Clasificación ISPAD calculada automáticamente sobre los datos extraídos."),
        bullet("Reducción de tiempo en consulta: de 5–10 minutos de transcripción manual a menos de 30 segundos."),
        bullet("Almacenamiento del archivo PDF original vinculado al análisis del paciente."),
        espacio(),
        parrafo("Ventaja clave: ningún otro sistema hospitalario público en Honduras tiene esta capacidad. Elimina el principal cuello de botella de la consulta de MCG.", { color: C.verde, bold: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 2.5 Crecimiento ───────────────────────────────────
        titulo2("2.5  Curvas de Crecimiento", C.morado),
        parrafo("Seguimiento del desarrollo antropométrico del paciente pediátrico con interpretación clínica automática según estándares OMS."),
        espacio(),
        bullet("Registro de peso, talla, IMC, perímetro cefálico y Tanner por fecha de evaluación."),
        bullet("Cálculo automático de Z-score para cada indicador (peso/edad, talla/edad, IMC/edad, PC/edad)."),
        bullet("Conversión de Z-score a percentil (P5, P25, P50, P75, P95…)."),
        bullet("Clasificación automática: Talla baja severa, Talla baja, Normal, Talla alta; Delgadez severa, Delgadez, Sobrepeso, Obesidad, etc."),
        bullet("Historial cronológico para evaluar tendencia de crecimiento."),
        espacio(),
        parrafo("Ventaja clave: integra el seguimiento endocrinológico completo (glucemia + crecimiento) en un solo sistema, sin software adicional.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.6 Historial Clínico ─────────────────────────────
        titulo2("2.6  Historial Clínico (Insulinoterapia)", C.morado),
        parrafo("Registro longitudinal de los cambios en el esquema de insulinoterapia del paciente."),
        espacio(),
        bullet("Registro de insulina prolongada y de acción rápida: nombre comercial, dosis en unidades/kg y unidades absolutas."),
        bullet("Cálculo automático de dosis total diaria (insulina prolongada + insulina corta)."),
        bullet("Registro de vía de administración y motivo del cambio de dosis."),
        bullet("Observaciones clínicas libres por registro."),
        bullet("Historial cronológico para evaluar ajustes de tratamiento a lo largo del tiempo."),
        espacio(),
        parrafo("Ventaja clave: permite correlacionar los cambios de dosis con la evolución de las métricas MCG, facilitando la toma de decisiones terapéuticas basadas en datos.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.7 Consultas ────────────────────────────────────
        titulo2("2.7  Registro de Consultas", C.morado),
        parrafo("Módulo para documentar las consultas médicas del paciente."),
        espacio(),
        bullet("Registro de fecha, motivo de consulta, hallazgos físicos y plan de manejo."),
        bullet("Modal de impresión para generar notas de consulta en formato estándar."),
        bullet("Historial de consultas ordenado cronológicamente por paciente."),
        espacio(),
        parrafo("Ventaja clave: integra la nota de consulta con el análisis MCG y el historial clínico, dando contexto completo al médico en cada visita.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.8 Mapa Epidemiológico ────────────────────────────
        titulo2("2.8  Mapa Epidemiológico de Pacientes", C.morado),
        parrafo("Visualización geográfica de todos los pacientes activos sobre el mapa de Honduras."),
        espacio(),
        bullet("Marcadores con color según clasificación ISPAD: verde (Óptimo), naranja (Moderado), rojo (Alto Riesgo), morado (Sin análisis)."),
        bullet("Marcadores de Alto Riesgo con animación pulsante para visibilidad inmediata."),
        bullet("Popup informativo por paciente: nombre, municipio, departamento, clasificación, institución y enlace a su expediente."),
        bullet("Filtros por clasificación y búsqueda por nombre."),
        bullet("Botón de centrado en Honduras con un clic."),
        espacio(),
        parrafo("Ventaja clave: herramienta única para investigación epidemiológica. Permite identificar zonas geográficas con alta concentración de pacientes en riesgo para orientar intervenciones.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.9 Mensajería WhatsApp ───────────────────────────
        titulo2("2.9  Mensajería WhatsApp Automatizada", C.morado),
        parrafo("Comunicación directa con pacientes o tutores a través de WhatsApp, personalizada por clasificación clínica."),
        espacio(),
        bullet("Envío de mensajes personalizados según clasificación ISPAD: mensajes de alerta para Alto Riesgo, de seguimiento para Moderado, de felicitación para Óptimo."),
        bullet("Mensaje generado automáticamente con el nombre del paciente, la institución y recomendaciones específicas."),
        bullet("El médico puede editar el mensaje antes de enviarlo."),
        bullet("Historial completo de mensajes enviados: fecha, estado (enviado/fallido), quién lo envió."),
        bullet("Ideal para pacientes que no pueden movilizarse frecuentemente a la institución."),
        espacio(),
        parrafo("Ventaja clave: extiende el alcance del médico más allá de la consulta presencial, mejorando adherencia al tratamiento sin aumentar la carga de trabajo.", { color: C.verde, bold: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 2.10 Usuarios y Permisos ──────────────────────────
        titulo2("2.10  Gestión de Usuarios y Permisos", C.morado),
        parrafo("Control de acceso granular para equipos médicos multidisciplinarios."),
        espacio(),
        bullet("Creación de usuarios con roles diferenciados: Administrador, Médico, Enfermería, etc."),
        bullet("Control de permisos por módulo: quién puede leer, escribir o administrar cada sección."),
        bullet("Autenticación segura con JWT (tokens de sesión encriptados)."),
        bullet("Contraseñas almacenadas con cifrado bcrypt."),
        espacio(),
        parrafo("Ventaja clave: cumple con los requisitos de confidencialidad de datos médicos al garantizar que cada usuario accede únicamente a lo que le corresponde.", { color: C.verde, bold: true }),

        espacio(2),

        // ── 2.11 Auditoría ────────────────────────────────────
        titulo2("2.11  Bitácora de Auditoría", C.morado),
        parrafo("Registro automático de todas las acciones realizadas en el sistema."),
        espacio(),
        bullet("Registro de quién hizo qué y cuándo: creación, edición y eliminación de registros."),
        bullet("Trazabilidad completa del expediente del paciente."),
        bullet("Requisito fundamental para sistemas de información en salud."),
        espacio(),
        parrafo("Ventaja clave: ofrece respaldo legal y cumplimiento normativo en el manejo de información clínica sensible.", { color: C.verde, bold: true }),

        // ═══════════════════════════════════════════════════════
        //  3. PLANES Y PRECIOS
        // ═══════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("3. Planes y Precios"),
        separador(),

        parrafo(
          "Evolución Metabólica se ofrece bajo modelo de suscripción mensual (SaaS), lo que incluye alojamiento en la nube, copias de seguridad automáticas, actualizaciones del sistema y soporte técnico. No se requiere inversión en servidores ni en infraestructura local."
        ),
        espacio(),

        // ── Tabla de planes ───────────────────────────────────
        titulo2("3.1  Tabla Comparativa de Planes", C.morado),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Encabezado
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Característica",          C.morado),
                celdaEncabezado("Plan Básico",             C.azul),
                celdaEncabezado("Plan Profesional",        C.verde),
                celdaEncabezado("Plan Institucional",      "B45309"),
                celdaEncabezado("Plan Asociación",         "7C3AED"),
              ],
            }),
            // Precio
            new TableRow({
              children: [
                celda("Precio mensual (USD)",     C.grisClaro, true),
                celda("$80 – $120",               C.azulClaro,    true, C.azul,    true),
                celda("$200 – $350",              C.verdeClaro,   true, C.verde,   true),
                celda("$500 – $800",              "FFFBEB",       true, "B45309",  true),
                celda("$900 – $1,500",            "F5F3FF",       true, "7C3AED",  true),
              ],
            }),
            // Usuarios
            new TableRow({
              children: [
                celda("Usuarios incluidos",  C.grisClaro, true),
                celda("1 – 3",               C.blanco, false, C.negro, true),
                celda("4 – 10",              C.blanco, false, C.negro, true),
                celda("11 – 30",             C.blanco, false, C.negro, true),
                celda("Usuarios ilimitados", C.blanco, false, C.negro, true),
              ],
            }),
            // Instituciones
            new TableRow({
              children: [
                celda("Instituciones",  C.grisClaro, true),
                celda("1",             C.blanco, false, C.negro, true),
                celda("1",             C.blanco, false, C.negro, true),
                celda("1",             C.blanco, false, C.negro, true),
                celda("Múltiples",     C.blanco, false, C.negro, true),
              ],
            }),
            // Módulo análisis MCG
            new TableRow({
              children: [
                celda("Análisis MCG + clasificación ISPAD",  C.grisClaro, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // Parseo PDF
            new TableRow({
              children: [
                celda("Parseo automático de PDF Syai",  C.grisClaro, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // Crecimiento
            new TableRow({
              children: [
                celda("Curvas de crecimiento OMS",  C.grisClaro, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // WhatsApp
            new TableRow({
              children: [
                celda("Mensajería WhatsApp",  C.grisClaro, true),
                celda("—",  C.blanco, false, C.gris, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // Mapa
            new TableRow({
              children: [
                celda("Mapa epidemiológico",  C.grisClaro, true),
                celda("—",  C.blanco, false, C.gris, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // Dashboard global
            new TableRow({
              children: [
                celda("Dashboard multi-institución",  C.grisClaro, true),
                celda("—",  C.blanco, false, C.gris, true),
                celda("—",  C.blanco, false, C.gris, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // Auditoría
            new TableRow({
              children: [
                celda("Auditoría y bitácora",  C.grisClaro, true),
                celda("—",  C.blanco, false, C.gris, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
                celda("✔",  C.blanco, true, C.verde, true),
              ],
            }),
            // Soporte
            new TableRow({
              children: [
                celda("Soporte técnico",  C.grisClaro, true),
                celda("Correo / 48h",     C.blanco, false, C.negro, true),
                celda("WhatsApp / 24h",   C.blanco, false, C.negro, true),
                celda("Prioritario / 8h", C.blanco, false, C.negro, true),
                celda("Dedicado / 4h",    C.blanco, false, C.negro, true),
              ],
            }),
            // Capacitación
            new TableRow({
              children: [
                celda("Capacitación inicial",  C.grisClaro, true),
                celda("1 sesión virtual",      C.blanco, false, C.negro, true),
                celda("2 sesiones virtuales",  C.blanco, false, C.negro, true),
                celda("Presencial incluida",   C.blanco, false, C.negro, true),
                celda("2 visitas presenciales",C.blanco, false, C.negro, true),
              ],
            }),
          ],
        }),

        espacio(2),

        // ── Descripción de cada plan ──────────────────────────
        titulo2("3.2  Descripción Detallada de los Planes", C.morado),

        espacio(),
        titulo3("Plan Básico — $80 a $120 / mes", C.azul),
        parrafo("Ideal para médicos en consulta privada o residentes que atienden un volumen reducido de pacientes con MCG. Incluye todos los módulos clínicos esenciales: registro de pacientes, análisis MCG con clasificación ISPAD, parseo de PDF, curvas de crecimiento, historial de insulina y consultas. Hasta 3 usuarios simultáneos."),

        espacio(),
        titulo3("Plan Profesional — $200 a $350 / mes", C.verde),
        parrafo("Diseñado para equipos médicos pequeños de 4 a 10 usuarios dentro de una institución. Agrega mensajería WhatsApp para seguimiento remoto de pacientes, mapa epidemiológico, bitácora de auditoría y soporte técnico por WhatsApp con respuesta en 24 horas. Recomendado para clínicas especializadas o consultorios grupales."),

        espacio(),
        titulo3("Plan Institucional — $500 a $800 / mes", "B45309"),
        parrafo("Orientado a hospitales con departamentos de endocrinología de 11 a 30 usuarios. Incluye dashboard multi-institución con filtros por hospital, capacitación presencial en las instalaciones, soporte prioritario con respuesta máxima en 8 horas, y acceso completo a todos los módulos del sistema."),

        espacio(),
        titulo3("Plan Asociación — $900 a $1,500 / mes", "7C3AED"),
        parrafo("Solución para asociaciones médicas, redes hospitalarias o proyectos de investigación que agrupan múltiples instituciones (ej. HMEP + IHSS + Hospital Escuela + clínicas regionales). Incluye usuarios ilimitados, gestión de múltiples instituciones desde un solo panel, mapa epidemiológico nacional, 2 visitas presenciales de capacitación, soporte dedicado con respuesta en 4 horas e informes epidemiológicos consolidados. Precio final negociable según número de instituciones y volumen de pacientes."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        //  4. OPCIÓN DE VENTA DE LICENCIA ÚNICA
        // ═══════════════════════════════════════════════════════
        titulo1("4. Opción de Licencia Única (Compra)"),
        separador(),
        parrafo("Para instituciones que prefieren una inversión única en lugar de pago mensual, se ofrece la venta de licencia perpetua con las siguientes condiciones:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Alcance de la Licencia",    C.morado),
                celdaEncabezado("Precio único (USD)",        C.morado),
                celdaEncabezado("Incluye",                   C.morado),
              ],
            }),
            new TableRow({
              children: [
                celda("1 médico / consultorio privado",   C.grisClaro, true),
                celda("$800 – $1,500",                    C.blanco, true, C.azul, true),
                celda("Instalación + 1 capacitación",     C.blanco),
              ],
            }),
            new TableRow({
              children: [
                celda("Departamento (3–10 usuarios)",     C.grisClaro, true),
                celda("$2,500 – $4,000",                  C.blanco, true, C.verde, true),
                celda("Instalación + 2 capacitaciones + 6 meses de soporte",  C.blanco),
              ],
            }),
            new TableRow({
              children: [
                celda("Licencia institucional completa",  C.grisClaro, true),
                celda("$5,000 – $10,000",                 C.blanco, true, "B45309", true),
                celda("Instalación + capacitación presencial + 12 meses de soporte",  C.blanco),
              ],
            }),
            new TableRow({
              children: [
                celda("Red / Asociación (multi-institución)", C.grisClaro, true),
                celda("$12,000 – $20,000",                    C.blanco, true, "7C3AED", true),
                celda("Instalación + 2 visitas + 12 meses de soporte dedicado",  C.blanco),
              ],
            }),
          ],
        }),
        espacio(),
        parrafo("Nota: La venta de licencia única no incluye actualizaciones futuras del software. Las actualizaciones anuales tienen un costo equivalente al 20% del valor de la licencia adquirida. El soporte posterior al período incluido se cotiza por separado.", { color: C.gris, italic: true }),

        // ═══════════════════════════════════════════════════════
        //  5. ¿RENTA O COMPRA?
        // ═══════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("5. Comparativa: ¿Renta o Compra?"),
        separador(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Factor",          C.morado),
                celdaEncabezado("Suscripción mensual (SaaS)",  C.verde),
                celdaEncabezado("Licencia única (Compra)",     C.azul),
              ],
            }),
            new TableRow({
              children: [
                celda("Inversión inicial",                 C.grisClaro, true),
                celda("Muy baja (desde $80/mes)",          C.blanco, false, C.verde),
                celda("Alta ($800 – $20,000)",             C.blanco, false, C.rojo),
              ],
            }),
            new TableRow({
              children: [
                celda("Actualizaciones",                   C.grisClaro, true),
                celda("Incluidas automáticamente",         C.blanco, false, C.verde),
                celda("Costo adicional anual (20%)",       C.blanco, false, C.gris),
              ],
            }),
            new TableRow({
              children: [
                celda("Hosting / servidores",              C.grisClaro, true),
                celda("Incluido en el plan",               C.blanco, false, C.verde),
                celda("A cargo del cliente",               C.blanco, false, C.rojo),
              ],
            }),
            new TableRow({
              children: [
                celda("Soporte técnico",                   C.grisClaro, true),
                celda("Incluido según plan",               C.blanco, false, C.verde),
                celda("Solo durante período incluido",     C.blanco, false, C.gris),
              ],
            }),
            new TableRow({
              children: [
                celda("Aprobación presupuestaria",         C.grisClaro, true),
                celda("Gasto operativo (más fácil)",       C.blanco, false, C.verde),
                celda("Gasto de capital (más complejo)",   C.blanco, false, C.gris),
              ],
            }),
            new TableRow({
              children: [
                celda("Flexibilidad",                      C.grisClaro, true),
                celda("Alta: se puede pausar o cancelar",  C.blanco, false, C.verde),
                celda("Baja: pago único sin reversión",    C.blanco, false, C.gris),
              ],
            }),
            new TableRow({
              children: [
                celda("Recomendado para",                  C.grisClaro, true),
                celda("Hospitales, clínicas, asociaciones",C.blanco, false, C.verde),
                celda("Proyectos con financiamiento único (OPS, BID, etc.)", C.blanco, false, C.azul),
              ],
            }),
          ],
        }),

        espacio(2),
        parrafo("Recomendación: Para el Hospital Escuela Universitario, el modelo de suscripción mensual (Plan Profesional o Institucional) es la opción más conveniente. Facilita la aprobación presupuestaria como gasto operativo, incluye soporte y actualizaciones, y no requiere infraestructura tecnológica adicional.", { color: C.morado, bold: true }),

        // ═══════════════════════════════════════════════════════
        //  6. PILOTO GRATUITO
        // ═══════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("6. Propuesta de Inicio: Piloto Gratuito"),
        separador(),
        parrafo("Para facilitar la adopción del sistema en el Hospital Escuela Universitario, se propone un período de prueba gratuito de 30 días con acceso completo al Plan Profesional, sin necesidad de datos de pago ni compromiso de continuidad."),
        espacio(),
        parrafo("Durante el piloto, el equipo de endocrinología podrá:"),
        bullet("Registrar sus pacientes actuales con datos reales."),
        bullet("Subir reportes PDF del monitor Syai X1 y verificar el parseo automático."),
        bullet("Explorar el mapa epidemiológico con los datos ingresados."),
        bullet("Enviar mensajes de WhatsApp a pacientes de prueba."),
        bullet("Capacitación inicial incluida (1 sesión virtual de 2 horas)."),
        espacio(),
        parrafo("Al finalizar el piloto, el equipo médico tendrá elementos concretos para evaluar el valor del sistema y tomar una decisión informada sobre la suscripción."),

        // ═══════════════════════════════════════════════════════
        //  7. CONTACTO
        // ═══════════════════════════════════════════════════════
        espacio(2),
        titulo1("7. Contacto y Siguiente Paso"),
        separador(),
        parrafo("Para agendar una demostración en vivo del sistema, solicitar el período de piloto gratuito o negociar condiciones específicas para el Hospital Escuela Universitario, por favor comunicarse a:"),
        espacio(),
        parrafo("El equipo de Evolución Metabólica está disponible para adaptar cualquier plan a las necesidades específicas del Departamento de Endocrinología Pediátrica."),
        espacio(3),
        parrafo("─────────────────────────────────────────────────────────────", { center: true, color: C.gris }),
        parrafo("© 2026 Evolución Metabólica — Todos los derechos reservados", { center: true, color: C.gris, italic: true }),

      ],
    },
  ],
});

// ── Escribir archivo ──────────────────────────────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Propuesta_Evolucion_Metabolica.docx", buffer);
  console.log("✅  Archivo generado: Propuesta_Evolucion_Metabolica.docx");
}).catch(err => {
  console.error("❌ Error:", err);
});
