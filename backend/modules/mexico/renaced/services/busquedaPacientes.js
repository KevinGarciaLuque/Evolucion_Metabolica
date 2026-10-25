// Búsqueda de pacientes que usa índices (en vez de LIKE '%texto%', que recorre toda la tabla).
//  - Solo dígitos: folio exacto (igual que antes).
//  - 3+ letras por palabra: FULLTEXT en nombre/apellidos (cada palabra por prefijo,
//    en cualquier orden) + CURP/expediente por prefijo.
//  - Texto muy corto: prefijo en apellido/nombre.
// Si el índice FULLTEXT aún no existe, cae al comportamiento anterior (LIKE '%texto%')
// y no se rompe nada: la migración de índices se puede aplicar cuando convenga.

const ERR_SIN_FULLTEXT = 1191; // ER_FT_MATCHING_KEY_NOT_FOUND
const MIN_TOKEN = 3;

export function esErrorSinFulltext(err) {
  return err?.errno === ERR_SIN_FULLTEXT || err?.code === "ER_FT_MATCHING_KEY_NOT_FOUND";
}

export function condicionBusqueda(textoOriginal, { fulltext = true } = {}) {
  const texto = String(textoOriginal || "").trim();
  if (!texto) return null;

  if (/^\d+$/.test(texto)) {
    // Búsqueda puramente numérica: folio exacto (ej. "1" o "22" regresan solo ese paciente).
    return { sql: " AND p.folio_renaced = ?", params: [parseInt(texto, 10)] };
  }

  if (!fulltext) {
    const q = `%${texto}%`;
    return { sql: " AND (p.nombre LIKE ? OR p.ap_pat LIKE ? OR p.curp LIKE ? OR p.expediente LIKE ?)", params: [q, q, q, q] };
  }

  const escapado = texto.replace(/[\%_]/g, "\$&");
  const palabras = texto
    .normalize("NFC")
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const largas = palabras.filter((w) => w.length >= MIN_TOKEN);

  if (largas.length) {
    const booleano = largas.map((w) => `+${w}*`).join(" ");
    return {
      sql: " AND (MATCH(p.nombre, p.ap_pat, p.ap_mat) AGAINST (? IN BOOLEAN MODE) OR p.curp LIKE ? OR p.expediente LIKE ?)",
      params: [booleano, `${escapado}%`, `${escapado}%`],
    };
  }

  // Texto corto (1–2 letras): prefijo con índice
  return {
    sql: " AND (p.ap_pat LIKE ? OR p.nombre LIKE ? OR p.curp LIKE ? OR p.expediente LIKE ?)",
    params: [`${escapado}%`, `${escapado}%`, `${escapado}%`, `${escapado}%`],
  };
}
