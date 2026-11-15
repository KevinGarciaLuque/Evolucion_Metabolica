// Aplicar lo leído de una historia clínica (PDF) a un formulario SIN pisar lo que ya está capturado.
const vacio = (v) => v === undefined || v === null || String(v).trim() === "";

/**
 * Devuelve el objeto con los campos vacíos llenados y el detalle:
 *  llenados  → campos que estaban vacíos y se llenaron
 *  respetados → campos que ya tenían un dato distinto y se dejaron como estaban
 * `ceroEsVacio`: campos numéricos tipo bandera donde 0 significa "sin dato" (ej. fecha_approx).
 */
export function llenarVacios(actual, nuevo, ceroEsVacio = []) {
  const valor = { ...(actual || {}) };
  const llenados = [], respetados = [];
  for (const [k, v] of Object.entries(nuevo || {})) {
    if (vacio(v)) continue;
    const actualVacio = vacio(valor[k]) || (ceroEsVacio.includes(k) && Number(valor[k]) === 0);
    if (actualVacio) { valor[k] = v; llenados.push(k); }
    else if (String(valor[k]) !== String(v)) respetados.push(k);
  }
  return { valor, llenados, respetados };
}

/** Une varios resultados de llenarVacios en un resumen con conteos. */
export function resumen(...partes) {
  return {
    llenados: partes.reduce((n, p) => n + (p?.llenados?.length || 0), 0),
    respetados: partes.reduce((n, p) => n + (p?.respetados?.length || 0), 0),
  };
}
