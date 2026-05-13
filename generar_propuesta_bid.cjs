// ──────────────────────────────────────────────────────────────────────────────
//  Propuesta comercial para el Grupo BID — Evolución Metabólica
//  Modalidades: Alquiler con mantenimiento · Venta con mantenimiento
//  Ejecutar: node generar_propuesta_bid.cjs
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
  azulBID:      "003566",   // azul corporativo BID
  azulBIDmedio: "1D6FA4",
  azulBIDclaro: "E8F4FC",
  dorado:       "B8860B",
  doradoClaro:  "FFFDE7",
  verde:        "1B7A3E",
  verdeClaro:   "F0FDF4",
  gris:         "64748B",
  grisClaro:    "F8FAFC",
  rojo:         "DC2626",
  rojoClaro:    "FEF2F2",
  blanco:       "FFFFFF",
  negro:        "1E293B",
  celeste:      "0EA5E9",
  celesteClaro: "F0F9FF",
  morado:       "6366F1",
  moradoClaro:  "EEF2FF",
  naranjaOPS:   "E05C00",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function titulo1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: C.azulBID, font: "Calibri" })],
  });
}

function titulo2(text, color = C.azulBIDmedio) {
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
    border: { bottom: { color: C.azulBID, space: 1, value: BorderStyle.SINGLE, size: 6 } },
    children: [],
  });
}

function espacio(n = 1) {
  return new Paragraph({ children: [new TextRun({ text: " ".repeat(n) })] });
}

function celdaEncabezado(text, bgColor = C.azulBID) {
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
  title: "Propuesta de Financiamiento BID — Sistema Evolución Metabólica",
  description: "Propuesta de alquiler y venta con mantenimiento para el Grupo BID",
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
          children: [new TextRun({ text: "EVOLUCIÓN METABÓLICA", bold: true, size: 52, color: C.azulBID, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
          children: [new TextRun({ text: "Sistema Digital de Gestión Clínica para Diabetes con MCG", size: 28, color: C.gris, italics: true, font: "Calibri" })],
        }),
        separador(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: "PROPUESTA DE PROYECTO E INVERSIÓN", bold: true, size: 30, color: C.azulBIDmedio, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Presentada al:", size: 22, color: C.gris, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Grupo Banco Interamericano de Desarrollo (Grupo BID)", bold: true, size: 28, color: C.azulBID, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "División de Salud · Sector Social · América Latina y el Caribe", size: 22, color: C.gris, font: "Calibri" })],
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
        //  RESUMEN EJECUTIVO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("Resumen Ejecutivo"),
        separador(),
        parrafo(
          "La diabetes mellitus constituye una de las principales cargas de enfermedad crónica no transmisible en América Latina y el Caribe. Según estimaciones de la IDF (2023), la región alberga más de 33 millones de personas con diabetes, con tasas de control glucémico inadecuado superiores al 60% en la mayoría de los sistemas públicos de salud. En la población pediátrica, la fragmentación del seguimiento clínico, la falta de herramientas digitales y la escasa disponibilidad de tecnologías de monitoreo continuo amplían aún más la brecha."
        ),
        espacio(),
        parrafo(
          "Evolución Metabólica es una plataforma digital especializada que digitaliza, automatiza y estandariza el proceso clínico completo de seguimiento de pacientes pediátricos con diabetes que utilizan Monitoreo Continuo de Glucosa (MCG). El sistema ya se encuentra en producción con datos reales de pacientes en Honduras, lo que garantiza su madurez tecnológica y su adaptación al contexto latinoamericano."
        ),
        espacio(),
        parrafo(
          "La presente propuesta plantea al Grupo BID dos modalidades de implementación regional: (A) un modelo de suscripción mensual gestionado como gasto operativo recurrente de los programas de salud financiados por el BID, y (B) una licencia perpetua con mantenimiento, estructurada como inversión de capital dentro de operaciones de préstamo o donación. En ambos casos, el sistema puede escalarse progresivamente desde Honduras hacia los países priorizados en la cartera de salud del BID en América Central y el Caribe."
        ),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Indicador clave",      C.azulBID),
              celdaEncabezado("Valor / Descripción",  C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Países objetivo iniciales",       C.azulBIDclaro, true),
              celda("Honduras, Guatemala, El Salvador, Nicaragua, Costa Rica, Panamá, República Dominicana", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Población beneficiaria directa",  C.grisClaro, true),
              celda("Pacientes pediátricos con diabetes tipo 1 en hospitales públicos de referencia", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Alineación ODS",                  C.azulBIDclaro, true),
              celda("ODS 3 (Salud y bienestar) · ODS 9 (Innovación e infraestructura) · ODS 10 (Reducción de desigualdades)", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Costo estimado modalidad SaaS",   C.grisClaro, true),
              celda("$2,500 – $7,000 USD / mes según alcance regional", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Costo estimado licencia única",   C.azulBIDclaro, true),
              celda("$35,000 – $90,000 USD (según países e instituciones)", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Estado del sistema",              C.grisClaro, true),
              celda("En producción con datos reales — no es prototipo", C.blanco, true, C.verde),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  1. CONTEXTO Y PROBLEMA
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("1. Contexto y Problema que Resuelve"),
        separador(),

        titulo2("1.1  La Carga de la Diabetes Pediátrica en Centroamérica", C.azulBID),
        parrafo("La diabetes tipo 1 en niños y adolescentes es una enfermedad de alto costo, alta complejidad y bajo control en los sistemas públicos de salud de la región. Los principales desafíos estructurales son:"),
        bullet("Fragmentación del expediente clínico: datos en papel, sin historial unificado ni acceso remoto."),
        bullet("Ausencia de herramientas de análisis de MCG: las métricas del monitor se transcriben manualmente, consumiendo tiempo médico y generando errores."),
        bullet("Falta de estandarización clínica: sin clasificación ISPAD automática, el criterio de riesgo varía entre médicos."),
        bullet("Escasa capacidad epidemiológica: sin datos centralizados, los ministerios de salud no pueden medir el impacto de las intervenciones a escala poblacional."),
        bullet("Brecha tecnológica: los sistemas digitales de salud existentes en la región no están especializados en MCG ni en diabetes pediátrica."),
        espacio(),

        titulo2("1.2  Alineación con las Prioridades Estratégicas del BID", C.azulBID),
        parrafo("El proyecto Evolución Metabólica se alinea directamente con la estrategia del BID para el sector salud en América Latina y el Caribe:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Prioridad BID",                    C.azulBID),
              celdaEncabezado("Cómo Evolución Metabólica la atiende", C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Transformación digital en salud",           C.azulBIDclaro, true),
              celda("Digitaliza completamente el flujo clínico de MCG: registro, análisis, clasificación y seguimiento.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Fortalecimiento de sistemas de información", C.grisClaro, true),
              celda("Dashboard epidemiológico regional con datos en tiempo real accesibles para los ministerios de salud.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Equidad en el acceso a tecnología sanitaria", C.azulBIDclaro, true),
              celda("Lleva tecnología de análisis de MCG a hospitales públicos que no pueden costear soluciones privadas internacionales.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Atención centrada en el paciente",           C.grisClaro, true),
              celda("Mensajería WhatsApp personalizada, seguimiento de calidad de vida y comunicación remota con familias.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Reducción de costos en salud",               C.azulBIDclaro, true),
              celda("Mejor control glucémico = menos complicaciones (cetoacidosis, nefropatía, retinopatía) = menor costo hospitalario a largo plazo.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Evidencia para políticas públicas",           C.grisClaro, true),
              celda("Genera datos epidemiológicos regionales cuantificables para informar políticas de salud basadas en evidencia.", C.blanco),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  2. DESCRIPCIÓN DEL SISTEMA
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("2. Descripción del Sistema — Módulos y Capacidades"),
        separador(),
        parrafo("Evolución Metabólica es una plataforma web multi-institución y multi-país. A continuación se describen sus módulos principales:"),
        espacio(),

        titulo2("2.1  Dashboard Epidemiológico Regional", C.azulBIDmedio),
        bullet("Indicadores clave en tiempo real: total de pacientes, análisis realizados, TIR promedio, GMI promedio, CV promedio."),
        bullet("Distribución ISPAD por país e institución: porcentaje de pacientes en Óptimo, Moderado y Alto Riesgo."),
        bullet("Desagregación por género, grupo etario y región geográfica."),
        bullet("Vista comparativa entre países: herramienta de benchmarking epidemiológico regional."),
        espacio(),

        titulo2("2.2  Gestión de Pacientes Multi-País", C.azulBIDmedio),
        bullet("Expediente clínico digital con datos demográficos, clínicos y georeferenciación automática."),
        bullet("Historial completo de análisis MCG, consultas, crecimiento e insulinoterapia en una sola pantalla."),
        bullet("Control de acceso por institución: cada médico accede únicamente a sus pacientes."),
        espacio(),

        titulo2("2.3  Análisis MCG con Clasificación ISPAD Automática", C.azulBIDmedio),
        bullet("Registro completo: TIR, TAR total/alto/muy alto, TBR total/bajo/muy bajo, GMI, CV, GRI, tiempo activo del sensor."),
        bullet("Clasificación ISPAD calculada al instante: Óptimo, Moderado o Alto Riesgo."),
        bullet("Seguimiento de dosis de insulina post-análisis y HbA1c post-MCG."),
        bullet("Historial cronológico para evaluar evolución del paciente en el tiempo."),
        espacio(),

        titulo2("2.4  Parseo Automático de PDF del Monitor Syai X1", C.azulBIDmedio),
        bullet("El médico sube el PDF del monitor y el sistema extrae todas las métricas en menos de 30 segundos."),
        bullet("Elimina la transcripción manual y los errores asociados."),
        bullet("PDF original archivado y vinculado al expediente del paciente."),
        espacio(),

        titulo2("2.5  Curvas de Crecimiento OMS", C.azulBIDmedio),
        bullet("Z-score y percentil automáticos para peso, talla, IMC y perímetro cefálico."),
        bullet("Clasificación automática según estándares internacionales (talla baja, sobrepeso, obesidad, etc.)."),
        espacio(),

        titulo2("2.6  Mapa Epidemiológico Multi-País", C.azulBIDmedio),
        bullet("Visualización geográfica de todos los pacientes de la red BID con colores por clasificación ISPAD."),
        bullet("Marcadores de Alto Riesgo con animación pulsante para identificación inmediata."),
        bullet("Herramienta clave para investigación epidemiológica y decisiones de política pública."),
        espacio(),

        titulo2("2.7  Mensajería WhatsApp Automatizada", C.azulBIDmedio),
        bullet("Comunicación personalizada con pacientes según clasificación clínica."),
        bullet("Historial completo de mensajes enviados con fecha, estado y usuario responsable."),
        espacio(),

        titulo2("2.8  Gestión de Usuarios, Permisos y Auditoría", C.azulBIDmedio),
        bullet("Roles diferenciados: Administrador BID / nacional, Médico, Enfermería."),
        bullet("Autenticación JWT con contraseñas cifradas (bcrypt). Cumple estándares de seguridad de datos médicos."),
        bullet("Bitácora completa de auditoría para trazabilidad y cumplimiento normativo."),

        // ═══════════════════════════════════════════════════════════════
        //  3. MODALIDAD A — ALQUILER CON MANTENIMIENTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("3. Modalidad A — Alquiler con Mantenimiento (SaaS)"),
        separador(),

        titulo2("3.1  Descripción del Modelo", C.azulBIDmedio),
        parrafo(
          "El modelo SaaS (Software as a Service) implica un pago mensual o anual por el uso del sistema. El BID puede incorporar este costo dentro de los gastos operativos de un préstamo o donación de cooperación técnica, sin necesidad de compra de activos fijos ni gestión de infraestructura tecnológica por parte de las contrapartes nacionales."
        ),
        espacio(),
        parrafo(
          "Este modelo es el más recomendado para proyectos de cooperación técnica, programas de mejora de sistemas de salud o préstamos de reforma sectorial donde los fondos se desembolsan en tramos anuales. La cuota cubre alojamiento en la nube, copias de seguridad diarias, actualizaciones automáticas del software, parches de seguridad, soporte técnico y capacitación continua."
        ),
        espacio(),

        titulo2("3.2  Planes de Alquiler para la Región BID", C.azulBIDmedio),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("",                              C.azulBID),
              celdaEncabezado("Plan Piloto Regional",          "1A5E8C"),
              celdaEncabezado("Plan Centroamérica",            C.azulBIDmedio),
              celdaEncabezado("Plan Latinoamérica",            "003566"),
            ]}),
            new TableRow({ children: [
              celda("Precio mensual (USD)",          C.grisClaro, true),
              celda("$1,800 – $2,500",               C.azulBIDclaro, true, "1A5E8C", true),
              celda("$3,000 – $4,500",               C.azulBIDclaro, true, C.azulBIDmedio, true),
              celda("$6,000 – $9,000",               C.azulBIDclaro, true, C.azulBID, true),
            ]}),
            new TableRow({ children: [
              celda("Precio anual (USD)  ·  2 meses de descuento", C.grisClaro, true),
              celda("$18,000 – $25,000",             C.blanco, false, "1A5E8C", true),
              celda("$30,000 – $45,000",             C.blanco, false, C.azulBIDmedio, true),
              celda("$60,000 – $90,000",             C.blanco, false, C.azulBID, true),
            ]}),
            new TableRow({ children: [
              celda("Países incluidos",               C.grisClaro, true),
              celda("1 – 2",                         C.blanco, false, C.negro, true),
              celda("3 – 7 (CA + RD)",               C.blanco, false, C.negro, true),
              celda("Hasta 20 países ALC",           C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Instituciones",                  C.grisClaro, true),
              celda("Hasta 8",                       C.blanco, false, C.negro, true),
              celda("Hasta 35",                      C.blanco, false, C.negro, true),
              celda("Ilimitadas",                    C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Usuarios médicos",               C.grisClaro, true),
              celda("Hasta 40",                      C.blanco, false, C.negro, true),
              celda("Hasta 200",                     C.blanco, false, C.negro, true),
              celda("Ilimitados",                    C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Almacenamiento PDF",             C.grisClaro, true),
              celda("75 GB",                         C.blanco, false, C.negro, true),
              celda("300 GB",                        C.blanco, false, C.negro, true),
              celda("Ilimitado",                     C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Dashboard regional multi-país",  C.grisClaro, true),
              celda("✔",   C.blanco, true, C.verde, true),
              celda("✔",   C.blanco, true, C.verde, true),
              celda("✔",   C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Mapa epidemiológico",             C.grisClaro, true),
              celda("✔",   C.blanco, true, C.verde, true),
              celda("✔",   C.blanco, true, C.verde, true),
              celda("✔",   C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Mensajería WhatsApp",             C.grisClaro, true),
              celda("—",   C.blanco, false, C.gris, true),
              celda("✔",   C.blanco, true, C.verde, true),
              celda("✔",   C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Informes epidemiológicos para el BID", C.grisClaro, true),
              celda("Semestrales",   C.blanco, false, C.negro, true),
              celda("Trimestrales",  C.blanco, false, C.negro, true),
              celda("Mensuales",     C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("API de integración con sistemas nacionales", C.grisClaro, true),
              celda("—",             C.blanco, false, C.gris, true),
              celda("Consulta",      C.blanco, false, C.negro, true),
              celda("Completa",      C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Soporte técnico",                 C.grisClaro, true),
              celda("Correo / 48 h", C.blanco, false, C.negro, true),
              celda("WhatsApp / 24 h",                C.blanco, false, C.negro, true),
              celda("Dedicado / 4 h",                 C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Capacitación",                   C.grisClaro, true),
              celda("2 sesiones virtuales",           C.blanco, false, C.negro, true),
              celda("1 presencial + virtuales",       C.blanco, false, C.negro, true),
              celda("2 presenciales + virtuales",     C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("SLA máximo de resolución",       C.grisClaro, true),
              celda("48 h",   C.blanco, false, C.negro, true),
              celda("24 h",   C.blanco, false, C.negro, true),
              celda("4 h",    C.blanco, false, C.negro, true),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("3.3  Ventajas del Modelo SaaS para Operaciones BID", C.azulBIDmedio),
        bullet("Compatible con gastos operativos de préstamos: no requiere categoría de inversión de capital ni licitación de activos."),
        bullet("Escalabilidad progresiva: el proyecto puede iniciar con 1–2 países piloto y ampliar sin contratos nuevos."),
        bullet("Sin dependencia de infraestructura nacional: los ministerios de salud no necesitan servidores propios, ni TI dedicada."),
        bullet("Actualizaciones automáticas: todas las mejoras del sistema llegan a todos los países simultáneamente."),
        bullet("Presupuesto predecible: cuota fija anual facilita la proyección de costos en el POA del proyecto BID."),
        bullet("Exportación total de datos garantizada: al cierre del proyecto, los países reciben sus datos en formato abierto."),
        bullet("Cumplimiento de estándares de seguridad: JWT, bcrypt, HTTPS, backups diarios — alineado con políticas de datos del BID."),

        // ═══════════════════════════════════════════════════════════════
        //  4. MODALIDAD B — VENTA CON MANTENIMIENTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("4. Modalidad B — Venta con Mantenimiento (Licencia Perpetua)"),
        separador(),

        titulo2("4.1  Descripción del Modelo", C.azulBIDmedio),
        parrafo(
          "En la modalidad de venta, el Grupo BID (o el Ministerio de Salud de cada país beneficiario) adquiere una licencia de uso perpetuo del sistema mediante un pago único de capital. Esta estructura es típica de operaciones de préstamo soberano o donaciones de capital donde el financiador exige que el activo quede en propiedad del beneficiario al final del proyecto."
        ),
        espacio(),
        parrafo(
          "El contrato de mantenimiento anual garantiza que el sistema permanezca actualizado, seguro y funcional. Es obligatorio durante los primeros 3 años (período de proyecto) y optativo a partir del año 4, lo que permite al país decidir si continúa con soporte externo o transfiere la gestión a su propio equipo de TI."
        ),
        espacio(),

        titulo2("4.2  Estructura de Precios — Licencia Perpetua", C.azulBIDmedio),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Alcance de la Licencia",          C.azulBID),
              celdaEncabezado("Precio de la Licencia (USD)",     C.azulBID),
              celdaEncabezado("Implementación incluida",         C.azulBID),
              celdaEncabezado("Capacitación incluida",           C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("1 país · hasta 8 instituciones · 40 usuarios",          C.grisClaro, true),
              celda("$20,000 – $30,000",     C.azulBIDclaro, true, C.azulBID, true),
              celda("✔ Instalación completa", C.blanco, false, C.verde),
              celda("2 sesiones virtuales",   C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Hasta 4 países · hasta 35 instituciones · 200 usuarios", C.grisClaro, true),
              celda("$45,000 – $65,000",     C.azulBIDclaro, true, C.azulBID, true),
              celda("✔ Instalación completa", C.blanco, false, C.verde),
              celda("1 presencial + 4 virtuales", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Hasta 10 países · hasta 100 instituciones · ilimitados", C.grisClaro, true),
              celda("$80,000 – $120,000",    C.azulBIDclaro, true, C.azulBID, true),
              celda("✔ Instalación completa", C.blanco, false, C.verde),
              celda("2 presenciales + virtuales por país", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Latinoamérica completa · usuarios e instituciones ilimitados", C.grisClaro, true),
              celda("$150,000 – $200,000",   C.azulBIDclaro, true, C.azulBID, true),
              celda("✔ Instalación completa", C.blanco, false, C.verde),
              celda("Equipo dedicado de implementación regional", C.blanco),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("4.3  Mantenimiento Anual Post-Venta", C.azulBIDmedio),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Período",                         C.azulBID),
              celdaEncabezado("Condición",                       C.azulBID),
              celdaEncabezado("Costo anual",                     C.azulBID),
              celdaEncabezado("Cobertura",                       C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Año 1 – 3",           C.azulBIDclaro, true),
              celda("Obligatorio — incluido en el contrato inicial", C.blanco),
              celda("18% del valor de la licencia", C.blanco, true, C.azulBID, true),
              celda("Actualizaciones + parches + soporte 24 h + 2 capacitaciones/año", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Año 4 en adelante",   C.grisClaro, true),
              celda("Optativo — renovación anual a decisión del BID o el país", C.blanco),
              celda("15% del valor original", C.blanco, true, C.azulBIDmedio, true),
              celda("Actualizaciones + parches + soporte 48 h + 1 capacitación/año", C.blanco),
            ]}),
          ],
        }),

        espacio(),
        parrafo("Ejemplo para licencia de 4 países a $55,000 USD:", { bold: true }),
        bullet("Licencia perpetua: $55,000 USD"),
        bullet("Mantenimiento año 1 (18%): $9,900 USD"),
        bullet("Mantenimiento año 2 (18%): $9,900 USD"),
        bullet("Mantenimiento año 3 (18%): $9,900 USD"),
        bullet("Total inversión en 3 años: $84,700 USD"),
        bullet("A partir del año 4 (optativo): $8,250 USD / año"),
        espacio(),

        titulo2("4.4  Opciones de Alojamiento en la Modalidad de Venta", C.azulBIDmedio),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Opción de alojamiento",        C.azulBID),
              celdaEncabezado("Descripción",                  C.azulBID),
              celdaEncabezado("Costo adicional",              C.azulBID),
              celdaEncabezado("Recomendado para",             C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Hosting gestionado por Evolución Metabólica", C.grisClaro, true),
              celda("Servidores en la nube administrados por nosotros. Sin carga operativa para el país.", C.blanco),
              celda("$400 – $800 USD / mes",    C.blanco, false, C.azulBID, true),
              celda("Países sin infraestructura de nube propia. Mayoría de casos.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Instalación en servidores del Ministerio de Salud", C.grisClaro, true),
              celda("El ministerio provee servidores. Nosotros instalamos, documentamos y transferimos el conocimiento.", C.blanco),
              celda("$3,000 – $5,000 USD pago único de instalación", C.blanco, false, C.azulBID, true),
              celda("Proyectos con requisito de soberanía de datos nacionales.", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Nube soberana regional (BID Cloud / AWS GovCloud)", C.grisClaro, true),
              celda("Alojamiento en infraestructura de nube aprobada por el BID para proyectos regionales.", C.blanco),
              celda("A cotizar según proveedor BID preferido",  C.blanco, false, C.azulBID, true),
              celda("Proyectos multi-país con requisitos de cumplimiento normativo internacional.", C.blanco),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  5. COMPARATIVA ENTRE MODALIDADES
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("5. Comparativa: Alquiler vs. Venta con Mantenimiento"),
        separador(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Factor",                                          C.azulBID),
              celdaEncabezado("Alquiler con Mantenimiento (SaaS)",               C.azulBIDmedio),
              celdaEncabezado("Venta con Mantenimiento (Licencia Perpetua)",      "1A5E8C"),
            ]}),
            new TableRow({ children: [
              celda("Inversión inicial",                      C.grisClaro, true),
              celda("Nula — pago mensual o anual",            C.celesteClaro, false, C.celeste),
              celda("Alta — pago único de licencia",          C.azulBIDclaro, false, C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Clasificación presupuestaria BID",       C.grisClaro, true),
              celda("Gasto operativo — desembolso en tramos anuales", C.celesteClaro, false, C.verde),
              celda("Gasto de capital — desembolso único o en pocos tramos", C.azulBIDclaro, false, C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Propiedad del software al cierre del proyecto", C.grisClaro, true),
              celda("No — derecho de uso vigente mientras se paga", C.blanco, false, C.rojo),
              celda("Sí — el país/BID tiene la licencia perpetua", C.blanco, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Actualizaciones del software",           C.grisClaro, true),
              celda("Automáticas, sin costo adicional",       C.celesteClaro, false, C.verde),
              celda("Cubiertas por mantenimiento anual",      C.azulBIDclaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Soberanía de datos",                     C.grisClaro, true),
              celda("Datos en nube gestionada externamente",  C.blanco, false, C.gris),
              celda("Control total: servidores propios disponibles", C.blanco, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Costo total estimado a 5 años (escala media)", C.grisClaro, true),
              celda("$150,000 – $270,000",                    C.blanco, false, C.negro, true),
              celda("$105,000 – $165,000 (licencia + mant.)", C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Proceso de licitación / adquisición BID", C.grisClaro, true),
              celda("Servicios recurrentes — proceso más ágil", C.celesteClaro, false, C.verde),
              celda("Adquisición de licencia de software — puede requerir proceso formal", C.blanco, false, C.gris),
            ]}),
            new TableRow({ children: [
              celda("Escalabilidad",                          C.grisClaro, true),
              celda("Alta: nuevos países en días sin nuevo contrato", C.celesteClaro, false, C.verde),
              celda("Media: requiere modificación del contrato inicial", C.blanco, false, C.gris),
            ]}),
            new TableRow({ children: [
              celda("Recomendado para tipo de operación BID", C.grisClaro, true),
              celda("Cooperación técnica, préstamos de reforma sectorial, programas piloto", C.celesteClaro),
              celda("Préstamos soberanos, donaciones de capital, programas de infraestructura digital", C.azulBIDclaro),
            ]}),
          ],
        }),

        espacio(2),
        parrafo(
          "Recomendación para el Grupo BID: para una primera fase piloto regional (1–3 países), el modelo SaaS (Plan Piloto Regional) es el más ágil y de menor riesgo financiero. Una vez validado el impacto clínico y epidemiológico, la escala regional completa puede estructurarse bajo la modalidad de Venta con Mantenimiento dentro de un préstamo soberano, maximizando el valor de la inversión a largo plazo.",
          { color: C.azulBID, bold: true }
        ),

        // ═══════════════════════════════════════════════════════════════
        //  6. PLAN DE IMPLEMENTACIÓN
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("6. Plan de Implementación Regional"),
        separador(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Fase",                    C.azulBID),
              celdaEncabezado("Actividades principales", C.azulBID),
              celdaEncabezado("Duración",                C.azulBID),
              celdaEncabezado("Países involucrados",     C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("Fase 0 · Preparación",        C.azulBIDclaro, true, C.azulBID),
              celda("Firma de acuerdo BID-Evolución Metabólica. Definición de países piloto. Configuración de entornos. Sesión de kick-off.", C.blanco),
              celda("2 – 4 semanas",  C.blanco, false, C.negro, true),
              celda("BID + Honduras (país base)", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Fase 1 · Piloto",             C.grisClaro, true, C.negro),
              celda("Despliegue en 1–2 hospitales piloto por país. Carga de primeros pacientes. Capacitación inicial. Ajustes de parseo PDF y flujo clínico.", C.blanco),
              celda("4 – 8 semanas",  C.blanco, false, C.negro, true),
              celda("1 – 2 países piloto", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Fase 2 · Expansión Nacional", C.azulBIDclaro, true, C.azulBID),
              celda("Incorporación de todas las instituciones del país piloto. Activación del dashboard nacional. Capacitación por hospital.", C.blanco),
              celda("2 – 3 meses",    C.blanco, false, C.negro, true),
              celda("Países piloto — expansión completa", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Fase 3 · Escala Regional",    C.grisClaro, true, C.negro),
              celda("Incorporación de nuevos países. Activación del dashboard multi-país. Mapa epidemiológico regional. Informe de impacto para el BID.", C.blanco),
              celda("3 – 6 meses",    C.blanco, false, C.negro, true),
              celda("Todos los países del programa", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Fase 4 · Operación y Evaluación", C.azulBIDclaro, true, C.azulBID),
              celda("Soporte continuo. Informes periódicos al BID con KPIs de impacto. Evaluación de medio término y final de proyecto. Transferencia tecnológica.", C.blanco),
              celda("Duración del proyecto", C.blanco, false, C.negro, true),
              celda("Toda la red BID", C.blanco),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  7. INDICADORES DE IMPACTO (KPIs)
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("7. Indicadores de Impacto y Seguimiento (KPIs)"),
        separador(),
        parrafo("El sistema genera automáticamente los datos necesarios para calcular los siguientes indicadores de impacto, compatibles con los marcos de resultados del BID:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Indicador",                           C.azulBID),
              celdaEncabezado("Descripción",                         C.azulBID),
              celdaEncabezado("Fuente de datos",                     C.azulBID),
              celdaEncabezado("Frecuencia de reporte",               C.azulBID),
            ]}),
            new TableRow({ children: [
              celda("% pacientes con TIR ≥ 70% (Óptimo ISPAD)", C.azulBIDclaro, true),
              celda("Porcentaje de pacientes con control glucémico óptimo según estándar internacional.", C.blanco),
              celda("Dashboard automático",   C.blanco, false, C.verde),
              celda("Mensual / Trimestral",   C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Tiempo promedio de carga de análisis MCG", C.grisClaro, true),
              celda("Tiempo medio desde subida del PDF hasta guardado del análisis. Mide eficiencia clínica.", C.blanco),
              celda("Bitácora del sistema",   C.blanco, false, C.verde),
              celda("Mensual",               C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Pacientes activos por institución",         C.azulBIDclaro, true),
              celda("Total de pacientes con al menos 1 análisis MCG en los últimos 6 meses.", C.blanco),
              celda("Dashboard automático",   C.blanco, false, C.verde),
              celda("Mensual",               C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Tasa de reducción de Alto Riesgo",         C.grisClaro, true),
              celda("% de pacientes que mejoran su clasificación ISPAD entre el primer y último análisis.", C.blanco),
              celda("Histórico de análisis",  C.blanco, false, C.verde),
              celda("Trimestral / Anual",     C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Cobertura institucional",                  C.azulBIDclaro, true),
              celda("Número de hospitales activos / total de hospitales objetivo del programa.", C.blanco),
              celda("Gestión de usuarios",    C.blanco, false, C.verde),
              celda("Trimestral",            C.blanco),
            ]}),
            new TableRow({ children: [
              celda("GMI promedio poblacional",                 C.grisClaro, true),
              celda("Indicador de Manejo de Glucosa promedio de todos los pacientes activos de la red.", C.blanco),
              celda("Dashboard automático",   C.blanco, false, C.verde),
              celda("Mensual",               C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Mensajes de seguimiento enviados",         C.azulBIDclaro, true),
              celda("Total de comunicaciones WhatsApp con pacientes. Mide alcance del seguimiento remoto.", C.blanco),
              celda("Bitácora de mensajería", C.blanco, false, C.verde),
              celda("Mensual",               C.blanco),
            ]}),
          ],
        }),

        espacio(2),
        parrafo("Todos los KPIs se exportan automáticamente en informes PDF y Excel generados por el sistema, listos para ser incorporados en los reportes de seguimiento y evaluación (M&E) de la operación BID.", { color: C.azulBIDmedio }),

        // ═══════════════════════════════════════════════════════════════
        //  8. PROPUESTA DE PILOTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("8. Propuesta de Inicio: Piloto Sin Costo — 60 Días"),
        separador(),
        parrafo(
          "Para facilitar la evaluación técnica y clínica del sistema antes de la estructuración formal de la operación BID, se propone un período de prueba de 60 días sin costo para el Grupo BID, equivalente al Plan Centroamérica, con acceso completo a todos los módulos."
        ),
        espacio(),
        titulo2("¿Qué incluye el piloto?", C.azulBIDmedio),
        bullet("Entorno de producción real en la nube — no un sandbox de demostración."),
        bullet("Hasta 3 países participantes con un total de hasta 15 instituciones."),
        bullet("Hasta 100 usuarios médicos en la red piloto."),
        bullet("3 sesiones virtuales de capacitación en español (90 min cada una)."),
        bullet("Acceso completo a todos los módulos: MCG, parseo PDF, crecimiento, mapa epidemiológico, dashboard regional, WhatsApp."),
        bullet("Canal de soporte técnico dedicado por WhatsApp durante el período."),
        bullet("Al finalizar: informe técnico de adopción con KPIs de uso, entregado al equipo BID para la estructuración de la operación."),
        espacio(),
        parrafo(
          "El piloto permite al equipo técnico del BID y a los equipos médicos nacionales evaluar con datos reales el valor del sistema, validar la integración con los flujos clínicos locales y construir el caso de negocio para la operación de escala.",
          { color: C.azulBIDmedio }
        ),

        // ═══════════════════════════════════════════════════════════════
        //  9. TÉRMINOS Y CONDICIONES
        // ═══════════════════════════════════════════════════════════════
        espacio(2),
        titulo1("9. Términos y Condiciones Generales"),
        separador(),
        bullet("Moneda: todos los precios están expresados en dólares estadounidenses (USD)."),
        bullet("Validez de la propuesta: 120 días a partir de la fecha de emisión (Abril 2026)."),
        bullet("Exportación de datos: en cualquier momento, el BID o los países beneficiarios pueden solicitar la exportación completa en formato SQL y archivos PDF asociados."),
        bullet("Confidencialidad: toda la información clínica de pacientes es propiedad exclusiva de las instituciones beneficiarias. Evolución Metabólica no comparte ni comercializa estos datos."),
        bullet("Modificaciones: los precios son referenciales. El precio final se define en función del número exacto de países, instituciones y usuarios confirmados en la negociación formal."),
        bullet("Esquema de pagos SaaS: facturación mensual o anual anticipada, con posibilidad de alineación al ciclo de desembolsos del proyecto BID."),
        bullet("Esquema de pagos Venta: 40% al firmar el contrato, 40% a la entrega en producción y 10% al finalizar la capacitación inicial."),
        bullet("Transferencia tecnológica: en la modalidad de venta, se incluye documentación técnica completa (arquitectura, API, base de datos, manual de operaciones) para la transferencia al equipo de TI del ministerio."),
        bullet("Código fuente: disponible bajo licencia de depósito en garantía (escrow) para garantizar la continuidad operativa ante cualquier eventualidad con el proveedor."),

        // ═══════════════════════════════════════════════════════════════
        //  10. CONTACTO
        // ═══════════════════════════════════════════════════════════════
        espacio(2),
        titulo1("10. Contacto y Siguiente Paso"),
        separador(),
        parrafo("Para agendar una demostración técnica ante el equipo del Grupo BID, solicitar el piloto de 60 días sin costo, o iniciar el proceso formal de negociación de cualquiera de las dos modalidades, por favor comunicarse con:"),
        espacio(),
        parrafo("El equipo de Evolución Metabólica está disponible para participar en las instancias técnicas del BID, adaptar la propuesta a los requisitos de adquisición de la institución y acompañar el proceso de due diligence tecnológica.", { color: C.azulBIDmedio }),
        espacio(3),
        parrafo("─────────────────────────────────────────────────────────────", { center: true, color: C.gris }),
        parrafo("© 2026 Evolución Metabólica — Todos los derechos reservados", { center: true, color: C.gris, italic: true }),
        parrafo("Propuesta confidencial preparada exclusivamente para el Grupo Banco Interamericano de Desarrollo (Grupo BID)", { center: true, color: C.gris, italic: true }),

      ],
    },
  ],
});

// ── Guardar archivo ───────────────────────────────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Propuesta_BID_Evolucion_Metabolica.docx", buffer);
  console.log("✅  Archivo generado: Propuesta_BID_Evolucion_Metabolica.docx");
}).catch(err => {
  console.error("❌ Error:", err);
});
