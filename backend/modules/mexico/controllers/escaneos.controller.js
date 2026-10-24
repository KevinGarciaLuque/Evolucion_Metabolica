import { parsearPDFRenaced } from "../../services/pdfParserRenaced.js";
import { clasificarISPAD } from "../../utils/helpers.js";

// Columnas persistidas en escaneo_mcg (además de id, paciente_id, numero_registro,
// clasificacion y creado_en que se calculan aparte).
const COLS = [
  "fecha", "monitor", "periodo_dias", "periodo_tipo", "fecha_inicio", "fecha_fin",
  "glucosa_promedio", "gmi", "cv", "desv_std", "tiempo_activo", "escaneos_dia",
  "tir", "tar", "tar_muy_alto", "tar_alto", "tbr", "tbr_bajo", "tbr_muy_bajo",
  "gri", "eventos_hipoglucemia", "duracion_hipoglucemia",
  "archivo_pdf", "texto_extraido", "comentarios",
];

const limpiar = (v) => (v === "" || v === undefined ? null : v);

/**
 * Sube un PDF de monitoreo continuo de glucosa, lo parsea y devuelve los datos
 * extraídos para que el médico los revise antes de guardar.
 */
export async function subirYParsear(req, res) {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });

  const pacienteId = req.params.pacienteId;

  try {
    const [pac] = await req.db.query("SELECT id FROM paciente WHERE id = ?", [pacienteId]);
    if (pac.length === 0) return res.status(404).json({ error: "Paciente no encontrado" });

    const datos = await parsearPDFRenaced(req.file.path);

    const clasificacion = clasificarISPAD(
      datos.tir || 0,
      datos.tar || 0,
      datos.tbr || 0,
      datos.gmi
    );

    res.json({
      archivo: req.file.filename,
      datos: { ...datos, clasificacion },
      mensaje: "PDF procesado. Revisa los datos y confirma para guardar.",
    });
  } catch (err) {
    console.error("Error al parsear PDF RENACED:", err);
    const status = err.code === "FORMATO_NO_RECONOCIDO" ? 422 : 500;
    res.status(status).json({ error: err.message || "Error al procesar el PDF" });
  }
}

/**
 * Guarda el escaneo revisado por el médico como un registro en escaneo_mcg.
 */
export async function confirmarEscaneo(req, res) {
  const b = req.body;
  const paciente_id = b.paciente_id;
  if (!paciente_id || !b.fecha)
    return res.status(400).json({ error: "Paciente y fecha son obligatorios" });

  const clasificacion = clasificarISPAD(
    parseFloat(b.tir) || 0,
    parseFloat(b.tar) || 0,
    parseFloat(b.tbr) || 0,
    b.gmi ? parseFloat(b.gmi) : null
  );

  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    const [[{ nextId }]] = await conn.query(
      "SELECT COALESCE(MAX(id),0)+1 AS nextId FROM escaneo_mcg"
    );
    const [[{ nreg }]] = await conn.query(
      "SELECT COALESCE(MAX(numero_registro),0)+1 AS nreg FROM escaneo_mcg WHERE paciente_id = ?",
      [paciente_id]
    );

    const cols = ["id", "paciente_id", "numero_registro", "clasificacion"];
    const ph = ["?", "?", "?", "?"];
    const vals = [nextId, paciente_id, nreg, clasificacion];

    for (const c of COLS) {
      if (c in b) { cols.push(c); ph.push("?"); vals.push(limpiar(b[c])); }
    }

    await conn.query(
      `INSERT INTO escaneo_mcg (${cols.join(",")}) VALUES (${ph.join(",")})`,
      vals
    );
    await conn.commit();

    res.status(201).json({ id: nextId, numero_registro: nreg, clasificacion, mensaje: "Escaneo guardado" });
  } catch (err) {
    await conn.rollback();
    console.error("Error al guardar escaneo RENACED:", err);
    res.status(500).json({ error: "Error al guardar el escaneo" });
  } finally {
    conn.release();
  }
}

/** Lista los escaneos de un paciente, más reciente primero. */
export async function getEscaneosByPaciente(req, res) {
  try {
    const [rows] = await req.db.query(
      `SELECT id, paciente_id, numero_registro, fecha, monitor, periodo_dias, periodo_tipo,
              fecha_inicio, fecha_fin, glucosa_promedio, gmi, cv, tiempo_activo, escaneos_dia,
              tir, tar, tar_muy_alto, tar_alto, tbr, tbr_bajo, tbr_muy_bajo, gri,
              eventos_hipoglucemia, duracion_hipoglucemia, clasificacion, archivo_pdf,
              comentarios, creado_en
       FROM escaneo_mcg WHERE paciente_id = ?
       ORDER BY fecha DESC, id DESC`,
      [req.params.pacienteId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener escaneos" });
  }
}

/** Elimina un escaneo. */
export async function deleteEscaneo(req, res) {
  try {
    await req.db.query("DELETE FROM escaneo_mcg WHERE id = ?", [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el escaneo" });
  }
}
