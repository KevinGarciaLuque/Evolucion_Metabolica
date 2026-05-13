import XLSX from "xlsx";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, "../uploads");

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function safeFileName(value) {
  return String(value || "sin_nombre")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

async function obtenerDatosPaciente(pacienteId) {
  const [[paciente]] = await pool.query("SELECT * FROM pacientes WHERE id = ? AND estado = 1", [pacienteId]);
  if (!paciente) return null;

  const [consultas] = await pool.query(
    "SELECT * FROM consultas WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
    [pacienteId]
  );
  const [analisis] = await pool.query(
    "SELECT * FROM analisis WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
    [pacienteId]
  );
  const [insulina] = await pool.query(
    "SELECT * FROM historial_insulina WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
    [pacienteId]
  );
  const [alimentacion] = await pool.query(
    "SELECT * FROM planes_alimentacion WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
    [pacienteId]
  );
  const [anticuerpos] = await pool.query(
    "SELECT * FROM historial_anticuerpos WHERE paciente_id = ? ORDER BY fecha DESC, id DESC",
    [pacienteId]
  );

  return { paciente, consultas, analisis, insulina, alimentacion, anticuerpos };
}

function crearExcelBuffer(data) {
  const wb = XLSX.utils.book_new();
  const { paciente, consultas, analisis, insulina, alimentacion, anticuerpos } = data;

  const pacienteSheet = XLSX.utils.json_to_sheet([paciente]);
  XLSX.utils.book_append_sheet(wb, pacienteSheet, "Paciente");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consultas), "Consultas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analisis), "Analisis");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insulina), "Insulina");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alimentacion), "Alimentacion");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(anticuerpos), "Anticuerpos");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function crearPdfBuffer(data) {
  const { paciente, consultas, analisis, insulina, alimentacion, anticuerpos } = data;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Reporte Clinico de Paciente", { align: "center" });
    doc.moveDown(0.6);
    doc.fontSize(10).text(`Generado: ${formatDate(new Date())}`, { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text("Datos generales", { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10);
    doc.text(`Nombre: ${paciente.nombre || ""}`);
    doc.text(`DNI: ${paciente.dni || ""}`);
    doc.text(`Sexo: ${paciente.sexo || ""}`);
    doc.text(`Edad: ${paciente.edad ?? ""}`);
    doc.text(`Fecha nacimiento: ${formatDate(paciente.fecha_nacimiento)}`);
    doc.text(`Departamento/Municipio: ${paciente.departamento || ""} / ${paciente.municipio || ""}`);
    doc.text(`Tipo de diabetes: ${paciente.tipo_diabetes || ""}`);
    doc.moveDown();

    const resumen = [
      ["Consultas", consultas.length],
      ["Analisis MCG", analisis.length],
      ["Historial Insulina", insulina.length],
      ["Planes alimentacion", alimentacion.length],
      ["Anticuerpos", anticuerpos.length],
    ];

    doc.fontSize(12).text("Resumen de registros", { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10);
    resumen.forEach(([label, total]) => doc.text(`${label}: ${total}`));
    doc.moveDown();

    if (consultas[0]) {
      const c = consultas[0];
      doc.fontSize(12).text("Ultima consulta", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10);
      doc.text(`Fecha: ${formatDate(c.fecha)}`);
      doc.text(`HbA1c: ${c.hba1c ?? ""}`);
      doc.text(`Peso/Talla: ${c.peso ?? ""} / ${c.talla ?? ""}`);
      doc.text(`Plan: ${c.plan_tratamiento || ""}`);
      doc.moveDown();
    }

    if (analisis[0]) {
      const a = analisis[0];
      doc.fontSize(12).text("Ultimo analisis MCG", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10);
      doc.text(`Fecha: ${formatDate(a.fecha)}`);
      doc.text(`TIR: ${a.tir ?? ""}`);
      doc.text(`TAR: ${a.tar ?? ""}`);
      doc.text(`TBR: ${a.tbr ?? ""}`);
      doc.text(`GMI: ${a.gmi ?? ""}`);
      doc.text(`Clasificacion: ${a.clasificacion || ""}`);
    }

    doc.end();
  });
}

export async function exportarPacienteExcel(req, res) {
  try {
    const data = await obtenerDatosPaciente(req.params.id);
    if (!data) return res.status(404).json({ error: "Paciente no encontrado" });
    const buffer = crearExcelBuffer(data);
    const base = `paciente_${data.paciente.id}_${safeFileName(data.paciente.nombre)}`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${base}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al exportar Excel" });
  }
}

export async function exportarPacientePdf(req, res) {
  try {
    const data = await obtenerDatosPaciente(req.params.id);
    if (!data) return res.status(404).json({ error: "Paciente no encontrado" });

    const [backupsPdf] = await pool.query(
      `SELECT id, fecha, archivo_pdf
       FROM analisis
       WHERE paciente_id = ? AND archivo_pdf IS NOT NULL AND archivo_pdf <> ''
       ORDER BY fecha DESC, id DESC`,
      [req.params.id]
    );

    if (!backupsPdf.length) {
      return res.status(404).json({ error: "Este paciente no tiene archivos PDF analizados" });
    }

    const base = `paciente_${data.paciente.id}_${safeFileName(data.paciente.nombre)}_pdfs`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${base}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => { throw err; });
    archive.pipe(res);

    for (const rep of backupsPdf) {
      const original = String(rep.archivo_pdf).trim();
      const filePath = path.join(uploadsPath, "pdfs", original);
      if (!fs.existsSync(filePath)) continue;

      const safeOriginal = safeFileName(path.parse(original).name) || `reporte_${rep.id}`;
      const dated = formatDate(rep.fecha) || "sin_fecha";
      const zipName = `${safeOriginal}_${dated}.pdf`;
      archive.file(filePath, { name: zipName });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Error al exportar ZIP de PDFs" });
  }
}

export async function exportarTodosZip(req, res) {
  const format = req.query.format || "both";
  const institucion = (req.query.institucion || "").trim();
  if (!["excel", "pdf", "both"].includes(format)) {
    return res.status(400).json({ error: "Formato invalido. Use excel, pdf o both" });
  }

  try {
    let sql = "SELECT id, nombre FROM pacientes WHERE estado = 1";
    const params = [];
    if (institucion) {
      sql += " AND institucion = ?";
      params.push(institucion);
    }
    sql += " ORDER BY nombre ASC";
    const [pacientes] = await pool.query(sql, params);
    const fecha = formatDate(new Date());

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="backup_pacientes_${fecha}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    for (const paciente of pacientes) {
      const data = await obtenerDatosPaciente(paciente.id);
      if (!data) continue;
      const folder = `Paciente_${data.paciente.id}_${safeFileName(data.paciente.nombre)}`;
      if (format === "excel" || format === "both") {
        archive.append(crearExcelBuffer(data), { name: `${folder}/datos.xlsx` });
      }
      if (format === "pdf" || format === "both") {
        archive.append(await crearPdfBuffer(data), { name: `${folder}/resumen.pdf` });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Error al exportar backup masivo" });
  }
}
