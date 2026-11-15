// Resultados de un examen que no tienen columna propia en `laboratorio`
// (biometría, química ampliada, orina…): se guardan uno por fila en `laboratorio_resultado`.

const MAX_FILAS = 400;

/** Guarda los "otros resultados" de un examen. `db` puede ser un pool o una conexión de transacción. */
export async function guardarResultadosExtra(db, { laboratorioId, pacienteId, fecha, origen, otros }) {
  if (!Array.isArray(otros) || !otros.length || !laboratorioId) return 0;
  const filas = otros.slice(0, MAX_FILAS)
    .filter((o) => o && o.nombre && Number.isFinite(Number(o.valor)))
    .map((o) => [
      laboratorioId, pacienteId, fecha || null, origen ? String(origen).slice(0, 80) : null,
      String(o.nombre).slice(0, 120), Number(o.valor), o.signo ? String(o.signo).slice(0, 1) : null,
      o.unidad ? String(o.unidad).slice(0, 30) : null, o.referencia ? String(o.referencia).slice(0, 80) : null,
      o.origen ? String(o.origen).slice(0, 10) : null,
    ]);
  if (!filas.length) return 0;
  await db.query(
    "INSERT INTO laboratorio_resultado (laboratorio_id, paciente_id, fecha_muestra, laboratorio_origen, nombre, valor, signo, unidad, referencia, origen) VALUES ?",
    [filas]
  );
  return filas.length;
}

const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** ¿El nombre del paciente aparece en el encabezado del PDF? Devuelve true si NO coincide. */
export function nombreNoCoincide(paciente, cabecera) {
  const enPdf = sinAcentos(cabecera);
  const partes = sinAcentos([paciente.nombre, paciente.ap_pat, paciente.ap_mat].filter(Boolean).join(" "))
    .split(/\s+/).filter((p) => p.length > 2);
  const coinciden = partes.filter((p) => enPdf.includes(p)).length;
  return partes.length > 0 && coinciden < Math.min(2, partes.length);
}
