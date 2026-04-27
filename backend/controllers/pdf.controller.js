import path from "path";
import { fileURLToPath } from "url";
import { parsearPDFSyai } from "../services/pdfParser.js";
import { clasificarISPAD } from "../utils/helpers.js";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recibe un PDF del monitor Syai X1, extrae los datos automáticamente y
 * guarda el análisis en la base de datos.
 */
export async function subirYParsear(req, res) {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });

  const pacienteId = req.params.pacienteId;
  const rutaArchivo = req.file.path;
  const nombreArchivo = req.file.filename;

  try {
    // Verificar que el paciente existe
    const [pacientes] = await pool.query("SELECT id FROM pacientes WHERE id = ?", [pacienteId]);
    if (pacientes.length === 0) return res.status(404).json({ error: "Paciente no encontrado" });

    // Parsear el PDF
    const datos = await parsearPDFSyai(rutaArchivo);

    // Calcular clasificación ISPAD
    const clasificacion = clasificarISPAD(
      datos.tir || 0,
      datos.tar || 0,
      datos.tbr || 0,
      datos.gmi
    );

    res.json({
      archivo: nombreArchivo,
      datos: { ...datos, clasificacion },
      mensaje: "PDF procesado correctamente. Revisa los datos y confirma para guardar.",
    });
  } catch (err) {
    console.error("Error al parsear PDF:", err);
    res.status(500).json({ error: "Error al procesar el PDF", detalle: err.message });
  }
}

/**
 * Confirma y guarda el análisis después de que el médico revise los datos extraídos.
 */
export async function confirmarAnalisis(req, res) {
  const {
    paciente_id, fecha, tir, tar, tar_muy_alto, tar_alto, tbr, tbr_bajo, tbr_muy_bajo,
    gmi, cv, tiempo_activo, glucosa_promedio, gri,
    eventos_hipoglucemia, duracion_hipoglucemia, archivo_pdf,
  } = req.body;

  if (!paciente_id || !fecha)
    return res.status(400).json({ error: "Paciente y fecha son obligatorios" });

  const clasificacion = clasificarISPAD(
    parseFloat(tir) || 0,
    parseFloat(tar) || 0,
    parseFloat(tbr) || 0,
    gmi ? parseFloat(gmi) : null
  );

  try {
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM analisis WHERE paciente_id = ?",
      [paciente_id]
    );
    const numero_registro = total + 1;

    const [result] = await pool.query(
      `INSERT INTO analisis
        (paciente_id, numero_registro, fecha, tir, tar, tar_muy_alto, tar_alto, tbr, tbr_bajo, tbr_muy_bajo,
         gmi, cv, tiempo_activo, glucosa_promedio, gri,
         eventos_hipoglucemia, duracion_hipoglucemia, clasificacion, archivo_pdf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id, numero_registro, fecha, tir, tar,
        tar_muy_alto ?? null, tar_alto ?? null,
        tbr, tbr_bajo ?? null, tbr_muy_bajo ?? null,
        gmi, cv, tiempo_activo, glucosa_promedio, gri,
        eventos_hipoglucemia, duracion_hipoglucemia, clasificacion, archivo_pdf,
      ]
    );

    await pool.query(
      "INSERT INTO historial_resumen (paciente_id, fecha, tir, gmi, cv) VALUES (?, ?, ?, ?, ?)",
      [paciente_id, fecha, tir, gmi, cv]
    );

    res.status(201).json({ id: result.insertId, clasificacion, mensaje: "Análisis guardado exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar el análisis" });
  }
}
