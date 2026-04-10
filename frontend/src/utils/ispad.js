/**
 * Función de clasificación ISPAD para el frontend
 * (espejo de la del backend para el semáforo en tiempo real)
 */
export function clasificarISPAD(tir, tar, tbr, gmi = null) {
  if (tir >= 70 && tar <= 25 && tbr <= 4 && (gmi === null || gmi <= 7)) return "OPTIMO";
  if (tir >= 50 && tar <= 35 && tbr <= 8) return "MODERADO";
  return "ALTO_RIESGO";
}
