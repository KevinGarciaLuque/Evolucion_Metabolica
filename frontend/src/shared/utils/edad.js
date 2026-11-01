// Edad a partir de la fecha de nacimiento ("YYYY-MM-DD"), calculada contra el "hoy" del país.
// Devuelve años, meses y días completos, y un texto legible: "3 años 5 meses", "8 meses", "12 días".
import { hoyISO } from "./zonaHoraria";

const partes = (iso) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { a: +m[1], m: +m[2], d: +m[3] } : null;
};
const diasDelMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate(); // m = 1..12

export function edadDetallada(fechaNac, hoy = hoyISO()) {
  const n = partes(fechaNac), h = partes(hoy);
  if (!n || !h) return null;
  let anios = h.a - n.a, meses = h.m - n.m, dias = h.d - n.d;
  if (dias < 0) { meses--; dias += diasDelMes(h.m === 1 ? h.a - 1 : h.a, h.m === 1 ? 12 : h.m - 1); }
  if (meses < 0) { anios--; meses += 12; }
  if (anios < 0) return null; // fecha futura
  const plural = (n, u, p) => `${n} ${n === 1 ? u : p}`;
  let texto;
  if (anios >= 1) texto = meses ? `${plural(anios, "año", "años")} ${plural(meses, "mes", "meses")}` : plural(anios, "año", "años");
  else if (meses >= 1) texto = plural(meses, "mes", "meses");
  else texto = plural(dias, "día", "días");
  return { anios, meses, dias, texto };
}
