// Aviso de privacidad y consentimiento informado firmados de cada paciente (PDF o imagen).
//
// Se guardan en uploads/renaced_consentimientos/ y la columna de la ficha (aviso_ruta /
// consentimiento_ruta) conserva la ruta del sistema anterior ("../../docs/subidas/NOMBRE.pdf")
// o solo el nombre del archivo si se subió desde aquí: en ambos casos el archivo es el último
// segmento de la ruta. Los archivos NO se sirven por /uploads (contienen datos personales):
// se entregan por un endpoint con sesión y validación de clínica.
import path from "path";
import fs from "fs";
import { UPLOADS_PATH, HAY_VOLUMEN } from "../../../../shared/paths.js";
import { asegurarEsquema } from "../utils/asegurarEsquema.js";

export const DIR_CONSENTIMIENTOS = path.join(UPLOADS_PATH, "renaced_consentimientos");
fs.mkdirSync(DIR_CONSENTIMIENTOS, { recursive: true });

const TIPOS = {
  aviso:         { ruta: "aviso_ruta",         flag: "tiene_aviso_privacidad", nombre: "Aviso de privacidad" },
  consentimiento: { ruta: "consentimiento_ruta", flag: "tiene_consentimiento",   nombre: "Consentimiento informado" },
};

// Último segmento de la ruta, en NFC (el sistema anterior mezcla formas de acentos).
// El sistema anterior dejó el TEXTO "NULL" (no un nulo real) en las fichas sin documento: se trata como vacío.
const nombreArchivo = (ruta) => {
  const limpio = String(ruta ?? "").trim();
  if (!limpio || limpio.toUpperCase() === "NULL") return null;
  return path.basename(limpio.replace(/\\/g, "/")).normalize("NFC");
};

const rutaFisica = (nombre) => path.join(DIR_CONSENTIMIENTOS, nombre);

/** Estado de los dos documentos del paciente. */
export async function listarConsentimientos(req, res) {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const [[p]] = await req.db.query(
      `SELECT aviso_ruta, consentimiento_ruta, tiene_aviso_privacidad, tiene_consentimiento
       FROM paciente WHERE id = ?`, [req.params.paciente_id]
    );
    if (!p) return res.status(404).json({ error: "Paciente no encontrado" });

    const out = {};
    for (const [tipo, t] of Object.entries(TIPOS)) {
      const archivo = nombreArchivo(p[t.ruta]);
      out[tipo] = {
        nombre: t.nombre,
        firmado: !!p[t.flag],
        archivo,
        disponible: !!archivo && fs.existsSync(rutaFisica(archivo)),
      };
    }
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los consentimientos" });
  }
}

/** Entrega el archivo (solo con sesión y acceso al paciente, validado antes en index.js). */
export async function verConsentimiento(req, res) {
  const t = TIPOS[req.params.tipo];
  if (!t) return res.status(400).json({ error: "Tipo no válido" });
  try {
    const [[p]] = await req.db.query(`SELECT ${t.ruta} AS ruta FROM paciente WHERE id = ?`, [req.params.paciente_id]);
    const archivo = nombreArchivo(p?.ruta);
    if (!archivo || !fs.existsSync(rutaFisica(archivo))) {
      return res.status(404).json({ error: "El archivo no está disponible" });
    }
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(archivo)}`);
    res.sendFile(rutaFisica(archivo));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al abrir el archivo" });
  }
}

/** Sube o reemplaza el aviso / consentimiento del paciente. El archivo anterior se conserva en disco. */
export async function subirConsentimiento(req, res) {
  const t = TIPOS[req.params.tipo];
  if (!t) return res.status(400).json({ error: "Tipo no válido" });
  if (!req.file) return res.status(400).json({ error: "No se adjuntó ningún archivo" });
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    await req.db.query(
      `UPDATE paciente SET ${t.ruta} = ?, ${t.flag} = 1 WHERE id = ?`,
      [req.file.filename, req.params.paciente_id]
    );
    res.status(201).json({ archivo: req.file.filename, mensaje: `${t.nombre} guardado` });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error(err);
    res.status(500).json({ error: "Error al guardar el archivo" });
  }
}

/**
 * Carga masiva de los archivos del sistema anterior (solo administrador; se valida en la ruta antes de escribir).
 * Conservan su nombre original (normalizado a NFC) porque la ficha del paciente ya los referencia.
 */
export function importarArchivos(req, res) {
  const guardados = (req.files || []).map((f) => f.filename);
  res.status(201).json({ guardados: guardados.length, archivos: guardados });
}

/**
 * Resumen para la carga masiva: nombres de archivo referenciados por las fichas de los pacientes
 * y cuáles ya están en el servidor. El navegador lo usa para subir solo los que faltan.
 */
export async function pendientesImportar(req, res) {
  try {
    await asegurarEsquema(req.db, req.usuario?.db_name || "mx");
    const [filas] = await req.db.query(
      `SELECT aviso_ruta, consentimiento_ruta FROM paciente
        WHERE (aviso_ruta IS NOT NULL AND aviso_ruta <> '') OR (consentimiento_ruta IS NOT NULL AND consentimiento_ruta <> '')`
    );
    const nombres = new Set();
    for (const r of filas) for (const ruta of [r.aviso_ruta, r.consentimiento_ruta]) {
      const n = nombreArchivo(ruta);
      if (n) nombres.add(n);
    }
    const faltantes = [...nombres].filter((n) => !fs.existsSync(rutaFisica(n)));
    res.json({ referenciados: nombres.size, en_servidor: nombres.size - faltantes.length, faltantes, persistente: HAY_VOLUMEN });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al revisar los consentimientos" });
  }
}
