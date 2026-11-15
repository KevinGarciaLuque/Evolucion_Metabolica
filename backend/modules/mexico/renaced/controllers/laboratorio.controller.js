import fs from "fs";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";
import { LAB_COLS } from "../services/hojaConsulta.js";
import { parsearPDFLaboratorio } from "../services/pdfLaboratorioRenaced.js";
import { LABORATORIOS } from "../services/laboratoriosMx.js";
import { guardarResultadosExtra, nombreNoCoincide } from "../services/resultadosLab.js";

/** Laboratorios que se reconocen (para el selector manual del escaneo). */
export const getLaboratoriosSoportados = (_req, res) => {
  res.json(LABORATORIOS.map((l) => ({ clave: l.clave, nombre: l.nombre })));
};

/** Lee un PDF de examen y devuelve los valores para rellenar el formulario (no guarda nada). */
export const escanearExamen = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });
  try {
    const [pac] = await req.db.query(
      "SELECT nombre, ap_pat, ap_mat FROM paciente WHERE id = ?", [req.params.paciente_id]
    );
    if (!pac.length) return res.status(404).json({ error: "Paciente no encontrado" });

    // ?laboratorio=clave fuerza el formato; si falta, se detecta solo
    const r = await parsearPDFLaboratorio(req.file.path, req.query.laboratorio || undefined);

    // Aviso si el nombre del paciente no aparece en el encabezado del PDF
    if (nombreNoCoincide(pac[0], r.cabecera)) {
      r.avisos.unshift("El nombre del paciente no aparece en el encabezado del examen. Verifica que sea el PDF correcto.");
      r.nombre_distinto = true;
    }
    delete r.cabecera;
    res.json({ ...r, archivo: req.file.filename });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error("Error al escanear examen:", err);
    res.status(err.code === "FORMATO_NO_RECONOCIDO" ? 422 : 500).json({ error: err.message || "Error al procesar el PDF" });
  }
};

export const getLaboratoriosByPaciente = async (req, res) => {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const { paciente_id } = req.params;
    const [rows] = await req.db.query(
      `SELECT l.*, (SELECT COUNT(*) FROM laboratorio_resultado r WHERE r.laboratorio_id = l.id) AS n_otros
       FROM laboratorio l WHERE l.paciente_id = ? ORDER BY l.fecha_muestra DESC`,
      [paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener laboratorios" });
  }
};

/** Resto de los resultados de un examen (los que no tienen columna en `laboratorio`). */
export const getResultadosExtra = async (req, res) => {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const [rows] = await req.db.query(
      `SELECT id, nombre, valor, signo, unidad, referencia, origen, laboratorio_origen
       FROM laboratorio_resultado WHERE laboratorio_id = ? AND paciente_id = ? ORDER BY id`,
      [req.params.id, req.params.paciente_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los resultados" });
  }
};

export const createLaboratorio = async (req, res) => {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
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
    await guardarResultadosExtra(req.db, {
      laboratorioId: result.insertId, pacienteId: paciente_id, fecha: b.fecha_muestra,
      origen: b.laboratorio_origen, otros: b.otros_resultados,
    });
    res.status(201).json({ id: result.insertId, message: "Laboratorio registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar laboratorio" });
  }
};
