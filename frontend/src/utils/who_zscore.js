/**
 * WHO Child Growth Standards 2006 — Z-score calculator
 * Método LMS (transformación Box-Cox), ref: de Onis et al., Bull WHO 2006
 *
 * Tablas: [edadMeses, M, S]  con L constante por indicador
 * Cobertura: 0-60 meses (estándares OMS 2006)
 * Para peso/talla: indexado por talla cm (45-110 cm)
 */

// ─── Tablas LMS ─────────────────────────────────────────────────────────────
// Formato: [ageMonths, M, S]

const WFA_B = [  // Weight-for-age boys, L=-0.3521
  [0,3.3464,0.14602],[1,4.4709,0.13395],[2,5.5675,0.12849],[3,6.3762,0.12286],
  [4,7.0023,0.11816],[5,7.5105,0.11374],[6,7.9340,0.11007],[7,8.2970,0.10686],
  [8,8.6001,0.10400],[9,8.8545,0.10155],[10,9.0794,0.09997],[11,9.2998,0.09891],
  [12,9.5071,0.09826],[15,10.1657,0.09716],[18,10.8290,0.09685],[21,11.4868,0.09739],
  [24,12.1391,0.10018],[30,13.3750,0.10437],[36,14.4415,0.10750],[42,15.4367,0.11030],
  [48,16.6916,0.11449],[54,17.7700,0.11806],[60,18.6626,0.12177],
];
const WFA_G = [  // Weight-for-age girls, L=-0.3521
  [0,3.2322,0.14171],[1,4.1873,0.13724],[2,5.1282,0.13000],[3,5.8885,0.12619],
  [4,6.4237,0.12228],[5,6.8750,0.11828],[6,7.2966,0.11477],[7,7.6725,0.11248],
  [8,8.0152,0.11134],[9,8.3499,0.11073],[10,8.6800,0.10972],[11,8.9890,0.10821],
  [12,9.2577,0.10663],[15,9.9450,0.10592],[18,10.6368,0.10672],[21,11.3257,0.10856],
  [24,11.9020,0.11048],[30,13.0850,0.11488],[36,14.1699,0.11828],[42,15.2248,0.12141],
  [48,16.2750,0.12430],[54,17.3028,0.12728],[60,18.2026,0.13048],
];

const LHFA_B = [ // Length/Height-for-age boys, L=1
  [0,49.8842,0.03795],[1,54.7244,0.03539],[2,58.4249,0.03438],[3,61.4292,0.03370],
  [4,63.8860,0.03309],[5,65.9026,0.03256],[6,67.6236,0.03245],[7,69.1645,0.03228],
  [8,70.5994,0.03224],[9,71.9687,0.03228],[10,73.2812,0.03237],[11,74.5316,0.03248],
  [12,75.7488,0.03264],[15,79.1242,0.03293],[18,82.3241,0.03274],[21,85.1945,0.03297],
  [24,87.8161,0.03303],[30,92.5325,0.03389],[36,96.5386,0.03451],[42,100.2568,0.03549],
  [48,103.6901,0.03600],[54,106.9208,0.03641],[60,110.0267,0.03680],
];
const LHFA_G = [ // Length/Height-for-age girls, L=1
  [0,49.1477,0.03790],[1,53.6872,0.03568],[2,57.0673,0.03572],[3,59.8029,0.03547],
  [4,62.0900,0.03491],[5,64.0301,0.03478],[6,65.7311,0.03430],[7,67.2873,0.03432],
  [8,68.7498,0.03460],[9,70.1435,0.03493],[10,71.4818,0.03524],[11,72.7710,0.03551],
  [12,74.0147,0.03584],[15,77.4816,0.03608],[18,80.7518,0.03615],[21,83.7464,0.03627],
  [24,86.4187,0.03590],[30,91.3289,0.03727],[36,95.0690,0.03816],[42,98.5781,0.03929],
  [48,101.8454,0.03986],[54,105.2780,0.04082],[60,108.4376,0.04138],
];

const BFA_B = [  // BMI-for-age boys, L=-2.0
  [0,13.4069,0.09012],[1,15.3040,0.09013],[2,16.1397,0.08580],[3,16.0196,0.08345],
  [4,15.8008,0.08177],[5,15.5261,0.07997],[6,15.2782,0.07887],[7,15.1062,0.07826],
  [8,14.9785,0.07857],[9,14.9032,0.07875],[10,14.8584,0.07897],[11,14.8421,0.07924],
  [12,14.8544,0.08002],[15,14.9900,0.08177],[18,15.1524,0.08376],[21,15.2915,0.08460],
  [24,15.5054,0.08602],[30,15.6853,0.09060],[36,15.6618,0.09306],[42,15.6453,0.09466],
  [48,15.5734,0.09621],[54,15.5734,0.09768],[60,15.4979,0.09930],
];
const BFA_G = [  // BMI-for-age girls, L=-2.0
  [0,13.3363,0.09167],[1,14.9455,0.08864],[2,15.8009,0.08624],[3,15.6981,0.08387],
  [4,15.3987,0.08110],[5,15.1093,0.07977],[6,14.9066,0.07930],[7,14.7985,0.07979],
  [8,14.7238,0.08078],[9,14.7241,0.08222],[10,14.7543,0.08385],[11,14.7873,0.08535],
  [12,14.8271,0.08663],[15,14.9948,0.08816],[18,15.1701,0.09025],[21,15.3279,0.09173],
  [24,15.4580,0.09292],[30,15.6484,0.09620],[36,15.7296,0.09880],[42,15.7983,0.10112],
  [48,15.8527,0.10327],[54,15.8904,0.10547],[60,15.9093,0.10759],
];

const HCFA_B = [ // Head-circumference-for-age boys, L=1
  [0,34.4618,0.03675],[1,37.2759,0.03187],[2,39.1285,0.02997],[3,40.5134,0.02856],
  [4,41.6447,0.02750],[5,42.6038,0.02645],[6,43.3655,0.02595],[7,44.0014,0.02558],
  [8,44.5477,0.02528],[9,45.0235,0.02505],[10,45.4396,0.02487],[11,45.8097,0.02474],
  [12,46.1456,0.02466],[15,47.0047,0.02415],[18,47.7448,0.02396],[21,48.3695,0.02397],
  [24,48.9194,0.02401],[30,49.7880,0.02436],[36,50.4697,0.02469],[42,51.0137,0.02489],
  [48,51.4621,0.02510],[54,51.8382,0.02530],[60,52.1668,0.02547],
];
const HCFA_G = [ // Head-circumference-for-age girls, L=1
  [0,33.7892,0.03596],[1,36.5217,0.03191],[2,38.3088,0.02989],[3,39.5856,0.02862],
  [4,40.6016,0.02759],[5,41.4642,0.02664],[6,42.1910,0.02609],[7,42.8183,0.02569],
  [8,43.3716,0.02539],[9,43.8641,0.02513],[10,44.3071,0.02490],[11,44.7084,0.02470],
  [12,45.0747,0.02461],[15,46.0044,0.02437],[18,46.8120,0.02434],[21,47.5068,0.02442],
  [24,48.0989,0.02448],[30,49.0977,0.02488],[36,49.8795,0.02519],[42,50.5196,0.02542],
  [48,51.0453,0.02566],[54,51.4764,0.02586],[60,51.8314,0.02604],
];

// Weight-for-length (45-110 cm), [lengthCm, M, S], L=-0.3521
const WFL_B = [
  [45,2.441,0.09083],[46,2.581,0.08871],[47,2.726,0.08666],[48,2.879,0.08466],
  [49,3.040,0.08275],[50,3.209,0.08093],[51,3.385,0.07919],[52,3.569,0.07752],
  [53,3.761,0.07593],[54,3.961,0.07441],[55,4.169,0.07297],[56,4.384,0.07161],
  [57,4.606,0.07033],[58,4.836,0.06913],[59,5.073,0.06799],[60,5.316,0.06691],
  [61,5.565,0.06588],[62,5.819,0.06491],[63,6.080,0.06400],[64,6.345,0.06315],
  [65,6.614,0.06235],[66,6.887,0.06161],[67,7.163,0.06092],[68,7.440,0.06028],
  [69,7.718,0.05969],[70,7.997,0.05916],[71,8.276,0.05869],[72,8.554,0.05828],
  [73,8.832,0.05794],[74,9.108,0.05767],[75,9.383,0.05748],[76,9.657,0.05737],
  [77,9.929,0.05736],[78,10.198,0.05746],[79,10.465,0.05768],[80,10.729,0.05804],
  [81,10.990,0.05854],[82,11.248,0.05919],[83,11.503,0.06002],[84,11.755,0.06103],
  [85,12.004,0.06221],[86,12.251,0.06355],[87,12.495,0.06509],[88,12.737,0.06681],
  [89,12.979,0.06873],[90,13.221,0.07083],[91,13.463,0.07314],[92,13.708,0.07562],
  [93,13.957,0.07830],[94,14.212,0.08114],[95,14.475,0.08415],[96,14.749,0.08725],
  [97,15.036,0.09033],[98,15.340,0.09335],[99,15.664,0.09638],[100,16.010,0.09940],
  [101,16.378,0.10232],[102,16.768,0.10519],[103,17.179,0.10804],[104,17.612,0.11091],
  [105,18.067,0.11376],[106,18.543,0.11657],[107,19.040,0.11933],[108,19.558,0.12204],
  [109,20.099,0.12472],[110,20.663,0.12738],
];
const WFL_G = [
  [45,2.359,0.09274],[46,2.499,0.09025],[47,2.645,0.08795],[48,2.799,0.08581],
  [49,2.961,0.08380],[50,3.133,0.08191],[51,3.315,0.08013],[52,3.508,0.07843],
  [53,3.712,0.07682],[54,3.928,0.07528],[55,4.155,0.07381],[56,4.394,0.07242],
  [57,4.643,0.07110],[58,4.903,0.06985],[59,5.172,0.06866],[60,5.449,0.06751],
  [61,5.732,0.06640],[62,6.022,0.06534],[63,6.318,0.06434],[64,6.619,0.06340],
  [65,6.924,0.06252],[66,7.232,0.06170],[67,7.540,0.06094],[68,7.847,0.06024],
  [69,8.151,0.05961],[70,8.452,0.05904],[71,8.747,0.05853],[72,9.038,0.05808],
  [73,9.325,0.05770],[74,9.607,0.05740],[75,9.884,0.05718],[76,10.158,0.05705],
  [77,10.428,0.05702],[78,10.695,0.05709],[79,10.960,0.05729],[80,11.224,0.05762],
  [81,11.487,0.05810],[82,11.748,0.05873],[83,12.009,0.05954],[84,12.268,0.06051],
  [85,12.526,0.06165],[86,12.781,0.06297],[87,13.035,0.06444],[88,13.286,0.06607],
  [89,13.536,0.06784],[90,13.785,0.06974],[91,14.035,0.07175],[92,14.287,0.07386],
  [93,14.543,0.07605],[94,14.806,0.07829],[95,15.080,0.08055],[96,15.368,0.08279],
  [97,15.672,0.08498],[98,15.996,0.08711],[99,16.341,0.08921],[100,16.707,0.09134],
  [101,17.094,0.09354],[102,17.502,0.09578],[103,17.930,0.09804],[104,18.378,0.10032],
  [105,18.842,0.10263],[106,19.323,0.10496],[107,19.820,0.10729],[108,20.336,0.10961],
  [109,20.873,0.11189],[110,21.432,0.11411],
];

// ─── Interpolación lineal en tabla ──────────────────────────────────────────
function interpolar(tabla, x) {
  if (x <= tabla[0][0]) return tabla[0];
  if (x >= tabla[tabla.length - 1][0]) return tabla[tabla.length - 1];
  for (let i = 0; i < tabla.length - 1; i++) {
    const [x0, m0, s0] = tabla[i];
    const [x1, m1, s1] = tabla[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return [x, m0 + t * (m1 - m0), s0 + t * (s1 - s0)];
    }
  }
  return tabla[tabla.length - 1];
}

// ─── Fórmula LMS (WHO) ───────────────────────────────────────────────────────
function lmsZ(valor, M, S, L) {
  if (valor <= 0 || M <= 0) return null;
  if (Math.abs(L) < 0.0001) return Math.log(valor / M) / S;
  return (Math.pow(valor / M, L) - 1) / (L * S);
}

// ─── Z → Percentil aproximado (distribución normal) ─────────────────────────
export function zToPercentil(z) {
  if (z == null || isNaN(z)) return null;
  const p = 0.3275911;
  const [a1, a2, a3, a4, a5] = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  const cdf = 0.5 * (1 + sign * y);
  const pct = Math.round(cdf * 100);
  if (pct <= 0) return "P0";
  if (pct >= 100) return "P99";
  return `P${pct}`;
}

// ─── Clasificaciones ─────────────────────────────────────────────────────────
export function clasificarZ(z, tipo = "peso_edad") {
  if (z == null || isNaN(z)) return null;
  if (tipo === "talla_edad") {
    if (z < -3)  return "Talla baja severa";
    if (z < -2)  return "Talla baja";
    if (z <= 2)  return "Normal";
    return "Talla alta";
  }
  if (tipo === "imc_edad") {
    if (z < -3)  return "Delgadez severa";
    if (z < -2)  return "Delgadez";
    if (z <= 1)  return "Normal";
    if (z <= 2)  return "Sobrepeso";
    if (z <= 3)  return "Obesidad";
    return "Obesidad severa";
  }
  if (tipo === "pc_edad") {
    if (z < -2)  return "Microcefalia";
    if (z <= 2)  return "Normal";
    return "Macrocefalia";
  }
  if (tipo === "peso_talla") {
    if (z < -3)  return "Desnutrición severa";
    if (z < -2)  return "Desnutrición moderada";
    if (z < -1)  return "Riesgo desnutrición";
    if (z <= 1)  return "Normal";
    if (z <= 2)  return "Sobrepeso";
    if (z <= 3)  return "Obesidad";
    return "Obesidad severa";
  }
  // peso_edad general
  if (z < -3)  return "Desnutrición severa";
  if (z < -2)  return "Desnutrición moderada";
  if (z < -1)  return "Riesgo de desnutrición";
  if (z <= 1)  return "Normal";
  if (z <= 2)  return "Riesgo de sobrepeso";
  if (z <= 3)  return "Sobrepeso";
  return "Obesidad";
}

// ─── Función principal ────────────────────────────────────────────────────────
/**
 * Calcula todos los z-scores para un registro de crecimiento.
 * @param {object} medidas  { peso_kg, talla_cm, imc, pc_cm, edad_meses }
 * @param {string} sexo     "M" | "F"
 * @returns {object}        { imc, zscore_*, estado_*, percentil_* }
 */
export function calcularZScores(medidas, sexo) {
  const { peso_kg, talla_cm, pc_cm, edad_meses } = medidas;
  const esNiño = sexo !== "F";  // default boys
  const result = {};

  // IMC calculado
  if (peso_kg && talla_cm) {
    const tallaMt = Number(talla_cm) / 100;
    result.imc = parseFloat((Number(peso_kg) / (tallaMt * tallaMt)).toFixed(2));
  }

  // Solo calcular si tenemos edad en meses y está en rango 0-60
  const edad = Number(edad_meses);
  const edadValida = !isNaN(edad) && edad >= 0 && edad <= 60;

  // ── Peso/Edad ─────────────────────────────────────────────────────────────
  if (peso_kg && edadValida) {
    const tabla = esNiño ? WFA_B : WFA_G;
    const [, M, S] = interpolar(tabla, edad);
    const z = parseFloat((lmsZ(Number(peso_kg), M, S, -0.3521) ?? 0).toFixed(2));
    result.zscore_peso_edad = z;
    result.percentil_peso_edad = zToPercentil(z);
    result.estado_peso_edad = clasificarZ(z, "peso_edad");
  }

  // ── Talla/Edad ────────────────────────────────────────────────────────────
  if (talla_cm && edadValida) {
    const tabla = esNiño ? LHFA_B : LHFA_G;
    const [, M, S] = interpolar(tabla, edad);
    const z = parseFloat((lmsZ(Number(talla_cm), M, S, 1) ?? 0).toFixed(2));
    result.zscore_talla_edad = z;
    result.percentil_talla_edad = zToPercentil(z);
    result.estado_talla_edad = clasificarZ(z, "talla_edad");
  }

  // ── IMC/Edad ──────────────────────────────────────────────────────────────
  if (result.imc && edadValida) {
    const tabla = esNiño ? BFA_B : BFA_G;
    const [, M, S] = interpolar(tabla, edad);
    const z = parseFloat((lmsZ(result.imc, M, S, -2.0) ?? 0).toFixed(2));
    result.zscore_imc_edad = z;
    result.percentil_imc_edad = zToPercentil(z);
    result.estado_imc_edad = clasificarZ(z, "imc_edad");
  }

  // ── P.C./Edad ─────────────────────────────────────────────────────────────
  if (pc_cm && edadValida) {
    const tabla = esNiño ? HCFA_B : HCFA_G;
    const [, M, S] = interpolar(tabla, edad);
    const z = parseFloat((lmsZ(Number(pc_cm), M, S, 1) ?? 0).toFixed(2));
    result.zscore_pc_edad = z;
    result.percentil_pc_edad = zToPercentil(z);
    result.estado_pc_edad = clasificarZ(z, "pc_edad");
  }

  // ── Peso/Talla ────────────────────────────────────────────────────────────
  if (peso_kg && talla_cm) {
    const tallaNum = Number(talla_cm);
    if (tallaNum >= 45 && tallaNum <= 110) {
      const tabla = esNiño ? WFL_B : WFL_G;
      const [, M, S] = interpolar(tabla, tallaNum);
      const z = parseFloat((lmsZ(Number(peso_kg), M, S, -0.3521) ?? 0).toFixed(2));
      result.zscore_peso_talla = z;
      result.percentil_peso_talla = zToPercentil(z);
      result.estado_peso_talla = clasificarZ(z, "peso_talla");
    }
  }

  return result;
}

/**
 * Calcula la edad en meses entre fecha_nacimiento y fecha_medicion.
 */
export function calcularEdadMeses(fechaNacimiento, fechaMedicion) {
  if (!fechaNacimiento) return null;
  const fn = new Date(String(fechaNacimiento).substring(0, 10) + "T00:00:00");
  const fm = fechaMedicion
    ? new Date(String(fechaMedicion).substring(0, 10) + "T00:00:00")
    : new Date();
  const meses = (fm.getFullYear() - fn.getFullYear()) * 12 + (fm.getMonth() - fn.getMonth());
  return Math.max(0, meses);
}
