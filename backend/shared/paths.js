import path from "path";
import { fileURLToPath } from "url";

// Rutas base del backend, independientes de la carpeta donde viva cada módulo.
export const BACKEND_DIR  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(BACKEND_DIR, "uploads");
export const SCRIPTS_DIR  = path.join(BACKEND_DIR, "scripts");
