// ──────────────────────────────────────────────────────────────────────────────
//  Propuesta comercial para ALAD — Evolución Metabólica
//  Modalidades: Alquiler con mantenimiento · Venta con mantenimiento
//  Ejecutar: node generar_propuesta_alad.cjs
// ──────────────────────────────────────────────────────────────────────────────
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, VerticalAlign, convertInchesToTwip,
  PageBreak,
} = require("docx");
const fs = require("fs");

// ── Paleta de colores ─────────────────────────────────────────────────────────
const C = {
  morado:       "6366F1",
  moradoClaro:  "EEF2FF",
  verde:        "16A34A",
  verdeClaro:   "F0FDF4",
  azul:         "1E40AF",
  azulClaro:    "EFF6FF",
  gris:         "64748B",
  grisClaro:    "F8FAFC",
  naranja:      "D97706",
  naranjaClaro: "FFFBEB",
  rojo:         "DC2626",
  rojoClaro:    "FEF2F2",
  blanco:       "FFFFFF",
  negro:        "1E293B",
  teal:         "0D9488",
  tealClaro:    "F0FDFA",
  indigo:       "4338CA",
  indigoClaro:  "EEF2FF",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function titulo1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: C.morado, font: "Calibri" })],
  });
}

function titulo2(text, color = C.azul) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color, font: "Calibri" })],
  });
}

function titulo3(text, color = C.negro) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color, font: "Calibri" })],
  });
}

function parrafo(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({
      text,
      size: opts.size || 22,
      color: opts.color || C.negro,
      bold: opts.bold || false,
      italics: opts.italic || false,
      font: "Calibri",
    })],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 21, color: C.negro, bold, font: "Calibri" })],
  });
}

function subbullet(text) {
  return new Paragraph({
    bullet: { level: 1 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, color: C.gris, font: "Calibri" })],
  });
}

function separador() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { color: C.morado, space: 1, value: BorderStyle.SINGLE, size: 6 } },
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
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: C.blanco, size: 20, font: "Calibri" })],
    })],
  });
}

function celda(text, bgColor = C.blanco, bold = false, color = C.negro, center = false) {
  return new TableCell({
    shading: { fill: bgColor, type: ShadingType.CLEAR, color: bgColor },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold, color, size: 20, font: "Calibri" })],
    })],
  });
}

function badgeParrafo(icono, texto) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: icono + "  ", size: 22, font: "Calibri" }),
      new TextRun({ text: texto, size: 21, color: C.negro, font: "Calibri" }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Evolución Metabólica",
  title: "Propuesta Comercial ALAD — Sistema Evolución Metabólica",
  description: "Propuesta de alquiler y venta con mantenimiento para ALAD",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22, color: C.negro } },
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

        // ═══════════════════════════════════════════════════════════════
        //  PORTADA
        // ═══════════════════════════════════════════════════════════════
        espacio(2),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 200 },
          children: [new TextRun({ text: "EVOLUCIÓN METABÓLICA", bold: true, size: 52, color: C.morado, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
          children: [new TextRun({ text: "Sistema Clínico de Gestión para Diabetes con MCG", size: 28, color: C.gris, italics: true, font: "Calibri" })],
        }),
        separador(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: "PROPUESTA COMERCIAL", bold: true, size: 30, color: C.azul, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Dirigida a:", size: 22, color: C.gris, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "ALAD — Asociación Latinoamericana de Diabetes", bold: true, size: 28, color: C.teal, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Modalidades: Alquiler con Mantenimiento  ·  Venta con Mantenimiento", size: 22, color: C.gris, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: "Abril 2026", size: 20, color: C.gris, italics: true, font: "Calibri" })],
        }),
        espacio(4),

        // ═══════════════════════════════════════════════════════════════
        //  1. INTRODUCCIÓN
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("1. Introducción"),
        separador(),
        parrafo(
          "La Asociación Latinoamericana de Diabetes (ALAD) agrupa a las principales sociedades científicas de endocrinología y diabetes de la región, coordinando programas de educación, investigación y atención clínica en más de 20 países latinoamericanos. En este contexto, la estandarización de los procesos de monitoreo continuo de glucosa (MCG) representa una oportunidad estratégica para mejorar los desenlaces clínicos en pacientes pediátricos con diabetes a escala regional."
        ),
        espacio(),
        parrafo(
          "Evolución Metabólica es una plataforma web especializada en el manejo integral de pacientes con diabetes que utilizan MCG. El sistema digitaliza y automatiza el flujo clínico completo: desde el registro del paciente hasta el análisis automático del reporte PDF del monitor, la clasificación por criterios ISPAD, el seguimiento del crecimiento, la insulinoterapia, la comunicación con el paciente y la generación de estadísticas epidemiológicas poblacionales."
        ),
        espacio(),
        parrafo(
          "El presente documento presenta dos modalidades de adquisición adaptadas a los requerimientos y procesos presupuestarios de ALAD: el modelo de Alquiler con Mantenimiento (SaaS), recomendado para la mayoría de los programas de salud pública, y el modelo de Venta con Mantenimiento (Licencia Perpetua), orientado a proyectos con financiamiento único de organismos internacionales."
        ),
        espacio(),
        titulo2("¿Por qué Evolución Metabólica para ALAD?", C.teal),
        badgeParrafo("🌎", "Plataforma ya operativa con datos reales de pacientes hondureños — no es un prototipo."),
        badgeParrafo("🤖", "Parseo automático del PDF Syai X1: extrae TIR, GMI, CV, GRI y más sin transcripción manual."),
        badgeParrafo("📊", "Clasificación ISPAD automática — estándar internacional adoptado por ALAD."),
        badgeParrafo("🗺️", "Mapa epidemiológico regional con colores por nivel de riesgo glucémico."),
        badgeParrafo("🏥", "Multi-institución: agrupa hospitales de varios países en una sola consola."),
        badgeParrafo("💬", "Mensajería WhatsApp integrada para seguimiento remoto de pacientes."),
        badgeParrafo("📈", "Dashboard epidemiológico consolidado por país, institución, género y grupo etario."),

        // ═══════════════════════════════════════════════════════════════
        //  2. MÓDULOS
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("2. Módulos del Sistema Incluidos en Ambas Modalidades"),
        separador(),

        titulo2("2.1  Dashboard Epidemiológico Regional", C.morado),
        parrafo("Panel de control centralizado con indicadores clave en tiempo real, segmentado por país e institución afiliada."),
        bullet("Estadísticas globales: total de pacientes activos, análisis realizados, promedios de TIR, GMI y CV de toda la red."),
        bullet("Distribución ISPAD: porcentaje de pacientes en Óptimo, Moderado y Alto Riesgo por institución y por país."),
        bullet("Desagregación por departamento/región, género y grupo etario."),
        bullet("Vista comparativa entre países: identificar cuáles tienen mejores indicadores de control glucémico."),
        bullet("Filtros por institución, país, rango de fechas y clasificación."),
        espacio(),

        titulo2("2.2  Gestión de Pacientes Multi-Institución", C.morado),
        parrafo("Expediente clínico digital completo con acceso seguro y segregado por institución."),
        bullet("Registro demográfico y clínico: nombre, fecha de nacimiento, tipo de diabetes, fecha de debut, institución, georeferenciación."),
        bullet("Búsqueda global por nombre, DNI, institución o clasificación."),
        bullet("Control de estado activo/inactivo del paciente."),
        bullet("Acceso restringido: cada médico ve únicamente los pacientes de su institución."),
        espacio(),

        titulo2("2.3  Análisis MCG con Clasificación ISPAD", C.morado),
        parrafo("Módulo central. Registra, clasifica y analiza todas las métricas del monitor de glucosa."),
        bullet("Métricas completas: TIR, TAR total, TAR muy alto, TAR alto, TBR, TBR bajo, TBR muy bajo, GMI, CV, tiempo activo, glucosa promedio, GRI."),
        bullet("Clasificación ISPAD automática: Óptimo, Moderado o Alto Riesgo calculado instantáneamente."),
        bullet("Registro de hipoglucemias: número de eventos y duración promedio."),
        bullet("Seguimiento de cambios de dosis de insulina post-análisis y HbA1c post-MCG."),
        bullet("Historial cronológico por paciente para visualizar evolución a lo largo del tiempo."),
        espacio(),

        titulo2("2.4  Parseo Automático de PDF del Monitor Syai X1", C.morado),
        parrafo("Extracción automática de las métricas del reporte PDF sin transcripción manual."),
        bullet("El médico sube el PDF y el sistema extrae todas las métricas en segundos."),
        bullet("Revisión y corrección manual antes de confirmar el guardado."),
        bullet("Reduce el tiempo de carga de un análisis de 5–10 minutos a menos de 30 segundos."),
        bullet("PDF original archivado y vinculado al expediente del paciente."),
        espacio(),

        titulo2("2.5  Curvas de Crecimiento OMS", C.morado),
        parrafo("Seguimiento antropométrico con interpretación automática según estándares internacionales."),
        bullet("Peso, talla, IMC, perímetro cefálico y estadio de Tanner por fecha de evaluación."),
        bullet("Z-score y percentil calculados automáticamente para cada indicador."),
        bullet("Clasificación automática: talla baja, normal, talla alta; delgadez, sobrepeso, obesidad."),
        espacio(),

        titulo2("2.6  Historial de Insulinoterapia", C.morado),
        bullet("Registro de insulina prolongada y rápida con dosis por kg y dosis absoluta."),
        bullet("Cálculo automático de dosis total diaria."),
        bullet("Historial cronológico para correlacionar ajustes de dosis con evolución del MCG."),
        espacio(),

        titulo2("2.7  Mapa Epidemiológico Regional", C.morado),
        parrafo("Visualización geográfica de todos los pacientes de la red ALAD sobre el mapa de Latinoamérica."),
        bullet("Marcadores con color según clasificación: verde (Óptimo), naranja (Moderado), rojo (Alto Riesgo pulsante)."),
        bullet("Popup con nombre, institución, país, clasificación y enlace al expediente."),
        bullet("Herramienta clave para investigación epidemiológica regional."),
        espacio(),

        titulo2("2.8  Mensajería WhatsApp Automatizada", C.morado),
        bullet("Mensajes personalizados por clasificación ISPAD generados automáticamente."),
        bullet("Historial completo de mensajes enviados con fecha y estado."),
        bullet("Extiende el alcance médico más allá de la consulta presencial."),
        espacio(),

        titulo2("2.9  Gestión de Usuarios, Permisos y Auditoría", C.morado),
        bullet("Roles diferenciados: Administrador ALAD, Administrador por país, Médico, Enfermería."),
        bullet("Control granular de permisos por módulo y por institución."),
        bullet("Autenticación JWT con contraseñas cifradas con bcrypt."),
        bullet("Bitácora completa de auditoría: quién hizo qué y cuándo en todos los registros."),

        // ═══════════════════════════════════════════════════════════════
        //  3. MODALIDAD A — ALQUILER CON MANTENIMIENTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("3. Modalidad A — Alquiler con Mantenimiento (SaaS)"),
        separador(),

        titulo2("3.1  ¿Qué es el modelo SaaS?", C.teal),
        parrafo(
          "El modelo Software as a Service (SaaS) consiste en pagar una suscripción mensual o anual por el uso del sistema. ALAD o las instituciones afiliadas no necesitan servidores propios, ni equipo de TI, ni gestionar copias de seguridad. Todo está alojado en la nube, disponible las 24 horas del día desde cualquier país con conexión a internet."
        ),
        espacio(),

        titulo2("3.2  ¿Qué incluye el alquiler mensual?", C.teal),
        parrafo("El precio de alquiler cubre todo lo siguiente sin costos adicionales:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Componente incluido",                C.teal),
                celdaEncabezado("Detalle",                             C.teal),
              ],
            }),
            new TableRow({ children: [
              celda("Alojamiento en la nube",      C.grisClaro, true),
              celda("Servidores seguros con alta disponibilidad (99.9% uptime)", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Copias de seguridad",          C.tealClaro, true),
              celda("Backup automático diario de base de datos y archivos PDF", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Actualizaciones del sistema",  C.grisClaro, true),
              celda("Nuevas funcionalidades y mejoras incluidas sin costo adicional", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Parches de seguridad",         C.tealClaro, true),
              celda("Aplicación inmediata de correcciones de seguridad y vulnerabilidades", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Certificado SSL/HTTPS",        C.grisClaro, true),
              celda("Toda la comunicación cifrada en tránsito", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Soporte técnico",              C.tealClaro, true),
              celda("Canal dedicado con tiempos de respuesta garantizados según plan", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Monitoreo de infraestructura", C.grisClaro, true),
              celda("Supervisión continua de disponibilidad y rendimiento", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Capacitación inicial",         C.tealClaro, true),
              celda("Sesiones de onboarding para nuevas instituciones afiliadas", C.blanco),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("3.3  Planes de Alquiler para ALAD", C.teal),
        parrafo("Se ofrecen tres niveles de suscripción según el alcance regional de la implementación:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("",                              C.teal),
                celdaEncabezado("Plan Regional Básico",          "0F766E"),
                celdaEncabezado("Plan Regional Estándar",        C.teal),
                celdaEncabezado("Plan Regional Completo",        C.indigo),
              ],
            }),
            new TableRow({ children: [
              celda("Precio mensual (USD)",    C.grisClaro, true),
              celda("$1,500 – $2,000",         C.tealClaro, true, "0F766E", true),
              celda("$2,500 – $3,500",         C.tealClaro, true, C.teal,   true),
              celda("$5,000 – $7,000",         C.indigoClaro, true, C.indigo, true),
            ]}),
            new TableRow({ children: [
              celda("Precio anual (USD)  ·  2 meses de descuento", C.grisClaro, true),
              celda("$15,000 – $20,000",      C.blanco, false, "0F766E", true),
              celda("$25,000 – $35,000",      C.blanco, false, C.teal,   true),
              celda("$50,000 – $70,000",      C.blanco, false, C.indigo, true),
            ]}),
            new TableRow({ children: [
              celda("Países afiliados",        C.grisClaro, true),
              celda("1 – 3",                  C.blanco, false, C.negro, true),
              celda("4 – 10",                 C.blanco, false, C.negro, true),
              celda("Hasta 20 (toda ALAD)",   C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Instituciones",           C.grisClaro, true),
              celda("Hasta 10",               C.blanco, false, C.negro, true),
              celda("Hasta 40",               C.blanco, false, C.negro, true),
              celda("Ilimitadas",             C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Usuarios médicos",        C.grisClaro, true),
              celda("Hasta 30",               C.blanco, false, C.negro, true),
              celda("Hasta 150",              C.blanco, false, C.negro, true),
              celda("Ilimitados",             C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Almacenamiento PDF",      C.grisClaro, true),
              celda("50 GB",                  C.blanco, false, C.negro, true),
              celda("200 GB",                 C.blanco, false, C.negro, true),
              celda("Ilimitado",              C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Dashboard regional",      C.grisClaro, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Mapa epidemiológico",     C.grisClaro, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Mensajería WhatsApp",     C.grisClaro, true),
              celda("—",  C.blanco, false, C.gris, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Informes epidemiológicos PDF", C.grisClaro, true),
              celda("—",              C.blanco, false, C.gris, true),
              celda("Trimestrales",   C.blanco, false, C.negro, true),
              celda("Mensuales",      C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Soporte técnico",         C.grisClaro, true),
              celda("Correo / 48 h",          C.blanco, false, C.negro, true),
              celda("WhatsApp / 24 h",        C.blanco, false, C.negro, true),
              celda("Dedicado / 4 h",         C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Capacitación inicial",    C.grisClaro, true),
              celda("2 sesiones virtuales",   C.blanco, false, C.negro, true),
              celda("4 sesiones virtuales",   C.blanco, false, C.negro, true),
              celda("Presencial en sede ALAD + virtuales", C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("SLA (tiempo máx. de resolución)", C.grisClaro, true),
              celda("72 h",   C.blanco, false, C.negro, true),
              celda("24 h",   C.blanco, false, C.negro, true),
              celda("4 h",    C.blanco, false, C.negro, true),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("3.4  Ventajas del Modelo de Alquiler para ALAD", C.teal),
        bullet("Cero inversión en infraestructura: ALAD y sus instituciones afiliadas no necesitan servidores ni equipo de TI dedicado."),
        bullet("Escalabilidad inmediata: nuevos países e instituciones se agregan en horas, sin costos de reconfiguración."),
        bullet("Actualizaciones automáticas: cuando se lance el soporte para nuevos modelos de MCG, todas las instituciones reciben la mejora al mismo tiempo."),
        bullet("Presupuesto predecible: cuota fija mensual o anual, sin sorpresas de mantenimiento o reparaciones."),
        bullet("Aprobación presupuestaria simplificada: califica como gasto operativo, no de capital, facilitando su aprobación en organismos públicos y asociaciones."),
        bullet("Continuidad del servicio: si ALAD decide no renovar, los datos exportados quedan en su poder (sin lock-in)."),
        espacio(),
        parrafo("Recomendación: El Plan Regional Estándar es el punto de partida ideal para ALAD en una fase piloto que abarque 4–10 países, con la opción de escalar al Plan Regional Completo una vez demostrado el valor clínico en la red.", { color: C.teal, bold: true }),

        // ═══════════════════════════════════════════════════════════════
        //  4. MODALIDAD B — VENTA CON MANTENIMIENTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("4. Modalidad B — Venta con Mantenimiento (Licencia Perpetua)"),
        separador(),

        titulo2("4.1  ¿Qué es la licencia perpetua con mantenimiento?", C.azul),
        parrafo(
          "En este modelo, ALAD adquiere una licencia de uso perpetuo del software mediante un pago único. A partir de la entrega, ALAD es propietaria del derecho de uso y puede operar el sistema indefinidamente. El contrato de mantenimiento anual (obligatorio durante los primeros 3 años, optativo a partir del año 4) garantiza actualizaciones, parches de seguridad y soporte técnico continuo."
        ),
        espacio(),
        parrafo(
          "Esta modalidad es la preferida cuando el proyecto cuenta con financiamiento único de organismos internacionales (OPS/OMS, BID, USAID, fundaciones privadas) que aprueban un desembolso de capital, pero no pueden comprometerse a pagos mensuales recurrentes."
        ),
        espacio(),

        titulo2("4.2  Estructura de la Venta con Mantenimiento", C.azul),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Concepto",              C.azul),
                celdaEncabezado("Descripción",           C.azul),
                celdaEncabezado("Precio (USD)",          C.azul),
              ],
            }),
            new TableRow({ children: [
              celda("Licencia Regional Básica",  C.grisClaro, true),
              celda("Hasta 3 países · hasta 10 instituciones · 30 usuarios", C.blanco),
              celda("$18,000 – $25,000",         C.azulClaro, true, C.azul, true),
            ]}),
            new TableRow({ children: [
              celda("Licencia Regional Estándar", C.grisClaro, true),
              celda("Hasta 10 países · hasta 40 instituciones · 150 usuarios", C.blanco),
              celda("$35,000 – $50,000",          C.azulClaro, true, C.azul, true),
            ]}),
            new TableRow({ children: [
              celda("Licencia Latinoamérica Completa", C.grisClaro, true),
              celda("Hasta 20 países · instituciones y usuarios ilimitados", C.blanco),
              celda("$65,000 – $90,000",              C.azulClaro, true, C.azul, true),
            ]}),
            new TableRow({ children: [
              celda("Implementación y despliegue", C.grisClaro, true),
              celda("Configuración de servidores, dominio, DNS, SSL, variables de entorno", C.blanco),
              celda("Incluido en todos los planes",   C.blanco, false, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Capacitación presencial inicial", C.grisClaro, true),
              celda("1 sesión presencial en sede ALAD + capacitadores por país", C.blanco),
              celda("Incluida en planes Estándar y Completo", C.blanco, false, C.verde, true),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("4.3  Contrato de Mantenimiento Anual", C.azul),
        parrafo("El contrato de mantenimiento anual es el componente que garantiza la vida útil del sistema más allá de la entrega inicial. Su estructura es:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Período",                       C.azul),
                celdaEncabezado("Condición",                     C.azul),
                celdaEncabezado("Costo anual del mantenimiento", C.azul),
              ],
            }),
            new TableRow({ children: [
              celda("Año 1 – 3",         C.azulClaro, true),
              celda("Obligatorio — incluido en el contrato de compra", C.blanco),
              celda("18% – 20% del valor de la licencia adquirida", C.blanco, true, C.azul, true),
            ]}),
            new TableRow({ children: [
              celda("Año 4 en adelante", C.grisClaro, true),
              celda("Optativo — renovación anual o bienal a decisión de ALAD", C.blanco),
              celda("15% – 18% del valor original de la licencia",              C.blanco, true, C.azul, true),
            ]}),
          ],
        }),

        espacio(),
        parrafo("Ejemplo para Licencia Latinoamérica Completa a $75,000 USD:", { bold: true }),
        bullet("Licencia única: $75,000 USD"),
        bullet("Mantenimiento año 1: $13,500 USD (18%)"),
        bullet("Mantenimiento año 2: $13,500 USD (18%)"),
        bullet("Mantenimiento año 3: $13,500 USD (18%)"),
        bullet("Total en 3 años: $115,500 USD"),
        bullet("A partir del año 4: $11,250 – $13,500 USD / año (opcional)"),
        espacio(),

        titulo2("4.4  ¿Qué incluye el Mantenimiento Anual?", C.azul),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Servicio cubierto",                    C.azul),
                celdaEncabezado("Años 1 – 3 (Obligatorio)",             C.verde),
                celdaEncabezado("Año 4+ (Optativo)",                    C.gris),
              ],
            }),
            new TableRow({ children: [
              celda("Actualizaciones de funcionalidades",    C.grisClaro, true),
              celda("✔ Incluidas",   C.verdeClaro, true, C.verde, true),
              celda("✔ Incluidas",   C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Parches de seguridad",                 C.grisClaro, true),
              celda("✔ Incluidos",   C.verdeClaro, true, C.verde, true),
              celda("✔ Incluidos",   C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Corrección de errores (bugs)",         C.grisClaro, true),
              celda("✔ Incluida",    C.verdeClaro, true, C.verde, true),
              celda("✔ Incluida",    C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Soporte técnico (WhatsApp / correo)",  C.grisClaro, true),
              celda("✔ 24 h",        C.verdeClaro, true, C.verde, true),
              celda("✔ 48 h",        C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Compatibilidad con nuevos monitores MCG", C.grisClaro, true),
              celda("✔ Incluida",    C.verdeClaro, true, C.verde, true),
              celda("✔ Incluida",    C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Documentación técnica actualizada",    C.grisClaro, true),
              celda("✔ Incluida",    C.verdeClaro, true, C.verde, true),
              celda("✔ Incluida",    C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Informes de rendimiento y auditoría",  C.grisClaro, true),
              celda("Trimestral",    C.verdeClaro, false, C.negro, true),
              celda("Semestral",     C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Capacitación de nuevos usuarios",      C.grisClaro, true),
              celda("2 sesiones/año",  C.verdeClaro, false, C.negro, true),
              celda("1 sesión/año",    C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Almacenamiento en la nube",            C.grisClaro, true),
              celda("Alojamiento administrado por Evolución Metabólica", C.verdeClaro),
              celda("Opcional: servidores propios de ALAD", C.blanco),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("4.5  Opciones de Alojamiento en la Modalidad de Venta", C.azul),
        parrafo("A diferencia del modelo SaaS, en la venta de licencia ALAD tiene dos opciones de alojamiento:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Opción",                     C.azul),
                celdaEncabezado("Descripción",                C.azul),
                celdaEncabezado("Costo adicional",            C.azul),
              ],
            }),
            new TableRow({ children: [
              celda("Hosting gestionado por nosotros",        C.grisClaro, true),
              celda("ALAD no necesita infraestructura. Nosotros administramos los servidores en la nube.", C.blanco),
              celda("$300 – $600 USD / mes según volumen de datos", C.blanco, false, C.azul, true),
            ]}),
            new TableRow({ children: [
              celda("Instalación en servidores propios de ALAD", C.grisClaro, true),
              celda("ALAD provee los servidores. Nosotros instalamos, configuramos y documentamos el sistema.", C.blanco),
              celda("Costo de instalación: $2,000 – $3,500 (pago único)", C.blanco, false, C.azul, true),
            ]}),
          ],
        }),

        espacio(),
        parrafo("Nota: si ALAD tiene financiamiento de un organismo que exige alojamiento en servidores propios (soberanía de datos), la segunda opción es la indicada. Para proyectos sin restricciones de este tipo, el hosting gestionado es más simple y económico.", { color: C.gris, italic: true }),

        // ═══════════════════════════════════════════════════════════════
        //  5. COMPARATIVA ENTRE MODALIDADES
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("5. Comparativa: Alquiler vs. Venta con Mantenimiento"),
        separador(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Factor",                                       C.morado),
                celdaEncabezado("Alquiler con Mantenimiento (SaaS)",             C.teal),
                celdaEncabezado("Venta con Mantenimiento (Licencia Perpetua)",   C.azul),
              ],
            }),
            new TableRow({ children: [
              celda("Inversión inicial",             C.grisClaro, true),
              celda("Nula — pago mensual o anual",   C.tealClaro, false, C.teal),
              celda("Alta — pago único de licencia", C.azulClaro, false, C.azul),
            ]}),
            new TableRow({ children: [
              celda("Costo total a 5 años (escala media)", C.grisClaro, true),
              celda("$150,000 – $210,000",                 C.blanco, false, C.negro, true),
              celda("$92,500 – $132,500 (licencia + mant.)", C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Actualizaciones del software",  C.grisClaro, true),
              celda("Automáticas, sin costo extra",  C.tealClaro, false, C.teal),
              celda("Cubiertas por el mantenimiento anual", C.azulClaro, false, C.azul),
            ]}),
            new TableRow({ children: [
              celda("Hosting / servidores",          C.grisClaro, true),
              celda("Incluido en el plan",           C.tealClaro, false, C.teal),
              celda("Gestionado por nosotros ($300–600/mes) o servidores propios", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Soporte técnico",               C.grisClaro, true),
              celda("Incluido según plan",           C.tealClaro, false, C.teal),
              celda("Incluido durante mantenimiento", C.azulClaro, false, C.azul),
            ]}),
            new TableRow({ children: [
              celda("Propiedad del software",        C.grisClaro, true),
              celda("No (derecho de uso mientras se paga)", C.blanco, false, C.rojo),
              celda("Sí — ALAD mantiene el derecho de uso perpetuo", C.azulClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Soberanía de datos",            C.grisClaro, true),
              celda("Datos en nube gestionada por proveedor", C.blanco, false, C.gris),
              celda("Control total: servidores propios disponibles", C.azulClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Aprobación presupuestaria",     C.grisClaro, true),
              celda("Gasto operativo — aprobación más rápida", C.tealClaro, false, C.teal),
              celda("Gasto de capital — requiere aprobación especial o financiamiento externo", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Flexibilidad de salida",        C.grisClaro, true),
              celda("Alta — se puede cancelar con 30 días de aviso", C.tealClaro, false, C.teal),
              celda("Baja — inversión no reversible, pero no se pierde la licencia", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Ideal para",                    C.grisClaro, true),
              celda("Programas operativos de salud, asociaciones con presupuesto anual recurrente", C.tealClaro),
              celda("Proyectos con financiamiento único (OPS, BID, fundaciones, cooperación internacional)", C.azulClaro),
            ]}),
          ],
        }),

        espacio(2),
        parrafo("Recomendación general: si ALAD gestiona el programa con presupuesto operativo anual, el Alquiler con Mantenimiento (Plan Regional Estándar o Completo) es la opción más ágil y económica en el corto plazo. Si el proyecto tiene financiamiento de una sola vez (donación, préstamo OPS/BID, fondo de cooperación), la Venta con Mantenimiento representa una inversión que se amortiza en 3–4 años y otorga independencia presupuestaria a largo plazo.", { color: C.morado, bold: true }),

        // ═══════════════════════════════════════════════════════════════
        //  6. FASES DE IMPLEMENTACIÓN
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("6. Fases de Implementación Regional"),
        separador(),
        parrafo("Independientemente de la modalidad elegida, la implementación sigue el siguiente esquema por fases para garantizar una adopción exitosa en la red ALAD:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                celdaEncabezado("Fase",             C.morado),
                celdaEncabezado("Actividades",      C.morado),
                celdaEncabezado("Duración",         C.morado),
                celdaEncabezado("Responsable",      C.morado),
              ],
            }),
            new TableRow({ children: [
              celda("1 · Piloto Nacional",      C.moradoClaro, true, C.morado),
              celda("Despliegue en 1 país piloto con 1–2 instituciones. Validación de flujo clínico, ajustes de parseo PDF y clasificación ISPAD.", C.blanco),
              celda("2 – 4 semanas",  C.blanco, false, C.negro, true),
              celda("Evolución Metabólica + equipo médico local", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("2 · Expansión Básica",     C.grisClaro, true, C.negro),
              celda("Incorporación de 2–3 países adicionales. Capacitación virtual por país. Configuración de sub-cuentas por institución.", C.blanco),
              celda("4 – 8 semanas",  C.blanco, false, C.negro, true),
              celda("Coordinadores nacionales ALAD + soporte técnico", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("3 · Despliegue Regional",  C.moradoClaro, true, C.morado),
              celda("Integración de todos los países participantes. Activación del dashboard regional y mapa epidemiológico multi-país. Capacitación presencial en sede ALAD.", C.blanco),
              celda("2 – 3 meses",   C.blanco, false, C.negro, true),
              celda("Equipo Evolución Metabólica + ALAD", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("4 · Operación y Mejora Continua", C.grisClaro, true, C.negro),
              celda("Soporte continuo, revisiones trimestrales, incorporación de nuevas instituciones y países. Generación de informes epidemiológicos regionales.", C.blanco),
              celda("Permanente",    C.blanco, false, C.negro, true),
              celda("Evolución Metabólica (bajo contrato de mantenimiento)", C.blanco),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  7. PROPUESTA DE PILOTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("7. Propuesta de Inicio: Piloto Gratuito de 30 Días"),
        separador(),
        parrafo("Para facilitar la evaluación del sistema antes de cualquier compromiso formal, se propone un período de prueba gratuito de 30 días equivalente al Plan Regional Estándar, sin costo ni datos de pago requeridos."),
        espacio(),
        titulo2("¿Qué incluye el piloto?", C.teal),
        bullet("Entorno de producción real en la nube, no un sandbox de demostración."),
        bullet("Hasta 5 instituciones afiliadas participantes (a elección de ALAD)."),
        bullet("Hasta 50 usuarios médicos en la red piloto."),
        bullet("2 sesiones virtuales de capacitación en español (60–90 min cada una)."),
        bullet("Acceso completo a todos los módulos: MCG, parseo PDF, crecimiento, insulinoterapia, mapa epidemiológico, dashboard regional."),
        bullet("Canal de soporte técnico por WhatsApp durante el período piloto."),
        bullet("Al finalizar: informe de adopción y métricas del piloto entregado a ALAD."),
        espacio(),
        parrafo("Al término del piloto, ALAD dispondrá de datos concretos de uso, una valoración interna del equipo médico y los elementos necesarios para tomar una decisión de adopción formal y elegir la modalidad más conveniente.", { color: C.teal }),

        // ═══════════════════════════════════════════════════════════════
        //  8. TÉRMINOS GENERALES
        // ═══════════════════════════════════════════════════════════════
        espacio(2),
        titulo1("8. Términos y Condiciones Generales"),
        separador(),
        bullet("Moneda: todos los precios están expresados en dólares estadounidenses (USD)."),
        bullet("Validez de la propuesta: 90 días a partir de la fecha de emisión (Abril 2026)."),
        bullet("Exportación de datos: en cualquier momento y bajo cualquier modalidad, ALAD puede solicitar la exportación completa de su base de datos en formato SQL y los archivos PDF asociados."),
        bullet("Confidencialidad: toda la información clínica de pacientes es de propiedad exclusiva de ALAD y sus instituciones afiliadas. Evolución Metabólica no comparte ni comercializa estos datos."),
        bullet("Modificaciones: los precios indicados son referenciales. El precio final se ajusta al número exacto de países, instituciones y usuarios confirmados en la negociación."),
        bullet("Pagos: para el modelo SaaS, cobro mensual o anual anticipado. Para la venta, 50% al firmar el contrato y 50% a la entrega del sistema en producción."),
        bullet("Jurisdicción: contrato regido por las partes de mutuo acuerdo según la legislación aplicable a ALAD como organización regional."),

        // ═══════════════════════════════════════════════════════════════
        //  9. CONTACTO
        // ═══════════════════════════════════════════════════════════════
        espacio(2),
        titulo1("9. Contacto y Siguiente Paso"),
        separador(),
        parrafo("Para agendar una demostración en vivo, solicitar el piloto gratuito de 30 días, o iniciar la negociación formal de cualquiera de las dos modalidades, por favor comunicarse con el equipo de Evolución Metabólica:"),
        espacio(),
        parrafo("Estamos disponibles para adaptar la propuesta a los requerimientos específicos de ALAD, los tiempos de aprobación presupuestaria y el alcance geográfico del programa.", { color: C.teal }),
        espacio(3),
        parrafo("─────────────────────────────────────────────────────────────", { center: true, color: C.gris }),
        parrafo("© 2026 Evolución Metabólica — Todos los derechos reservados", { center: true, color: C.gris, italic: true }),
        parrafo("Propuesta confidencial preparada exclusivamente para ALAD — Asociación Latinoamericana de Diabetes", { center: true, color: C.gris, italic: true }),

      ],
    },
  ],
});

// ── Guardar archivo ───────────────────────────────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Propuesta_ALAD_Evolucion_Metabolica.docx", buffer);
  console.log("✅  Archivo generado: Propuesta_ALAD_Evolucion_Metabolica.docx");
}).catch(err => {
  console.error("❌ Error:", err);
});
