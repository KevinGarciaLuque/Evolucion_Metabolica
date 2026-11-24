// Documentos clínicos del paciente (notas de evolución, recetas…).
// POST /escanear  → lee la nota/receta (rellena la consulta, sin guardar nada del expediente) y conserva el PDF.
// POST /          → sube un PDF cualquiera sin leerlo.
// GET  /          → lista · GET /:id/archivo → abre el PDF (con sesión) · DELETE /:id → lo elimina.
// El archivo NO se sirve por /uploads (datos clínicos): solo por esta API, tras validar la clínica del paciente.
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { UPLOADS_PATH } from "../../../../shared/paths.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";
import { verificarModuloVigente } from "../middlewares/verificarModulo.js";
import { parsearNotaEvolucion, TIPOS_DOCUMENTO } from "../services/pdfNotaEvolucionRenaced.js";
import { nombreNoCoincide } from "../services/resultadosLab.js";

const DIR = path.join(UPLOADS_PATH, "renaced_documentos");
fs.mkdirSync(DIR, { recursive: true });

const nombreOriginal = (f) => Buffer.from(f.originalname, "latin1").toString("utf8").normalize("NFC");
const upload = multer({
  dest: path.join(os.tmpdir(), "renaced_documentos"),
  fileFilter: (_req, file, cb) => (file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Solo se permiten archivos PDF"))),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.use(async (req, _res, next) => {
  try { await asegurarEsquema(req.db, req.usuario?.db_name || "mx"); next(); } catch (e) { next(e); }
});

/** Guarda el PDF en disco y su fila. Si el mismo archivo ya estaba guardado para el paciente, no lo duplica. */
async function conservar(req, { tipo, titulo, fecha }) {
  const buf = fs.readFileSync(req.file.path);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  const [[previo]] = await req.db.query("SELECT id FROM paciente_documento WHERE paciente_id = ? AND hash_sha256 = ? LIMIT 1", [req.params.paciente_id, hash]);
  if (previo) return { id: previo.id, duplicado: true };
  const limpio = nombreOriginal(req.file).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_");
  const archivo = `${Date.now()}-${limpio}`;
  fs.writeFileSync(path.join(DIR, archivo), buf);
  const [r] = await req.db.query(
    `INSERT INTO paciente_documento (paciente_id, tipo, titulo, fecha_documento, archivo, nombre_original, tamano, hash_sha256, usuario_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [req.params.paciente_id, tipo, titulo || null, fecha || null, archivo, nombreOriginal(req.file), buf.length, hash, req.usuario?.id ?? null]
  );
  return { id: r.insertId, duplicado: false };
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await req.db.query(
      `SELECT id, tipo, titulo, fecha_documento, nombre_original, tamano, creado_en
       FROM paciente_documento WHERE paciente_id = ? ORDER BY COALESCE(fecha_documento, DATE(creado_en)) DESC, id DESC`, [req.params.paciente_id]);
    res.json(rows.map((d) => ({ ...d, tipo_nombre: TIPOS_DOCUMENTO[d.tipo] || "Otro" })));
  } catch (err) { console.error(err); res.status(500).json({ error: "Error al listar los documentos" }); }
});

router.post("/escanear", verificarModuloVigente("importar_pdf"), upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });
  try {
    const r = await parsearNotaEvolucion(req.file.path);
    const [[pac]] = await req.db.query("SELECT nombre, ap_pat, ap_mat FROM paciente WHERE id = ?", [req.params.paciente_id]);
    if (pac && nombreNoCoincide(pac, r.cabecera)) {
      r.avisos.unshift("El nombre del PDF no coincide con el del paciente. Verifica que sea el PDF correcto antes de guardar.");
      r.nombre_distinto = true;
    }
    // Un PDF de otro paciente no se archiva en este expediente
    if (!r.nombre_distinto) {
      const d = await conservar(req, { tipo: r.tipo_documento, titulo: r.titulo, fecha: r.fecha_consulta });
      r.documento = { id: d.id, duplicado: d.duplicado };
    }
    delete r.cabecera;
    res.json(r);
  } catch (err) {
    console.error("Error al leer la nota de evolución:", err);
    res.status(err.code === "FORMATO_NO_RECONOCIDO" ? 422 : 500).json({ error: err.message || "Error al procesar el PDF" });
  } finally { fs.unlink(req.file.path, () => {}); }
});

router.post("/", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo PDF" });
  try {
    const tipo = TIPOS_DOCUMENTO[req.body?.tipo] ? req.body.tipo : "otro";
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.fecha || "") ? req.body.fecha : null;
    const titulo = (req.body?.titulo || "").slice(0, 200) || nombreOriginal(req.file).replace(/\.pdf$/i, "");
    const d = await conservar(req, { tipo, titulo, fecha });
    res.status(d.duplicado ? 200 : 201).json(d);
  } catch (err) { console.error(err); res.status(500).json({ error: "No se pudo guardar el documento" }); }
  finally { fs.unlink(req.file.path, () => {}); }
});

async function buscar(req) {
  const [[d]] = await req.db.query("SELECT * FROM paciente_documento WHERE id = ? AND paciente_id = ?", [req.params.id, req.params.paciente_id]);
  return d;
}

router.get("/:id(\\d+)/archivo", async (req, res) => {
  try {
    const d = await buscar(req);
    const ruta = d && path.join(DIR, path.basename(d.archivo));
    if (!d || !fs.existsSync(ruta)) return res.status(404).json({ error: "El archivo no está disponible" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(d.nombre_original || d.archivo)}`);
    res.sendFile(ruta);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error al abrir el archivo" }); }
});

router.delete("/:id(\\d+)", async (req, res) => {
  try {
    const d = await buscar(req);
    if (!d) return res.status(404).json({ error: "Documento no encontrado" });
    await req.db.query("DELETE FROM paciente_documento WHERE id = ?", [d.id]);
    fs.unlink(path.join(DIR, path.basename(d.archivo)), () => {});
    res.json({ mensaje: "Documento eliminado" });
  } catch (err) { console.error(err); res.status(500).json({ error: "No se pudo eliminar el documento" }); }
});

export default router;
