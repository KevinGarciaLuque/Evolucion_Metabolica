/**
 * Genera la guía de uso del sistema "Evolución Metabólica" en formato .docx
 */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, convertInchesToTwip, NumberFormat,
  LevelFormat, Numbering, UnderlineType,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });
}

function p(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, ...options })],
    spacing: { before: 40, after: 80 },
  });
}

function bold(text) {
  return new TextRun({ text, bold: true, size: 22 });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { before: 20, after: 20 },
  });
}

function subbullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 1 },
    spacing: { before: 10, after: 10 },
  });
}

function note(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: "📌 Nota: ", bold: true, size: 20 }),
      new TextRun({ text, italics: true, size: 20 }),
    ],
    spacing: { before: 40, after: 60 },
    indent: { left: 360 },
  });
}

function divider() {
  return new Paragraph({
    text: "─────────────────────────────────────────────────────────",
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 160 },
    children: [new TextRun({ text: "", color: "AAAAAA" })],
  });
}

function tableTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22 })],
    spacing: { before: 140, after: 60 },
  });
}

function tableRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "EFF6FF" },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
        width: { size: 65, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

function metricTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([l, v]) => tableRow(l, v)),
  });
}

// ─── Documento ────────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        run: { size: 32, bold: true, color: "1D4ED8" },
        paragraph: { spacing: { before: 400, after: 120 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        run: { size: 26, bold: true, color: "1E3A8A" },
        paragraph: { spacing: { before: 280, after: 80 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        run: { size: 23, bold: true, color: "374151" },
        paragraph: { spacing: { before: 200, after: 60 } },
      },
    ],
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

        // ── PORTADA ──────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: "SISTEMA EVOLUCIÓN METABÓLICA", bold: true, size: 48, color: "1D4ED8" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Guía de Uso y Proceso Clínico", italics: true, size: 32, color: "374151" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Hospital Mario Catarino Rivas (HMEP) · IHSS", size: 24, color: "6B7280" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Endocrinología Pediátrica · Monitoreo Continuo de Glucosa (MCG)", size: 22, color: "6B7280" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Versión 1.0   ·   Abril 2026", size: 20, color: "9CA3AF" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 1600 },
        }),

        // ── 1. ¿QUÉ ES EL SISTEMA? ───────────────────────────────────────────
        h1("1. ¿Qué es el Sistema Evolución Metabólica?"),
        p("Evolución Metabólica es una plataforma web desarrollada para el seguimiento clínico de pacientes pediátricos con diabetes que utilizan Monitor Continuo de Glucosa (MCG) Syai X1. Permite registrar, analizar y visualizar los datos obtenidos del monitor, clasificar el control glucémico según los criterios ISPAD, y generar estadísticas consolidadas para la toma de decisiones médicas."),
        p("El sistema atiende pacientes de dos instituciones:"),
        bullet("HMEP – Hospital Mario Catarino Rivas: hasta 6 registros MCG por paciente."),
        bullet("IHSS – Instituto Hondureño de Seguridad Social: 1 registro MCG por paciente."),

        // ── 2. ARQUITECTURA ──────────────────────────────────────────────────
        h1("2. Arquitectura del Sistema"),
        p("El sistema se divide en dos componentes principales:"),
        h3("Frontend (Interfaz Web)"),
        bullet("Tecnología: React + Vite"),
        bullet("Puerto: http://localhost:5173"),
        bullet("Páginas: Dashboard, Pacientes, Subir PDF, Consolidado"),
        h3("Backend (API REST)"),
        bullet("Tecnología: Node.js + Express"),
        bullet("Puerto: http://localhost:3001"),
        bullet("Base de datos: MySQL (evolucion_metabolica)"),

        // ── 3. PROCESO COMPLETO ──────────────────────────────────────────────
        h1("3. Proceso Clínico Completo — De Inicio a Fin"),

        // ── PASO 1 ────────────────────────────────────────────────────────────
        h2("PASO 1 · Inicio de Sesión"),
        p("El médico o asistente accede al sistema mediante la pantalla de login."),
        metricTable([
          ["URL",       "http://localhost:5173"],
          ["Usuario",   "endo@gmail.com"],
          ["Contraseña","endo2026"],
          ["Roles",     "admin / doctor / asistente"],
        ]),
        note("El token JWT se guarda en el navegador y autoriza todas las peticiones a la API."),

        // ── PASO 2 ────────────────────────────────────────────────────────────
        h2("PASO 2 · Registrar un Nuevo Paciente"),
        p("Desde el menú Pacientes → + Nuevo Paciente se abre el formulario de registro. Los campos disponibles son:"),
        h3("Datos de identificación"),
        bullet("DNI / Expediente"),
        bullet("Nombre completo"),
        bullet("Fecha de nacimiento (calcula la edad automáticamente)"),
        bullet("Género (Femenino / Masculino)"),
        bullet("Institución: HMEP o IHSS"),
        bullet("Departamento de procedencia"),
        bullet("Procedencia: Urbana / Rural"),
        bullet("Teléfono de contacto"),
        h3("Datos clínicos"),
        bullet("Tipo de diabetes (Tipo 1, Tipo 2, MODY, Otro)"),
        bullet("Peso (kg) y Talla (cm)"),
        bullet("HbA1c previo al MCG (%)"),
        bullet("Tipo de insulina utilizada"),
        bullet("Dosis por kg de peso"),
        bullet("Promedio de glucometrías por día"),
        note("El campo DNI es único. Si ya existe un paciente con ese DNI el sistema lo rechaza con un mensaje de error."),

        // ── PASO 3 ────────────────────────────────────────────────────────────
        h2("PASO 3 · Colocar el Monitor MCG y Generar el PDF"),
        p("El médico coloca el monitor Syai X1 al paciente. Al finalizar el período de monitoreo (generalmente 14 días), el monitor genera un reporte en formato PDF con todas las métricas del período."),
        bullet("El período de monitoreo típico es de 14 días."),
        bullet("HMEP puede tener hasta 6 períodos de monitoreo por paciente."),
        bullet("IHSS registra 1 período de monitoreo por paciente."),

        // ── PASO 4 ────────────────────────────────────────────────────────────
        h2("PASO 4 · Cargar y Analizar el PDF (Subir Reporte)"),
        p("Desde el menú Subir PDF se carga el reporte del monitor."),
        h3("Etapa A – Selección"),
        bullet("Seleccionar el paciente desde el listado desplegable."),
        bullet("Arrastrar el archivo PDF o hacer clic para buscarlo (máximo 20 MB)."),
        bullet("Hacer clic en \"Analizar PDF\"."),
        h3("Etapa B – Extracción automática"),
        p("El backend recibe el archivo y el servicio pdfParser.js extrae automáticamente las métricas mediante expresiones regulares:"),
        metricTable([
          ["TIR",               "Tiempo en Rango 70–180 mg/dL (%)"],
          ["TAR Muy Alto",      "Tiempo encima de 250 mg/dL (%)"],
          ["TAR Alto",          "Tiempo entre 181–250 mg/dL (%)"],
          ["TBR Bajo",          "Tiempo entre 54–59 mg/dL (%)"],
          ["TBR Muy Bajo",      "Tiempo debajo de 54 mg/dL (%)"],
          ["GRI",               "Índice de Riesgo de Glucemia"],
          ["Tiempo Activo",     "Porcentaje de tiempo con sensor activo (%)"],
          ["CV",                "Coeficiente de Variación (%)"],
          ["GMI",               "Indicador de Manejo de Glucosa (%)"],
          ["Hipoglucemias",     "Número de eventos y duración promedio (min)"],
        ]),
        h3("Etapa C – Revisión médica"),
        p("El médico ve los datos extraídos en pantalla y puede corregirlos antes de guardar. En tiempo real se muestra el Semáforo ISPAD con la clasificación calculada."),
        h3("Etapa D – Confirmación y guardado"),
        p("Al hacer clic en \"Confirmar y Guardar\" el análisis se registra en la base de datos con:"),
        bullet("Clasificación ISPAD automática"),
        bullet("Referencia al archivo PDF guardado en el servidor"),
        bullet("Historial de evolución actualizado"),

        // ── PASO 5 ────────────────────────────────────────────────────────────
        h2("PASO 5 · Clasificación ISPAD — El Semáforo"),
        p("El sistema clasifica automáticamente el control glucémico de cada análisis según los criterios internacionales ISPAD:"),
        new Paragraph({ spacing: { before: 80, after: 40 } }),
        metricTable([
          ["🟢  ÓPTIMO",       "TIR ≥ 70%  ·  TAR ≤ 25%  ·  TBR ≤ 4%  ·  GMI ≤ 7%"],
          ["🟡  MODERADO",     "TIR ≥ 50%  ·  TAR ≤ 35%  ·  TBR ≤ 8%"],
          ["🔴  ALTO RIESGO",  "No cumple los criterios anteriores"],
        ]),
        note("La clasificación aparece como semáforo visual tanto al cargar un análisis como en el detalle de cada paciente."),

        // ── PASO 6 ────────────────────────────────────────────────────────────
        h2("PASO 6 · Ver el Detalle del Paciente"),
        p("Desde Pacientes → [nombre del paciente] se puede ver:"),
        bullet("Datos personales y clínicos completos."),
        bullet("Historial de todos los análisis MCG (por número de registro)."),
        bullet("Evolución de TIR, GMI y CV a lo largo del tiempo."),
        bullet("Semáforo ISPAD de cada análisis."),
        bullet("Dosis de insulina antes y después del monitor."),
        bullet("Limitaciones para el uso del MCG (internet, alergias, económicas)."),
        bullet("Valoración de calidad de vida (Buena / Mala / Igual)."),
        bullet("Comentarios clínicos por análisis."),

        // ── PASO 7 ────────────────────────────────────────────────────────────
        h2("PASO 7 · Importación Masiva desde Excel"),
        p("Para cargar todos los pacientes de un Excel (HMEP + IHSS) de manera masiva se ejecuta el script de importación desde el servidor:"),
        new Paragraph({
          children: [new TextRun({ text: "node import_excel.cjs", font: "Courier New", size: 20, bold: true })],
          spacing: { before: 60, after: 60 },
          indent: { left: 720 },
        }),
        p("El archivo Excel debe tener dos hojas:"),
        metricTable([
          ["Hoja HMEP", "36 pacientes · hasta 6 registros MCG cada uno (columnas 13–84)"],
          ["Hoja IHSS", "Hasta 21 pacientes · 1 registro MCG · columnas 13–34"],
        ]),
        p("El script realiza:"),
        bullet("Normalización de nombres (title case), DNI y edad."),
        bullet("Inserción de pacientes con ON DUPLICATE KEY UPDATE (no duplica si ya existe el DNI)."),
        bullet("Inserción de análisis para cada período MCG con datos completos."),
        bullet("Cálculo automático de la clasificación ISPAD."),
        note("Si un paciente ya existe por DNI, sus datos se actualizan sin crear duplicados."),

        // ── PASO 8 ────────────────────────────────────────────────────────────
        h2("PASO 8 · Dashboard — Resumen Estadístico"),
        p("La pantalla de Dashboard muestra indicadores globales en tiempo real:"),
        bullet("Total de pacientes activos."),
        bullet("Total de análisis registrados."),
        bullet("TIR promedio, GMI promedio, CV promedio."),
        bullet("Distribución por clasificación ISPAD (Óptimo / Moderado / Alto Riesgo)."),
        bullet("Gráficas por departamento y por género."),

        // ── PASO 9 ────────────────────────────────────────────────────────────
        h2("PASO 9 · Consolidado Poblacional"),
        p("La pantalla Consolidado permite análisis comparativos:"),
        bullet("Filtros por departamento, género, edad mínima y máxima."),
        bullet("Promedio de TIR y GMI de la población filtrada."),
        bullet("Gráficas de barras: TIR por departamento y por género."),
        bullet("Tabla completa de todos los análisis con datos del paciente asociado."),

        // ── FLUJO RESUMEN ────────────────────────────────────────────────────
        h1("4. Flujo Resumido del Proceso"),
        p("A continuación el ciclo completo de atención de un paciente:"),
        bullet("① Login médico en el sistema."),
        bullet("② Registro del paciente con datos clínicos y demográficos."),
        bullet("③ Colocación del monitor MCG Syai X1 al paciente."),
        bullet("④ Al finalizar el período (14 días), descargar el PDF del monitor."),
        bullet("⑤ Cargar el PDF en Subir PDF → el sistema extrae los datos automáticamente."),
        bullet("⑥ Revisar y corregir datos extraídos → ver Semáforo ISPAD en tiempo real."),
        bullet("⑦ Confirmar y guardar el análisis."),
        bullet("⑧ Consultar el historial del paciente para ver evolución."),
        bullet("⑨ Si aplica: ajustar dosis de insulina, registrar observaciones y calidad de vida."),
        bullet("⑩ Consultar Dashboard y Consolidado para seguimiento poblacional."),

        // ── 5. BASE DE DATOS ─────────────────────────────────────────────────
        h1("5. Estructura de la Base de Datos"),
        tableTitle("Tabla: pacientes"),
        metricTable([
          ["id",                    "Identificador único auto-incremental"],
          ["dni",                   "Documento Nacional de Identidad (único)"],
          ["nombre",                "Nombre completo del paciente"],
          ["fecha_nacimiento",      "Fecha de nacimiento (DATE)"],
          ["edad",                  "Edad calculada en años"],
          ["sexo",                  "M / F"],
          ["departamento",          "Departamento de procedencia"],
          ["procedencia_tipo",      "Urbana / Rural"],
          ["institucion",           "HMEP / IHSS"],
          ["peso / talla",          "Peso (kg) y talla (cm)"],
          ["tipo_diabetes",         "Tipo 1 / Tipo 2 / MODY / Otro"],
          ["hba1c_previo",          "HbA1c antes del MCG (%)"],
          ["tipo_insulina",         "Esquema de insulina utilizado"],
          ["dosis_por_kg",          "Dosis diaria total por kg de peso"],
          ["promedio_glucometrias", "Glucometrías promedio por día"],
          ["telefono",              "Teléfono de contacto"],
        ]),
        tableTitle("Tabla: analisis"),
        metricTable([
          ["id",                    "Identificador único"],
          ["paciente_id",           "FK → pacientes.id"],
          ["numero_registro",       "Número de MCG (1 a 6 para HMEP; 1 para IHSS)"],
          ["fecha / fecha_colocacion","Fecha del análisis y fecha de colocación del MCG"],
          ["tir",                   "Tiempo en Rango (%)"],
          ["tar / tar_muy_alto / tar_alto","TAR total, >250 y 181–250 (%)"],
          ["tbr / tbr_bajo / tbr_muy_bajo","TBR total, 54–59 y <54 (%)"],
          ["gri",                   "Índice de Riesgo de Glucemia"],
          ["tiempo_activo",         "Tiempo con sensor activo (%)"],
          ["cv",                    "Coeficiente de Variación (%)"],
          ["gmi",                   "Indicador de Manejo de Glucosa (%)"],
          ["eventos_hipoglucemia",  "Número de episodios de hipoglucemia"],
          ["duracion_hipoglucemia", "Duración promedio de hipoglucemia (min)"],
          ["clasificacion",         "OPTIMO / MODERADO / ALTO_RIESGO"],
          ["dosis_insulina_post",   "Dosis de insulina durante el período MCG"],
          ["se_modifico_dosis",     "Booleano: ¿se modificó la dosis post-MCG?"],
          ["dosis_modificada",      "Nueva dosis indicada tras el MCG"],
          ["hba1c_post_mcg",        "HbA1c posterior al MCG (%)"],
          ["limitacion_internet",   "Limitación por falta de internet (0/1)"],
          ["limitacion_alergias",   "Limitación por alergias al sensor (0/1)"],
          ["limitacion_economica",  "Limitación económica (0/1)"],
          ["calidad_vida",          "Buena / Mala / Igual"],
          ["comentarios",           "Observaciones clínicas del período"],
        ]),

        // ── 6. COMANDOS ──────────────────────────────────────────────────────
        h1("6. Comandos para Iniciar el Sistema"),
        h3("Iniciar el Backend (API)"),
        new Paragraph({
          children: [new TextRun({ text: "cd backend    →    node server.js", font: "Courier New", size: 20 })],
          indent: { left: 720 }, spacing: { before: 40, after: 80 },
        }),
        h3("Iniciar el Frontend (Interfaz Web)"),
        new Paragraph({
          children: [new TextRun({ text: "cd frontend    →    npm run dev", font: "Courier New", size: 20 })],
          indent: { left: 720 }, spacing: { before: 40, after: 80 },
        }),
        h3("Ejecutar migraciones de base de datos"),
        new Paragraph({
          children: [new TextRun({ text: "node migrate.cjs    →    node migrate2.cjs", font: "Courier New", size: 20 })],
          indent: { left: 720 }, spacing: { before: 40, after: 80 },
        }),
        h3("Importar datos desde Excel"),
        new Paragraph({
          children: [new TextRun({ text: "node import_excel.cjs", font: "Courier New", size: 20 })],
          indent: { left: 720 }, spacing: { before: 40, after: 80 },
        }),

        // ── 7. COSTOS DE OPERACIÓN EN LA NUBE ────────────────────────────────
        h1("7. Costos Aproximados de Operación en la Nube"),
        p("El proyecto puede desplegarse en varias plataformas según el presupuesto y el nivel de control técnico que se desee. A continuación se describe cada opción y sus costos mensuales para una clínica con 30–150 pacientes activos."),

        // ── Comparativa ──────────────────────────────────────────────────────
        h2("7.1 Comparativa de Plataformas de Alojamiento"),
        metricTable([
          ["Plataforma",          "Costo mensual aprox.  ·  Dificultad de configuración  ·  Ideal para"],
          ["Railway",             "~$10 – $25 / mes  ·  ★☆☆ Fácil  ·  Despliegue rápido desde GitHub, recomendado"],
          ["Hostinger VPS",       "~$5 – $12 / mes   ·  ★★☆ Medio  ·  Presupuesto reducido, control total del servidor"],
          ["Amazon AWS",          "~$20 – $50 / mes  ·  ★★★ Avanzado  ·  Escalabilidad empresarial, cumplimiento HIPAA"],
          ["DigitalOcean / Render","~$7 – $20 / mes  ·  ★☆☆ Fácil  ·  Alternativa a Railway similar en precio"],
          ["Vercel (frontend)",   "$0 / mes (Hobby)  ·  ★☆☆ Fácil  ·  Solo interfaz React, siempre gratuito"],
        ]),
        note("Para una clínica pequeña o mediana se recomienda Railway (backend + MySQL) + Vercel (frontend). Es la configuración más simple, con deploy automático desde GitHub."),

        // ── Railway ───────────────────────────────────────────────────────────
        h2("7.2 Railway — Opción Recomendada (Configuración Actual)"),
        p("Railway aloja el servidor Node.js/Express, la base de datos MySQL y el volumen de PDFs. Todo se despliega automáticamente con cada push a GitHub."),
        metricTable([
          ["Plan Hobby (base)",        "$5 USD / mes — incluye $5 en créditos de consumo"],
          ["Backend Node.js/Express",  "~$5 – $10 USD / mes  (0.5 vCPU · 512 MB RAM)"],
          ["Base de datos MySQL",      "~$5 – $10 USD / mes  (hasta 1 GB de datos)"],
          ["Volumen persistente (PDFs)","~$0.25 USD / GB / mes  (ej. 2 GB = $0.50 / mes)"],
          ["Red de salida (egress)",   "Primeros 100 GB / mes incluidos; luego $0.10 / GB"],
          ["TOTAL Railway",            "$10 – $25 USD / mes"],
        ]),
        metricTable([
          ["Ventajas",    "Deploy automático desde GitHub · sin gestión de SO · SSL incluido · logs en tiempo real"],
          ["Limitaciones","Costo escala con uso · no apto para volúmenes muy altos sin plan Pro"],
          ["URL de precios", "railway.app/pricing"],
        ]),

        // ── Hostinger VPS ─────────────────────────────────────────────────────
        h2("7.3 Hostinger VPS — Opción Económica con Control Total"),
        p("Hostinger ofrece servidores VPS (Servidor Privado Virtual) donde se instala el entorno completo: Node.js, MySQL, Nginx y PM2. Es la opción más barata si se tiene conocimiento básico de Linux."),
        metricTable([
          ["KVM 1 (plan mínimo)",      "$3.99 – $5.99 USD / mes  ·  1 vCPU · 4 GB RAM · 50 GB NVMe"],
          ["KVM 2 (recomendado)",      "$7.99 – $9.99 USD / mes  ·  2 vCPU · 8 GB RAM · 100 GB NVMe"],
          ["Sistema operativo",        "Ubuntu 22.04 LTS (gratuito) — el más común para Node.js"],
          ["SSL (HTTPS)",              "Gratuito con Let's Encrypt (certbot)"],
          ["Backups automáticos",      "$1 – $2 USD / mes adicionales (opcional)"],
          ["TOTAL Hostinger",          "$4 – $12 USD / mes"],
        ]),
        p("Componentes a instalar manualmente en el VPS:"),
        bullet("Node.js 20 LTS + npm"),
        bullet("MySQL Server 8 + usuario y base de datos"),
        bullet("Nginx como proxy inverso (puerto 80/443 → 3001)"),
        bullet("PM2 para mantener el servidor corriendo y reiniciarlo automáticamente"),
        bullet("Certbot (Let's Encrypt) para certificado SSL gratuito"),
        metricTable([
          ["Ventajas",    "Costo muy bajo · recursos dedicados · control total · backups incluibles"],
          ["Limitaciones","Requiere configuración manual de Linux · sin deploy automático desde GitHub por defecto"],
          ["URL",         "hostinger.com/vps-hosting"],
        ]),
        note("Con Hostinger también se puede alojar el frontend directamente en Nginx (sin Vercel), sirviendo el build de React desde /var/www/html. Esto elimina la necesidad de Vercel."),

        // ── Amazon AWS ────────────────────────────────────────────────────────
        h2("7.4 Amazon AWS — Opción Empresarial y Escalable"),
        p("Amazon Web Services (AWS) es la plataforma en la nube más usada a nivel mundial. Ofrece mayor escalabilidad, cumplimiento de normas de salud (HIPAA eligible) y herramientas avanzadas de monitoreo. Requiere conocimientos técnicos para su configuración."),
        metricTable([
          ["EC2 t3.micro (Free Tier)", "Gratuito 12 meses; luego ~$8 – $10 USD / mes"],
          ["EC2 t3.small (recomendado)","~$15 – $18 USD / mes  ·  2 vCPU · 2 GB RAM"],
          ["RDS MySQL t3.micro",       "~$15 – $25 USD / mes  ·  base de datos gestionada"],
          ["S3 (almacenamiento PDFs)", "~$0.023 USD / GB / mes  ·  50 GB = $1.15 / mes"],
          ["Elastic Load Balancer",    "~$16 USD / mes (opcional, solo si se necesita alta disponibilidad)"],
          ["Route 53 (DNS)",           "~$0.50 USD / zona / mes"],
          ["Certificate Manager (SSL)","$0.00 — gratuito para recursos AWS"],
          ["TOTAL AWS (básico)",       "$25 – $50 USD / mes sin alta disponibilidad"],
        ]),
        p("Servicios AWS más utilizados para este proyecto:"),
        bullet("EC2 — servidor virtual donde corre Node.js/Express (equivalente al VPS de Hostinger)."),
        bullet("RDS — base de datos MySQL gestionada: backups automáticos, failover, parches de seguridad."),
        bullet("S3 — almacenamiento de los PDFs subidos por los usuarios (reemplaza el volumen de Railway)."),
        bullet("CloudFront — CDN para servir el frontend React (alternativa a Vercel, gratuito hasta 1 TB/mes)."),
        bullet("Route 53 — DNS gestionado para el dominio del sistema."),
        metricTable([
          ["Ventajas",    "Altamente escalable · HIPAA eligible · SLA 99.99% · integración con servicios de IA/ML de AWS"],
          ["Limitaciones","Configuración compleja · costo superior · requiere conocimientos de AWS IAM y redes"],
          ["Nivel gratuito", "aws.amazon.com/free — 12 meses gratis en servicios elegibles"],
          ["URL de precios",  "aws.amazon.com/pricing"],
        ]),
        note("Para una clínica pequeña, AWS puede ser excesivo. Se recomienda Railway o Hostinger en etapa inicial y migrar a AWS si el sistema escala a nivel institucional o nacional."),

        // ── Alternativas ─────────────────────────────────────────────────────
        h2("7.5 Otras Alternativas de Alojamiento"),
        metricTable([
          ["DigitalOcean Droplet",  "$6 / mes (1 vCPU · 1 GB RAM) — similar a Hostinger VPS, muy popular entre desarrolladores"],
          ["Render.com",            "$7 / mes backend + $0 frontend — similar a Railway, con plan gratuito más limitado"],
          ["Fly.io",                "$5 – $15 / mes — despliegue con contenedores Docker, buena latencia en Latinoamérica"],
          ["Google Cloud Run",      "Pago por uso — puede ser $0 en tráfico bajo; escala automáticamente"],
          ["Azure App Service",     "$10 – $30 / mes — opción Microsoft, similar a AWS en complejidad"],
        ]),

        // ── Dominio Web ──────────────────────────────────────────────────────
        h2("7.6 Dominio Web (Nombre de la Página)"),
        p("Para acceder al sistema con un nombre propio (ej. evolucionmetabolica.com) se necesita registrar un dominio. El costo es anual y varía según el registrador y la extensión elegida."),
        metricTable([
          ["Extensión .com",    "$9 – $15 USD / año — la más reconocida internacionalmente"],
          ["Extensión .hn",     "$25 – $60 USD / año — dominio nacional de Honduras (requiere gestión local)"],
          ["Extensión .clinic", "$25 – $40 USD / año — específica para clínicas y centros de salud"],
          ["Extensión .health", "$35 – $50 USD / año — especializada en salud"],
          ["Extensión .app",    "$14 – $20 USD / año — moderna, fuerza HTTPS obligatorio"],
        ]),
        p("Registradores recomendados:"),
        metricTable([
          ["Namecheap",           "namecheap.com — precio más bajo · interfaz sencilla · DNS gratuito incluido"],
          ["Cloudflare Registrar","cloudflare.com — precio al costo (sin margen) · protección DDoS incluida"],
          ["GoDaddy",             "godaddy.com — frecuentes promociones primer año (~$1–3) · renovación más cara"],
          ["Google Domains",      "domains.google — ~$12 / año .com · privacidad WHOIS gratuita"],
          ["Route 53 (AWS)",      "~$12 / año .com — recomendado si ya se usa AWS"],
        ]),
        note("El dominio es independiente del servidor. Se puede comprar el dominio en Namecheap y apuntarlo a Railway, Hostinger o AWS usando los registros DNS que cada plataforma indica."),
        p("Costo total del dominio convertido a Lempiras (referencial):"),
        metricTable([
          [".com en Namecheap",  "~$10 / año ≈ 250 HNL / año ≈ 21 HNL / mes"],
          [".hn nacional",       "~$35 / año ≈ 875 HNL / año ≈ 73 HNL / mes"],
        ]),

        // ── Twilio WhatsApp ──────────────────────────────────────────────────
        h2("7.7 Twilio — Mensajes de WhatsApp"),
        p("Los mensajes de WhatsApp se envían automáticamente a los pacientes (recordatorios, alertas de citas, etc.) mediante la API de Twilio. El costo es independiente del servidor elegido."),
        metricTable([
          ["Número de WhatsApp (sender)", "$1.00 USD / mes — número de teléfono dedicado en Twilio"],
          ["Mensaje saliente (outbound)", "~$0.005 USD por mensaje enviado"],
          ["Mensaje entrante (inbound)",  "~$0.005 USD por mensaje recibido"],
          ["Conversación 24 h (Meta fee)","~$0.006 – $0.015 USD por conversación iniciada"],
          ["Sandbox de desarrollo",       "$0.00 USD — gratuito, sólo para pruebas internas"],
        ]),
        note("Meta cobra adicionalmente una tarifa por conversación según la categoría (utilidad, marketing, autenticación). Para Honduras la tarifa de conversación de utilidad es ~$0.006 USD."),
        p("Estimado mensual según volumen de pacientes:"),
        metricTable([
          ["30 pacientes · 2 mensajes c/u",  "60 mensajes ≈ $0.30 + $1.00 número = ~$1.30 / mes"],
          ["80 pacientes · 3 mensajes c/u",  "240 mensajes ≈ $1.20 + $1.00 número = ~$2.20 / mes"],
          ["150 pacientes · 4 mensajes c/u", "600 mensajes ≈ $3.00 + $1.00 número = ~$4.00 / mes"],
        ]),

        // ── Resumen total ─────────────────────────────────────────────────────
        h2("7.8 Resumen Total Mensual por Escenario"),
        p("Costo mensual completo (servidor + dominio + WhatsApp) según la plataforma elegida, para una clínica con ~80 pacientes activos:"),
        metricTable([
          ["Componente",                       "Railway",     ],
          ["Servidor backend + MySQL",         "$10 – $25 / mes"],
          ["Frontend (Vercel)",                "$0 / mes"],
          ["Dominio (.com)",                   "~$1 / mes (≈$10/año)"],
          ["WhatsApp Twilio (80 pacientes)",   "~$2.20 / mes"],
          ["──────────────────────────────────","─────────────────────"],
          ["TOTAL con Railway",                "$13 – $28 USD / mes  (~325 – 700 HNL)"],
        ]),
        metricTable([
          ["TOTAL con Hostinger VPS",          "$8 – $15 USD / mes  (~200 – 375 HNL)  ← más económico"],
          ["TOTAL con AWS (básico)",            "$28 – $55 USD / mes  (~700 – 1 375 HNL)  ← más escalable"],
        ]),
        note("Estos valores son aproximados. Los precios pueden variar según región, promociones vigentes y consumo real. Se recomienda revisar railway.app/pricing, hostinger.com, aws.amazon.com/pricing, twilio.com/whatsapp/pricing y namecheap.com periódicamente."),

        // ── PIE ───────────────────────────────────────────────────────────────
        divider(),
        new Paragraph({
          children: [new TextRun({ text: "Sistema Evolución Metabólica · Endocrinología Pediátrica · Abril 2026", size: 18, color: "9CA3AF", italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
        }),
      ],
    },
  ],
});

// ─── Guardar archivo ─────────────────────────────────────────────────────────
const salida = path.join(__dirname, "..", "Guia_Evolucion_Metabolica.docx");

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(salida, buffer);
  console.log("✅ Documento generado:", salida);
}).catch((e) => console.error("❌", e));
