// ──────────────────────────────────────────────────────────────────────────────
//  Propuesta comercial para médico privado — Medical Center Honduras, Tegucigalpa
//  Modalidades: Alquiler con mantenimiento · Venta con mantenimiento
//  Ejecutar: node generar_propuesta_medico.cjs
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
  azul:        "1E40AF",
  azulClaro:   "EFF6FF",
  azulMedio:   "3B82F6",
  verde:       "15803D",
  verdeClaro:  "F0FDF4",
  gris:        "64748B",
  grisClaro:   "F8FAFC",
  negro:       "1E293B",
  blanco:      "FFFFFF",
  dorado:      "B45309",
  doradoClaro: "FFFBEB",
  rojo:        "DC2626",
  morado:      "7C3AED",
  moradoClaro: "F5F3FF",
  celeste:     "0284C7",
  celesteClaro:"F0F9FF",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function titulo1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: C.azul, font: "Calibri" })],
  });
}

function titulo2(text, color = C.azul) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color, font: "Calibri" })],
  });
}

function titulo3(text, color = C.negro) {
  return new Paragraph({
    spacing: { before: 180, after: 70 },
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
    spacing: { before: 55, after: 55 },
    children: [new TextRun({ text, size: 21, color: C.negro, bold, font: "Calibri" })],
  });
}

function separador() {
  return new Paragraph({
    spacing: { before: 180, after: 180 },
    border: { bottom: { color: C.azul, space: 1, value: BorderStyle.SINGLE, size: 6 } },
    children: [],
  });
}

function espacio(n = 1) {
  return new Paragraph({ children: [new TextRun({ text: " ".repeat(n) })] });
}

function celdaEncabezado(text, bgColor = C.azul) {
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

function cajaDestacada(texto, color = C.azulClaro, colorTexto = C.azul) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 360, right: 360 },
    shading: { type: ShadingType.CLEAR, fill: color },
    children: [new TextRun({ text: texto, size: 21, color: colorTexto, bold: true, font: "Calibri" })],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  DOCUMENTO
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Evolución Metabólica",
  title: "Propuesta Comercial — Médico Endocrinólogo — Medical Center Honduras",
  description: "Propuesta de alquiler y venta con mantenimiento para consulta privada",
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
            left:   convertInchesToTwip(1.25),
            right:  convertInchesToTwip(1.25),
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
          spacing: { before: 700, after: 180 },
          children: [new TextRun({ text: "EVOLUCIÓN METABÓLICA", bold: true, size: 52, color: C.azul, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
          children: [new TextRun({ text: "Sistema de Gestión Clínica para Diabetes con MCG", size: 28, color: C.gris, italics: true, font: "Calibri" })],
        }),
        separador(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: "PROPUESTA COMERCIAL PERSONALIZADA", bold: true, size: 28, color: C.celeste, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Dirigida a:", size: 22, color: C.gris, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: "Médico Especialista en Endocrinología", bold: true, size: 28, color: C.azul, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: "Medical Center Honduras · Tegucigalpa, Honduras", size: 24, color: C.gris, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "Modalidades: Alquiler con Mantenimiento  ·  Venta con Mantenimiento", size: 21, color: C.gris, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: "Abril 2026", size: 20, color: C.gris, italics: true, font: "Calibri" })],
        }),
        espacio(4),

        // ═══════════════════════════════════════════════════════════════
        //  CARTA PERSONAL
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("Estimado Dr. / Dra.:"),
        separador(),
        parrafo(
          "Le presento Evolución Metabólica, el sistema que sus colegas del Hospital Mario Catarino Rivas y del IHSS ya utilizan en producción para el seguimiento de sus pacientes con Monitoreo Continuo de Glucosa (MCG). Diseñado desde Honduras, para el contexto hondureño, el sistema elimina las tareas que más tiempo consumen en la consulta de endocrinología: la transcripción manual de los datos del monitor, la clasificación de riesgo y la búsqueda de historial en papel."
        ),
        espacio(),
        parrafo(
          "Esta propuesta está elaborada específicamente para su práctica en el Medical Center Honduras. Los precios, las funcionalidades y las condiciones de mantenimiento están pensados para una consulta privada de un solo médico o un equipo pequeño, sin los costos innecesarios de plataformas diseñadas para grandes hospitales."
        ),
        espacio(),
        parrafo(
          "La idea es simple: usted sube el PDF que genera el monitor Syai X1 del paciente, y en menos de 30 segundos el sistema extrae todas las métricas, clasifica el control glucémico según los criterios ISPAD y actualiza el expediente digital del paciente. Nada de transcripciones, nada de cálculos manuales, nada de papeles."
        ),
        espacio(),
        parrafo("Con mucho gusto.", { italic: true }),
        parrafo("Equipo Evolución Metabólica", { bold: true }),

        // ═══════════════════════════════════════════════════════════════
        //  1. ¿QUÉ PROBLEMA RESUELVE?
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("1. ¿Qué Problema Resuelve en Su Consulta?"),
        separador(),
        parrafo("Un médico endocrinólogo que trabaja con MCG enfrenta, en cada consulta del paciente con monitor, los siguientes problemas:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Problema actual",          C.rojo),
              celdaEncabezado("Con Evolución Metabólica", C.verde),
            ]}),
            new TableRow({ children: [
              celda("Transcribe a mano TIR, GMI, CV, TAR, TBR y más del PDF del monitor. 5–10 minutos por paciente.", C.moradoClaro),
              celda("El sistema extrae todos los datos del PDF automáticamente en menos de 30 segundos.", C.verdeClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Calcula manualmente si el paciente está en rango Óptimo, Moderado o Alto Riesgo según ISPAD.", C.moradoClaro),
              celda("La clasificación ISPAD se calcula sola al subir el PDF. Aparece como semáforo visual.", C.verdeClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("El historial de evolución del paciente está en hojas de cálculo, papeles o en su memoria.", C.moradoClaro),
              celda("El expediente digital centraliza todo: análisis MCG, crecimiento, insulinoterapia y consultas.", C.verdeClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("No puede ver fácilmente cómo evolucionó el TIR o el GMI del paciente entre el primer y el cuarto monitor.", C.moradoClaro),
              celda("Gráfica de evolución cronológica automática para cada paciente, visible en un clic.", C.verdeClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Para comunicarle algo al paciente entre consultas tiene que llamar o enviar mensajes manualmente.", C.moradoClaro),
              celda("Mensajería WhatsApp integrada: envía un mensaje personalizado según la clasificación clínica del paciente.", C.verdeClaro, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("No tiene un resumen estadístico de su cartera de pacientes: ¿cuántos están en riesgo? ¿cuál es el TIR promedio?", C.moradoClaro),
              celda("Dashboard con estadísticas de su consulta en tiempo real: TIR promedio, distribución ISPAD, evolución por género.", C.verdeClaro, false, C.verde),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  2. MÓDULOS INCLUIDOS
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("2. Todo lo que Incluye el Sistema"),
        separador(),

        titulo2("📋  Expediente Digital de Cada Paciente", C.azul),
        bullet("Nombre, fecha de nacimiento, DNI/expediente, género, tipo de diabetes, fecha de debut."),
        bullet("Peso, talla, IMC y tipo de insulina actualizable en cada consulta."),
        bullet("Historial completo accesible desde cualquier dispositivo con internet (computadora, tablet, celular)."),
        bullet("Búsqueda rápida por nombre o número de expediente."),
        espacio(),

        titulo2("📊  Análisis MCG con Parseo Automático de PDF", C.azul),
        bullet("Suba el PDF del monitor Syai X1 y el sistema extrae automáticamente: TIR, TAR total/alto/muy alto, TBR total/bajo/muy bajo, GMI, CV, GRI, tiempo activo del sensor, glucosa promedio y eventos de hipoglucemia."),
        bullet("Revisión en pantalla antes de confirmar el guardado — puede corregir cualquier dato si es necesario."),
        bullet("Clasificación ISPAD calculada en el momento: Óptimo, Moderado o Alto Riesgo."),
        bullet("Número de análisis automático por paciente (1°, 2°, 3°... análisis)."),
        bullet("Registro de dosis de insulina post-análisis y HbA1c post-MCG."),
        bullet("PDF del monitor archivado y vinculado al expediente del paciente."),
        espacio(),

        titulo2("📈  Evolución del Paciente", C.azul),
        bullet("Gráfica cronológica de TIR, GMI y CV a lo largo de todos los análisis del paciente."),
        bullet("Vista de semáforo por cada análisis: compare el Óptimo del 1er monitor vs. el 4to."),
        bullet("Registro de limitaciones del paciente para el uso del MCG (conectividad, alergias, situación económica)."),
        bullet("Valoración de calidad de vida por período: Buena / Mala / Igual."),
        bullet("Comentarios clínicos libres por análisis."),
        espacio(),

        titulo2("📏  Curvas de Crecimiento OMS", C.azul),
        bullet("Registro de peso, talla, IMC y estadio de Tanner por fecha de evaluación."),
        bullet("Z-score y percentil calculados automáticamente para cada indicador."),
        bullet("Clasificación: talla baja, normal, talla alta, delgadez, sobrepeso, obesidad."),
        espacio(),

        titulo2("💉  Historial de Insulinoterapia", C.azul),
        bullet("Registro de insulina prolongada y rápida: nombre comercial, dosis en U/kg y dosis absoluta."),
        bullet("Cálculo automático de dosis total diaria."),
        bullet("Historial cronológico de cambios de dosis correlacionado con la evolución del MCG."),
        espacio(),

        titulo2("📅  Registro de Consultas", C.azul),
        bullet("Nota de consulta digital: fecha, motivo, hallazgos y plan de manejo."),
        bullet("Impresión de nota de consulta en formato estándar."),
        espacio(),

        titulo2("💬  Mensajería WhatsApp", C.azul),
        bullet("Envíe un mensaje personalizado al paciente (o tutor) directamente desde el expediente."),
        bullet("El mensaje se genera automáticamente según la clasificación ISPAD — usted puede editarlo."),
        bullet("Historial de todos los mensajes enviados con fecha y estado."),
        espacio(),

        titulo2("🗺️  Mapa de Sus Pacientes", C.azul),
        bullet("Visualice sus pacientes geolocalizados en el mapa de Honduras."),
        bullet("Marcadores con color según clasificación ISPAD para identificación inmediata."),
        espacio(),

        titulo2("📉  Dashboard de Su Consulta", C.azul),
        bullet("Total de pacientes activos, total de análisis realizados."),
        bullet("TIR promedio, GMI promedio y CV promedio de su cartera."),
        bullet("Distribución por clasificación ISPAD: cuántos pacientes suyos están en Óptimo, Moderado y Alto Riesgo."),
        bullet("Gráficas por género y departamento de procedencia."),
        espacio(),

        titulo2("🔒  Seguridad y Privacidad", C.azul),
        bullet("Acceso protegido con usuario y contraseña cifrada."),
        bullet("Token JWT en cada sesión — los datos no quedan expuestos en el navegador."),
        bullet("Toda la comunicación cifrada con HTTPS."),
        bullet("Copias de seguridad automáticas diarias."),

        // ═══════════════════════════════════════════════════════════════
        //  3. MODALIDAD A — ALQUILER CON MANTENIMIENTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("3. Modalidad A — Alquiler Mensual con Mantenimiento"),
        separador(),

        titulo2("¿Cómo funciona?", C.celeste),
        parrafo(
          "Paga una cuota mensual fija y tiene acceso completo al sistema. No necesita servidores, no necesita TI, no necesita hacer copias de seguridad. Todo está alojado en la nube y disponible desde cualquier dispositivo. El mantenimiento, las actualizaciones y el soporte están incluidos."
        ),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("",                       C.azul),
              celdaEncabezado("Plan Solo",              C.celeste),
              celdaEncabezado("Plan Consulta",          C.azulMedio),
              celdaEncabezado("Plan Clínica",           C.azul),
            ]}),
            new TableRow({ children: [
              celda("Precio mensual (USD)",   C.grisClaro, true),
              celda("$85",                   C.celesteClaro, true, C.celeste, true),
              celda("$150",                  C.azulClaro,   true, C.azulMedio, true),
              celda("$250",                  C.azulClaro,   true, C.azul,     true),
            ]}),
            new TableRow({ children: [
              celda("Precio anual (2 meses de descuento)", C.grisClaro, true),
              celda("$850 / año",            C.blanco, false, C.celeste, true),
              celda("$1,500 / año",          C.blanco, false, C.azulMedio, true),
              celda("$2,500 / año",          C.blanco, false, C.azul,    true),
            ]}),
            new TableRow({ children: [
              celda("Usuarios médicos",       C.grisClaro, true),
              celda("1",                     C.blanco, false, C.negro, true),
              celda("Hasta 3",               C.blanco, false, C.negro, true),
              celda("Hasta 8",               C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Pacientes activos",      C.grisClaro, true),
              celda("Hasta 80",              C.blanco, false, C.negro, true),
              celda("Hasta 200",             C.blanco, false, C.negro, true),
              celda("Ilimitados",            C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Almacenamiento PDF",     C.grisClaro, true),
              celda("10 GB",                 C.blanco, false, C.negro, true),
              celda("30 GB",                 C.blanco, false, C.negro, true),
              celda("100 GB",                C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Todos los módulos",      C.grisClaro, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Mensajería WhatsApp",    C.grisClaro, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Mapa de pacientes",      C.grisClaro, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
              celda("✔",  C.blanco, true, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Actualizaciones automáticas", C.grisClaro, true),
              celda("✔ Incluidas", C.blanco, false, C.verde, true),
              celda("✔ Incluidas", C.blanco, false, C.verde, true),
              celda("✔ Incluidas", C.blanco, false, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Copias de seguridad diarias", C.grisClaro, true),
              celda("✔ Incluidas", C.blanco, false, C.verde, true),
              celda("✔ Incluidas", C.blanco, false, C.verde, true),
              celda("✔ Incluidas", C.blanco, false, C.verde, true),
            ]}),
            new TableRow({ children: [
              celda("Soporte técnico",        C.grisClaro, true),
              celda("WhatsApp / 24 h",       C.blanco, false, C.negro, true),
              celda("WhatsApp / 12 h",       C.blanco, false, C.negro, true),
              celda("Prioritario / 6 h",     C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Capacitación inicial",   C.grisClaro, true),
              celda("1 sesión virtual (60 min)", C.blanco, false, C.negro, true),
              celda("2 sesiones virtuales",   C.blanco, false, C.negro, true),
              celda("Presencial en la clínica + virtual", C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Ideal para",             C.grisClaro, true),
              celda("Médico en consulta privada solo", C.blanco),
              celda("Médico + asistente o residente",  C.blanco),
              celda("Clínica con varios endocrinólogos", C.blanco),
            ]}),
          ],
        }),

        espacio(2),
        parrafo("Recomendación: para un médico en consulta privada en el Medical Center Honduras, el Plan Solo ($85/mes) cubre todas las necesidades clínicas con el mismo sistema completo que usan los hospitales públicos, por menos de lo que cuesta un café al día.", { color: C.celeste, bold: true }),

        espacio(),
        titulo2("¿Qué incluye el mantenimiento mensual?", C.celeste),
        bullet("Alojamiento en la nube — sin servidores propios necesarios."),
        bullet("Copias de seguridad automáticas diarias de todos los datos y PDFs."),
        bullet("Actualizaciones del sistema: nuevas funcionalidades sin costo adicional."),
        bullet("Parches de seguridad aplicados automáticamente."),
        bullet("Certificado SSL/HTTPS activo — toda la comunicación cifrada."),
        bullet("Soporte técnico por WhatsApp con respuesta garantizada."),
        bullet("Si el sistema presenta un error que afecte su consulta, se resuelve el mismo día."),

        // ═══════════════════════════════════════════════════════════════
        //  4. MODALIDAD B — VENTA CON MANTENIMIENTO
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("4. Modalidad B — Venta (Pago Único) con Mantenimiento"),
        separador(),

        titulo2("¿Cómo funciona?", C.dorado),
        parrafo(
          "En lugar de pagar mensualmente, adquiere la licencia de uso del sistema con un pago único. A partir de ese momento, puede usar el sistema indefinidamente sin cuotas mensuales. El contrato de mantenimiento anual — optativo a partir del segundo año — garantiza que el sistema siga actualizado, seguro y con soporte."
        ),
        espacio(),
        parrafo(
          "Esta opción conviene si prefiere una inversión única y no quiere compromisos mensuales recurrentes, o si su consulta tiene un volumen de pacientes alto que justifica la amortización rápida del costo."
        ),
        espacio(),

        titulo2("Tabla de Venta con Mantenimiento", C.dorado),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Alcance de la Licencia",         C.dorado),
              celdaEncabezado("Precio único (USD)",             C.dorado),
              celdaEncabezado("Incluye",                        C.dorado),
            ]}),
            new TableRow({ children: [
              celda("1 médico · hasta 80 pacientes · 1 usuario",         C.grisClaro, true),
              celda("$900 – $1,200",        C.doradoClaro, true, C.dorado, true),
              celda("Instalación + configuración + capacitación virtual (1 sesión)", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Hasta 3 usuarios · hasta 200 pacientes",            C.grisClaro, true),
              celda("$1,800 – $2,500",      C.doradoClaro, true, C.dorado, true),
              celda("Instalación + capacitación (2 sesiones virtuales)", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Hasta 8 usuarios · pacientes ilimitados",           C.grisClaro, true),
              celda("$3,500 – $5,000",      C.doradoClaro, true, C.dorado, true),
              celda("Instalación + capacitación presencial en la clínica", C.blanco),
            ]}),
          ],
        }),

        espacio(2),

        titulo2("Mantenimiento Anual Post-Venta", C.dorado),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Año",                              C.dorado),
              celdaEncabezado("Condición",                        C.dorado),
              celdaEncabezado("Costo anual",                      C.dorado),
              celdaEncabezado("¿Qué cubre?",                      C.dorado),
            ]}),
            new TableRow({ children: [
              celda("Año 1",              C.doradoClaro, true),
              celda("Incluido en el precio de compra — sin costo adicional", C.blanco, false, C.verde),
              celda("$0 (incluido)",      C.blanco, true, C.verde, true),
              celda("Actualizaciones + parches de seguridad + soporte WhatsApp 24 h", C.blanco),
            ]}),
            new TableRow({ children: [
              celda("Año 2 en adelante",  C.grisClaro, true),
              celda("Optativo — renovación anual si desea mantener actualizaciones y soporte", C.blanco),
              celda("20% del precio de compra / año", C.blanco, true, C.dorado, true),
              celda("Actualizaciones + parches + soporte + 1 capacitación de repaso / año", C.blanco),
            ]}),
          ],
        }),

        espacio(),
        parrafo("Ejemplo práctico para Plan Solo (licencia $1,000 USD):", { bold: true }),
        bullet("Licencia única: $1,000 USD — uso indefinido desde el día 1."),
        bullet("Año 1 de mantenimiento: $0 (incluido)."),
        bullet("Año 2 de mantenimiento (opcional): $200 USD."),
        bullet("Año 3 de mantenimiento (opcional): $200 USD."),
        bullet("Total en 3 años: $1,400 USD — equivale a 16 meses de suscripción mensual."),
        bullet("A partir del año 4: puede continuar sin mantenimiento o renovar por $200/año."),
        espacio(),
        parrafo("Si atiende más de 15 pacientes con MCG al año, la venta se amortiza en menos de 2 años frente a la suscripción mensual.", { color: C.dorado, bold: true }),

        espacio(),
        titulo2("Alojamiento en la Modalidad de Venta", C.dorado),
        parrafo("Tiene dos opciones:"),
        espacio(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Opción",                    C.dorado),
              celdaEncabezado("Descripción",               C.dorado),
              celdaEncabezado("Costo mensual adicional",   C.dorado),
            ]}),
            new TableRow({ children: [
              celda("Hosting en la nube (recomendado)", C.grisClaro, true),
              celda("Nosotros administramos los servidores. Usted no necesita infraestructura propia.", C.blanco),
              celda("$25 – $45 USD / mes",    C.blanco, true, C.dorado, true),
            ]}),
            new TableRow({ children: [
              celda("Servidor propio del médico / clínica", C.grisClaro, true),
              celda("Si el Medical Center dispone de servidor, instalamos ahí. Sin costo mensual de hosting.", C.blanco),
              celda("$0 (pago único de instalación: $300)", C.blanco, true, C.verde, true),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  5. COMPARATIVA
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("5. ¿Qué le Conviene Más?"),
        separador(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [
              celdaEncabezado("Factor",                                   C.azul),
              celdaEncabezado("Alquiler mensual ($85/mes)",               C.celeste),
              celdaEncabezado("Venta única ($1,000 + $25/mes hosting)",   C.dorado),
            ]}),
            new TableRow({ children: [
              celda("Costo en el primer mes",       C.grisClaro, true),
              celda("$85",                         C.celesteClaro, true, C.celeste, true),
              celda("~$1,025 (licencia + hosting)", C.doradoClaro, true, C.dorado, true),
            ]}),
            new TableRow({ children: [
              celda("Costo en 12 meses",            C.grisClaro, true),
              celda("$850 / año",                  C.blanco, false, C.celeste, true),
              celda("$300 / año (solo hosting)",    C.blanco, false, C.dorado, true),
            ]}),
            new TableRow({ children: [
              celda("Punto de equilibrio",          C.grisClaro, true),
              celda("—",                           C.blanco, false, C.gris, true),
              celda("~14 meses",                   C.blanco, false, C.negro, true),
            ]}),
            new TableRow({ children: [
              celda("Actualizaciones del sistema",  C.grisClaro, true),
              celda("Incluidas siempre",           C.celesteClaro, false, C.verde),
              celda("Incluidas mientras pague mantenimiento", C.blanco, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("¿Qué pasa si cancela?",        C.grisClaro, true),
              celda("Pierde acceso — datos exportables", C.blanco, false, C.rojo),
              celda("Sigue usando el sistema indefinidamente", C.blanco, false, C.verde),
            ]}),
            new TableRow({ children: [
              celda("Flujo de caja",                C.grisClaro, true),
              celda("Bajo impacto mensual",         C.celesteClaro, false, C.verde),
              celda("Inversión inicial más alta",   C.blanco, false, C.gris),
            ]}),
            new TableRow({ children: [
              celda("Recomendado si…",              C.grisClaro, true),
              celda("Prefiere empezar con bajo costo inicial y cancelar si no lo usa.", C.blanco),
              celda("Atiende más de 15 pacientes MCG/año y prefiere no depender de pagos mensuales.", C.blanco),
            ]}),
          ],
        }),

        // ═══════════════════════════════════════════════════════════════
        //  6. PRUEBA GRATUITA
        // ═══════════════════════════════════════════════════════════════
        new Paragraph({ children: [new PageBreak()] }),
        titulo1("6. Pruébelo Gratis por 30 Días — Sin Compromiso"),
        separador(),
        parrafo(
          "Antes de tomar cualquier decisión, le ofrecemos 30 días de acceso completo al Plan Solo sin costo, sin tarjeta de crédito y sin ningún compromiso de continuidad. En ese mes puede:"
        ),
        espacio(),
        bullet("Registrar sus pacientes actuales con datos reales."),
        bullet("Subir los PDFs de sus monitores Syai X1 y verificar la extracción automática."),
        bullet("Ver el historial de evolución de cada paciente."),
        bullet("Enviar mensajes de WhatsApp a pacientes de prueba."),
        bullet("Explorar el dashboard con las estadísticas de su consulta."),
        bullet("Capacitación virtual incluida: 1 sesión de 60 minutos para que aprenda todo el sistema."),
        espacio(),
        parrafo(
          "Al finalizar el mes, si el sistema le ahorra tiempo y mejora su consulta — sigue con el plan que prefiera. Si no, no debe nada y sus datos le son entregados completos.",
          { color: C.azul, bold: true }
        ),
        espacio(),

        // ═══════════════════════════════════════════════════════════════
        //  7. PREGUNTAS FRECUENTES
        // ═══════════════════════════════════════════════════════════════
        titulo1("7. Preguntas Frecuentes"),
        separador(),

        titulo3("¿Necesito un servidor o equipo especial?", C.azul),
        parrafo("No. El sistema funciona en la nube. Solo necesita una computadora, tablet o celular con internet. Sin instalaciones."),
        espacio(),

        titulo3("¿El sistema funciona con todos los monitores MCG?", C.azul),
        parrafo("El parseo automático de PDF está optimizado para el monitor Syai X1 (el más utilizado en Honduras). Para otros monitores, los datos se ingresan manualmente en el expediente del paciente."),
        espacio(),

        titulo3("¿Mis datos están seguros?", C.azul),
        parrafo("Sí. Toda la comunicación va cifrada por HTTPS. Las contraseñas se almacenan con cifrado bcrypt. Copias de seguridad diarias automáticas. Nadie más puede acceder a los datos de sus pacientes."),
        espacio(),

        titulo3("¿Qué pasa si cancelo la suscripción mensual?", C.azul),
        parrafo("Le entregamos todos sus datos en un archivo exportable (SQL + PDFs) para que nunca pierda la información de sus pacientes."),
        espacio(),

        titulo3("¿Puedo empezar en el Plan Solo y subir al Plan Consulta después?", C.azul),
        parrafo("Sí. El cambio de plan se hace en cualquier momento sin perder datos ni historial."),
        espacio(),

        titulo3("¿Hay algún costo oculto?", C.azul),
        parrafo("No. El precio incluye todo: alojamiento, backups, actualizaciones y soporte. El único costo adicional posible es la API de WhatsApp si envía más de 1,000 mensajes/mes (algo improbable en una consulta privada)."),
        espacio(),

        titulo3("¿Cuánto tiempo tarda en estar listo para usar?", C.azul),
        parrafo("Una vez confirmado el inicio, el sistema está activo en menos de 24 horas. La capacitación se agenda dentro de los primeros 3 días."),

        // ═══════════════════════════════════════════════════════════════
        //  8. CONTACTO
        // ═══════════════════════════════════════════════════════════════
        espacio(2),
        titulo1("8. Siguiente Paso"),
        separador(),
        parrafo("Para activar su prueba gratuita de 30 días, agendar una demostración en vivo del sistema o resolver cualquier duda sobre los planes, por favor comuníquese con el equipo de Evolución Metabólica:"),
        espacio(),
        parrafo("El proceso es simple: en menos de 24 horas puede tener el sistema activo y empezar a cargar el siguiente PDF de un paciente.", { color: C.azul, bold: true }),
        espacio(3),
        parrafo("─────────────────────────────────────────────────────────────", { center: true, color: C.gris }),
        parrafo("© 2026 Evolución Metabólica — Todos los derechos reservados", { center: true, color: C.gris, italic: true }),
        parrafo("Propuesta confidencial preparada para el Medical Center Honduras · Tegucigalpa", { center: true, color: C.gris, italic: true }),

      ],
    },
  ],
});

// ── Guardar archivo ───────────────────────────────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Propuesta_Medico_MedicalCenter_Honduras.docx", buffer);
  console.log("✅  Archivo generado: Propuesta_Medico_MedicalCenter_Honduras.docx");
}).catch(err => {
  console.error("❌ Error:", err);
});
