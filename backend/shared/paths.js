import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Rutas base del backend, independientes de la carpeta donde viva cada módulo.
export const BACKEND_DIR  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(BACKEND_DIR, "uploads");
export const SCRIPTS_DIR  = path.join(BACKEND_DIR, "scripts");

// ── Persistencia de archivos de RENACED ───────────────────────────────────────
// Railway borra el sistema de archivos del contenedor en cada despliegue: solo sobrevive lo que
// está dentro de un volumen. El manual monta el volumen en uploads/pdfs (los PDF de Honduras), así
// que las carpetas de RENACED (consentimientos, monitores, laboratorios, respaldos) quedaban fuera.
// Railway expone la ruta del volumen en RAILWAY_VOLUME_MOUNT_PATH: las carpetas reales viven dentro
// de ese volumen (en `_persistente/`) y uploads/<carpeta> es un enlace a ellas. Las rutas y las URLs
// no cambian. En local (sin volumen) no se hace nada.
export const VOLUMEN_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || null;
export const HAY_VOLUMEN = !!VOLUMEN_PATH;
const CARPETAS_PERSISTENTES = ["renaced_consentimientos", "renaced_pdfs", "renaced_laboratorios", "renaced_backups"];

function asegurarPersistencia() {
  if (!VOLUMEN_PATH) {
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.warn("⚠️  Sin volumen de Railway: los archivos subidos (consentimientos, PDF) se perderán en el próximo despliegue.");
    }
    return;
  }
  for (const nombre of CARPETAS_PERSISTENTES) {
    try {
      const enlace = path.join(UPLOADS_PATH, nombre);
      const destino = path.join(VOLUMEN_PATH, "_persistente", nombre);
      // Si uploads ya está dentro del volumen, no hay nada que enlazar
      if (path.resolve(enlace).startsWith(path.resolve(VOLUMEN_PATH) + path.sep)) { fs.mkdirSync(enlace, { recursive: true }); continue; }
      fs.mkdirSync(destino, { recursive: true });
      fs.mkdirSync(UPLOADS_PATH, { recursive: true });
      const actual = fs.lstatSync(enlace, { throwIfNoEntry: false });
      if (actual?.isSymbolicLink()) continue;
      if (actual?.isDirectory()) { // carpeta real (de antes): se pasa al volumen y se reemplaza por el enlace
        fs.cpSync(enlace, destino, { recursive: true, force: false, errorOnExist: false });
        fs.rmSync(enlace, { recursive: true, force: true });
      }
      fs.symlinkSync(destino, enlace, "junction");
    } catch (e) {
      console.error(`⚠️  No se pudo enlazar ${nombre} al volumen:`, e.message);
    }
  }
}
asegurarPersistencia();
