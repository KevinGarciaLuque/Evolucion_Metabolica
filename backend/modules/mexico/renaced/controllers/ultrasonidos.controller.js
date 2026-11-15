import fs from "fs";
import path from "path";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";
import { parsearPDFUltrasonido } from "../services/pdfUltrasonidoRenaced.js";
import { nombreNoCoincide } from "../services/resultadosLab.js";
import { UPLOADS_PATH } from "../../../../shared/paths.js";

const CAMPOS = ["fecha_estudio", "estudio", "sucursal", "ultrasonografista", "indicacion", "tecnica", "hallazgos", "conclusion", "sugerencia"];
const v = (x) => (x === "" || x === undefined ? null : x);

/** Lee el PDF de un ultrasonido y devuelve el texto del informe (no guarda nada). */
export const escanearUltrasonido = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });
  try {
    const [pac] = await req.db.query("SELECT nombre, ap_pat, ap_mat FROM paciente WHERE id = ?", [req.params.paciente_id]);
    if (!pac.length) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: "Paciente no encontrado" }); }
    const r = await parsearPDFUltrasonido(req.file.path);
    const avisos = [];
    if (nombreNoCoincide(pac[0], r.cabecera)) avisos.push("El nombre del paciente no aparece en el encabezado del estudio. Verifica que sea el PDF correcto.");
    if (!r.fecha_estudio) avisos.push("No se encontró la fecha del estudio: captúrala a mano.");
    if (!r.conclusion) avisos.push("No se encontró la conclusión: revísala en el PDF.");
    delete r.cabecera;
    res.json({ ...r, avisos, archivo: req.file.filename });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error("Error al escanear ultrasonido:", err);
    res.status(err.code === "FORMATO_NO_RECONOCIDO" ? 422 : 500).json({ error: err.message || "Error al procesar el PDF" });
  }
};

export const getUltrasonidos = async (req, res) => {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const [rows] = await req.db.query(
      "SELECT * FROM ultrasonido WHERE paciente_id = ? ORDER BY fecha_estudio DESC, id DESC", [req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los ultrasonidos" });
  }
};

export const createUltrasonido = async (req, res) => {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const b = req.body || {};
    if (!b.fecha_estudio) return res.status(400).json({ error: "La fecha del estudio es obligatoria" });
    // El nombre de archivo viene del escaneo; solo se acepta un nombre simple (sin rutas)
    const archivo = b.archivo_pdf && path.basename(String(b.archivo_pdf)) === String(b.archivo_pdf) ? b.archivo_pdf : null;
    const [r] = await req.db.query(
      `INSERT INTO ultrasonido (paciente_id, ${CAMPOS.join(",")}, archivo_pdf, usuario_id)
       VALUES (?, ${CAMPOS.map(() => "?").join(",")}, ?, ?)`,
      [req.params.paciente_id, ...CAMPOS.map((c) => v(b[c])), archivo, req.usuario?.id || null]
    );
    res.status(201).json({ id: r.insertId, message: "Ultrasonido registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar el ultrasonido" });
  }
};

export const deleteUltrasonido = async (req, res) => {
  try {
    const [[u]] = await req.db.query("SELECT archivo_pdf FROM ultrasonido WHERE id = ? AND paciente_id = ?", [req.params.id, req.params.paciente_id]);
    if (!u) return res.status(404).json({ error: "Ultrasonido no encontrado" });
    await req.db.query("DELETE FROM ultrasonido WHERE id = ? AND paciente_id = ?", [req.params.id, req.params.paciente_id]);
    if (u.archivo_pdf) fs.unlink(path.join(UPLOADS_PATH, "renaced_ultrasonidos", path.basename(u.archivo_pdf)), () => {});
    res.json({ message: "Ultrasonido eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el ultrasonido" });
  }
};
