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

// Caché en memoria de la página pública (evita consultar la base en cada visita).
// Se vacía al guardar/activar; el TTL cubre el caso de varias instancias del servidor.
const TTL_MS = 120_000;
const cache = new Map();
export const cacheGet = (k) => {
  const e = cache.get(k);
  if (e && e.vence > Date.now()) return e.valor;
  cache.delete(k);
  return null;
};
export const cacheSet = (k, valor) => {
  if (cache.size > 200) cache.clear();
  cache.set(k, { valor, vence: Date.now() + TTL_MS });
};
export const invalidarCachePaginas = () => cache.clear();

export const parseContenido = (c) => (typeof c === "string" ? JSON.parse(c) : c);
