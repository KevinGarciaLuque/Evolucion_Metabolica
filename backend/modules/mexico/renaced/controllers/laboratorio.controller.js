import fs from "fs";
import { LAB_COLS } from "../services/hojaConsulta.js";
import { parsearPDFLaboratorio } from "../services/pdfLaboratorioRenaced.js";

const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** Lee un PDF de examen y devuelve los valores para rellenar el formulario (no guarda nada). */
export const escanearExamen = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });
  try {
    const [pac] = await req.db.query(
      "SELECT nombre, ap_pat, ap_mat FROM paciente WHERE id = ?", [req.params.paciente_id]
    );
    if (!pac.length) return res.status(404).json({ error: "Paciente no encontrado" });

    const r = await parsearPDFLaboratorio(req.file.path);

    // Aviso si el nombre del PDF no coincide con el del paciente
    if (r.nombre_pdf) {
      const enPdf = sinAcentos(r.nombre_pdf);
      const partes = sinAcentos([pac[0].nombre, pac[0].ap_pat, pac[0].ap_mat].filter(Boolean).join(" "))
        .split(/\s+/).filter((p) => p.length > 2);
      const coinciden = partes.filter((p) => enPdf.includes(p)).length;
      if (partes.length && coinciden < Math.min(2, partes.length)) {
        r.avisos.unshift(`El nombre del examen (${r.nombre_pdf}) no coincide con el del paciente. Verifica que sea el PDF correcto.`);
        r.nombre_distinto = true;
      }
    }
    res.json({ ...r, archivo: req.file.filename });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error("Error al escanear examen:", err);
    res.status(err.code === "FORMATO_NO_RECONOCIDO" ? 422 : 500).json({ error: err.message || "Error al procesar el PDF" });
  }
};

export const getLaboratoriosByPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const [rows] = await req.db.query(
      `SELECT * FROM laboratorio WHERE paciente_id = ? ORDER BY fecha_muestra DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener laboratorios" });
  }
};

export const createLaboratorio = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const b = req.body;
    const v = (x) => (x === "" || x === undefined ? null : x);
    const cols = ["paciente_id", "consulta_id", "fecha_muestra", ...LAB_COLS, "usuario_id"];
    const vals = [
      paciente_id, v(b.consulta_id), b.fecha_muestra,
      ...LAB_COLS.map((c) => v(b[c])), req.usuario?.id || null,
    ];
    const [result] = await req.db.query(
      `INSERT INTO laboratorio (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, vals
    );
    res.status(201).json({ id: result.insertId, message: "Laboratorio registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar laboratorio" });
  }
};
