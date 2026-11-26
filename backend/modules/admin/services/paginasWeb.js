import pool from "../../../shared/config/db.master.js";

let lista;
// Crea la tabla la primera vez que se usa (no requiere migración manual).
export function asegurarTabla() {
  if (!lista) {
    lista = pool.query(`
      CREATE TABLE IF NOT EXISTS paginas_web (
        tenant_codigo VARCHAR(10)  NOT NULL PRIMARY KEY,
        activa        TINYINT(1)   NOT NULL DEFAULT 0,
        contenido     JSON         NOT NULL,
        actualizado   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch((e) => { lista = null; throw e; });
  }
  return lista;
}

export const parseContenido = (c) => (typeof c === "string" ? JSON.parse(c) : c);
