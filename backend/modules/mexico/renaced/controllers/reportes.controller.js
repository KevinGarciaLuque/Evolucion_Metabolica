import PDFDocument from "pdfkit";
import { exportarCSVStream, iniciarExcel, obtenerTrabajo, trabajosActivos } from "../services/exportacion.js";

// El admin puede acotar la exportación a una clínica (query unidad_id); sin acotar,
// exporta el país completo. Cualquier otro perfil queda forzado a su propia clínica.
const unidadDe = (req) => (req.alcance.esAdmin ? (req.query.unidad_id || null) : req.alcance.unidadId);

// ── Excel: trabajo en segundo plano (no cabe en memoria con millones de filas) ──
// POST /reportes/excel/iniciar → { id }
export const iniciarExportExcel = async (req, res) => {
  if (trabajosActivos() >= 2) {
    return res.status(429).json({ error: "Hay varias exportaciones en curso. Intenta de nuevo en un minuto." });
  }
  const t = iniciarExcel({ db: req.db, unidadId: unidadDe(req), usuarioId: req.usuario.id });
  res.status(202).json({ id: t.id });
};

// GET /reportes/excel/estado/:id
export const estadoExportExcel = (req, res) => {
  const t = obtenerTrabajo(req.params.id);
  if (!t || t.usuarioId !== req.usuario.id) return res.status(404).json({ error: "Exportación no encontrada" });
  res.json({ estado: t.estado, filas: t.filas, error: t.error, nota: t.nota });
};

// GET /reportes/excel/descargar/:id
export const descargarExportExcel = (req, res) => {
  const t = obtenerTrabajo(req.params.id);
  if (!t || t.usuarioId !== req.usuario.id) return res.status(404).json({ error: "Exportación no encontrada" });
  if (t.estado !== "terminado") return res.status(409).json({ error: "La exportación aún no termina" });
  const fecha = new Date().toISOString().slice(0, 10);
  res.download(t.archivo, `RENACED_Mexico_${fecha}.xlsx`, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "El archivo ya no está disponible" });
  });
};

// Compatibilidad: GET /reportes/excel responde con el mismo flujo pero sin esperar
export const exportarExcel = (req, res) => res.status(410).json({ error: "Usa POST /reportes/excel/iniciar" });

// ── CSV (lista de pacientes) en streaming ────────────────────────────────────
export const exportarCSV = async (req, res) => {
  try {
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="RENACED_Mexico_${fecha}.csv"`);
    await exportarCSVStream(req.db, unidadDe(req), res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Error al generar CSV" });
    else res.end();
  }
};

// Genera el PDF estadístico, opcionalmente acotado a una clínica (unidadId).
// nombreClinica solo se usa para el encabezado del documento.
async function generarReportePDF(req, res, { unidadId, nombreClinica }) {
  try {
    const scoped = !!unidadId;

    const [[totales]] = await req.db.query(`
      SELECT COUNT(*) AS total,
             SUM(sexo = 'F') AS mujeres,
             SUM(sexo = 'M') AS hombres,
             SUM(estatus_id = 1) AS activos,
             ROUND(AVG(TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE())), 1) AS edad_promedio
      FROM paciente
      ${scoped ? "WHERE unidad_servicio_id = ?" : ""}
    `, scoped ? [unidadId] : []);

    const [por_tipo] = await req.db.query(`
      SELECT td.descripcion AS tipo, COUNT(*) AS total
      FROM diagnostico d
      JOIN cat_tipo_diabetes td ON td.id = d.tipo_diabetes_id
      ${scoped ? "JOIN paciente p ON p.id = d.paciente_id WHERE p.unidad_servicio_id = ?" : ""}
      GROUP BY td.id ORDER BY total DESC
    `, scoped ? [unidadId] : []);

    const [[hba]] = await req.db.query(`
      SELECT
        SUM(hba1c < 7)             AS optimo,
        SUM(hba1c BETWEEN 7 AND 9) AS moderado,
        SUM(hba1c > 9)             AS alto,
        COUNT(hba1c)               AS con_dato,
        ROUND(AVG(hba1c), 2)       AS promedio
      FROM laboratorio l
      ${scoped ? "JOIN paciente p ON p.id = l.paciente_id" : ""}
      WHERE l.id IN (SELECT MAX(id) FROM laboratorio GROUP BY paciente_id)
        AND hba1c IS NOT NULL
        ${scoped ? "AND p.unidad_servicio_id = ?" : ""}
    `, scoped ? [unidadId] : []);

    const [complicaciones] = await req.db.query(`
      SELECT
        COUNT(retinopatia_id)       AS con_retinopatia,
        COUNT(nefropatia_id)        AS con_nefropatia,
        COUNT(neuropatia_id)        AS con_neuropatia,
        COUNT(pie_diabetico_id)     AS con_pie_diabetico,
        COUNT(enf_cardiovascular_id) AS con_cardiovascular,
        COUNT(DISTINCT paciente_id) AS total_evaluados
      FROM evaluacion ev
      ${scoped ? "JOIN paciente p ON p.id = ev.paciente_id WHERE p.unidad_servicio_id = ?" : ""}
    `, scoped ? [unidadId] : []);
    const comp = complicaciones[0];

    // ── Construir PDF ──
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      const fecha = new Date().toISOString().slice(0, 10);
      const slugClinica = nombreClinica
        ? "_" + nombreClinica.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_")
        : "";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="RENACED_Reporte${slugClinica}_${fecha}.pdf"`);
      res.send(buf);
    });

    const fechaLarga = new Date().toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric",
    });

    const LINE = "#e2e8f0";
    const BLUE = "#1d4ed8";
    const GRAY = "#64748b";

    // Cabecera
    doc.rect(50, 40, 495, 70).fill("#1a4a7a");
    doc.fillColor("#fff").fontSize(20).font("Helvetica-Bold")
      .text("RENACED — Reporte Estadístico", 50, 55, { width: 495, align: "center" });
    doc.fontSize(11).font("Helvetica")
      .text(
        nombreClinica ? `${nombreClinica} — México` : "Registro Nacional de Diabetes Tipo 1 — México",
        50, 82, { width: 495, align: "center" }
      );
    doc.moveDown(0.5);

    doc.fillColor(GRAY).fontSize(10)
      .text(`Generado el ${fechaLarga}`, { align: "center" });
    doc.moveDown(1.5);

    const seccion = (titulo) => {
      doc.fillColor(BLUE).fontSize(13).font("Helvetica-Bold").text(titulo);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(LINE).stroke();
      doc.moveDown(0.4);
      doc.fillColor("#000").fontSize(11).font("Helvetica");
    };

    const fila = (label, value) => {
      doc.text(`  ${label}:`, { continued: true, width: 260 });
      doc.text(String(value ?? "—"), { align: "left" });
    };

    const pct = (n, d) =>
      d > 0 ? `${n ?? 0}  (${(((n ?? 0) / d) * 100).toFixed(1)}%)` : `${n ?? 0}`;

    // 1. Totales
    seccion("1. Totales generales");
    fila("Total de pacientes registrados", totales.total);
    fila("Pacientes activos",              totales.activos);
    fila("Mujeres",                        pct(totales.mujeres, totales.total));
    fila("Hombres",                        pct(totales.hombres, totales.total));
    fila("Edad promedio",                  totales.edad_promedio ? `${totales.edad_promedio} años` : "—");
    doc.moveDown(1);

    // 2. Tipo de diabetes
    seccion("2. Distribución por tipo de diabetes");
    for (const tp of por_tipo) {
      fila(tp.tipo, pct(tp.total, totales.total));
    }
    doc.moveDown(1);

    // 3. Control glucémico
    seccion("3. Control glucémico — HbA1c (último resultado por paciente)");
    fila("Pacientes con dato de HbA1c", hba.con_dato);
    fila("HbA1c promedio",              hba.promedio ? `${hba.promedio}%` : "—");
    fila("Óptimo (< 7%)",               pct(hba.optimo, hba.con_dato));
    fila("Moderado (7–9%)",             pct(hba.moderado, hba.con_dato));
    fila("Alto (> 9%)",                 pct(hba.alto, hba.con_dato));
    doc.moveDown(1);

    // 4. Complicaciones
    if (comp.total_evaluados > 0) {
      seccion("4. Complicaciones crónicas (pacientes con evaluación registrada)");
      fila("Pacientes evaluados",   comp.total_evaluados);
      fila("Con retinopatía",       pct(comp.con_retinopatia,   comp.total_evaluados));
      fila("Con nefropatía",        pct(comp.con_nefropatia,    comp.total_evaluados));
      fila("Con neuropatía",        pct(comp.con_neuropatia,    comp.total_evaluados));
      fila("Con pie diabético",     pct(comp.con_pie_diabetico, comp.total_evaluados));
      fila("Con enf. cardiovascular", pct(comp.con_cardiovascular, comp.total_evaluados));
      doc.moveDown(1);
    }

    // Pie de página
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(LINE).stroke();
    doc.moveDown(0.4);
    doc.fillColor(GRAY).fontSize(9)
      .text("Documento generado automáticamente por el sistema RENACED México.", { align: "center" });
    doc.text("Para uso oficial de la ALAD — Asociación Latinoamericana de Diabetes.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar PDF" });
  }
}

// ── PDF (reporte estadístico para la ALAD) ───────────────────────────────────
// Sin unidad_id explícito: admin ve el país completo, cualquier otro perfil
// queda forzado a su propia clínica (igual que en los demás reportes).
export const exportarPDF = async (req, res) => {
  const unidadId = req.alcance.esAdmin ? null : req.alcance.unidadId;
  let nombreClinica = null;
  if (unidadId) {
    const [[clinica]] = await req.db.query("SELECT nombre FROM unidad_servicio_salud WHERE id = ?", [unidadId]);
    nombreClinica = clinica?.nombre || null;
  }
  await generarReportePDF(req, res, { unidadId, nombreClinica });
};

// ── Reporte por clínica ───────────────────────────────────────────────────────
// GET /renaced/reportes/clinica/:unidad_id — el investigador solo puede pedir
// el de su propia clínica (403 si intenta otra); el admin de país puede pedir
// el de cualquiera, y el nombre de la clínica aparece en el encabezado.
export const exportarReporteClinica = async (req, res) => {
  try {
    const unidadId = Number(req.params.unidad_id);
    if (!Number.isInteger(unidadId) || unidadId <= 0) {
      return res.status(400).json({ error: "unidad_id inválido" });
    }
    if (!req.alcance.esAdmin && unidadId !== req.alcance.unidadId) {
      return res.status(403).json({ error: "No tienes acceso al reporte de otra clínica" });
    }

    const [[clinica]] = await req.db.query(
      "SELECT id, nombre FROM unidad_servicio_salud WHERE id = ?", [unidadId]
    );
    if (!clinica) return res.status(404).json({ error: "Clínica no encontrada" });

    await generarReportePDF(req, res, { unidadId, nombreClinica: clinica.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar el reporte de la clínica" });
  }
};
