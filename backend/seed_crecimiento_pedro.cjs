/**
 * seed_crecimiento_pedro.cjs
 * Inserta 9 registros de historial_crecimiento para el paciente
 * "Pedro Perez Prueba" (DNI: 0801201620467), cubriendo de los 27 meses
 * a los 10 años. Incluye progresión realista pre y post debut de DM.
 *
 * Ejecutar: node seed_crecimiento_pedro.cjs
 */

const mysql = require("mysql2/promise");

// ── Z-score → estado ─────────────────────────────────────────────────────────
function clasificarZ(z, tipo = "general") {
  if (z == null || isNaN(z)) return null;
  if (tipo === "talla") {
    if (z < -3) return "Talla baja severa";
    if (z < -2) return "Talla baja";
    if (z <= 2) return "Normal";
    return "Talla alta";
  }
  if (tipo === "imc") {
    if (z < -3) return "Delgadez severa";
    if (z < -2) return "Delgadez";
    if (z <= 1) return "Normal";
    if (z <= 2) return "Sobrepeso";
    if (z <= 3) return "Obesidad";
    return "Obesidad severa";
  }
  if (z < -3) return "Desnutrición severa";
  if (z < -2) return "Desnutrición moderada";
  if (z < -1) return "Riesgo de desnutrición";
  if (z <= 1) return "Normal";
  if (z <= 2) return "Riesgo de sobrepeso";
  if (z <= 3) return "Sobrepeso";
  return "Obesidad";
}

// ── IMC ───────────────────────────────────────────────────────────────────────
function calcImc(peso, talla) {
  if (!peso || !talla) return null;
  const t = Number(talla) / 100;
  return parseFloat((Number(peso) / (t * t)).toFixed(2));
}

// ── Registros de prueba ───────────────────────────────────────────────────────
// Nacimineto: 2016-02-15  |  Sexo: M
// Estándares OMS 2006 (0-5 años) y OMS 2007 (5-19 años)
//
// Columnas: [fecha, edad_meses, peso_kg, talla_cm, pc_cm,
//            z_peso, z_talla, z_imc, z_pc, observaciones]
const registros = [
  // ── 0-5 años (OMS 2006) ───────────────────────────────────────────────────
  [
    "2018-05-15", 27, 11.8, 88.5, 48.5,
    -0.30, -0.50, -0.10, -0.40,
    "Control de crecimiento rutinario. Desarrollo normal.",
  ],
  [
    "2019-08-20", 42, 15.1, 98.0, 49.8,
    0.10, -0.30, 0.40, -0.10,
    "Control de crecimiento. Alimentación balanceada. Sin eventos relevantes.",
  ],
  [
    "2020-11-10", 57, 17.4, 107.0, 50.6,
    -0.20, -0.60, 0.20, 0.10,
    "Control previo inicio escolar. Talla ligeramente por debajo de mediana.",
  ],
  // ── 5-19 años (OMS 2007) ─────────────────────────────────────────────────
  [
    "2022-02-15", 72, 19.6, 113.5, 51.0,
    -0.50, -0.80, 0.00, 0.20,
    "Revisión anual a los 6 años. Crecimiento adecuado.",
  ],
  [
    "2023-02-15", 84, 22.4, 120.5, 51.8,
    -0.40, -0.60, 0.00, 0.30,
    "Revisión anual a los 7 años. Talla en canal -1 DS. Nutrición adecuada.",
  ],
  [
    "2024-01-10", 95, 28.8, 126.5, 52.3,
    0.80, -0.10, 1.30, 0.40,
    "Previo a debut de DM. Incremento de peso notable últimos 6 meses. Se sospecha inicio de DM.",
  ],
  [
    "2024-04-05", 98, 25.2, 127.8, 52.4,
    0.10, 0.00, 0.10, 0.40,
    "Un mes post-debut de DM. Normalización del peso tras inicio de insulinoterapia.",
  ],
  [
    "2025-02-15", 108, 29.5, 133.5, 53.0,
    0.20, 0.10, 0.30, 0.50,
    "Revisión anual a los 9 años. Buen control metabólico. Crecimiento dentro de canal.",
  ],
  [
    "2026-04-10", 122, 33.8, 140.5, 53.5,
    0.30, 0.40, 0.10, 0.60,
    "Control actual. Talla y peso en zona normal OMS. HbA1c estable.",
  ],
];

(async () => {
  const db = await mysql.createConnection({
    host:     "metro.proxy.rlwy.net",
    port:     35534,
    user:     "root",
    password: "MfZrJWHJcbyzUIbshhtDGuXQuvldatYt",
    database: "railway",
  });

  // ── 1. Buscar ID del paciente ─────────────────────────────────────────────
  const [[paciente]] = await db.query(
    "SELECT id, nombre FROM pacientes WHERE dni = ?",
    ["0801201620467"]
  );

  if (!paciente) {
    console.error("❌ No se encontró el paciente Pedro Perez Prueba (DNI: 0801201620467).");
    console.error("   Ejecuta primero seed_pedro_produccion.cjs");
    await db.end();
    process.exit(1);
  }

  const pid = paciente.id;
  console.log(`✅ Paciente encontrado: ${paciente.nombre} (id=${pid})`);

  // ── 2. Limpiar registros anteriores de prueba ─────────────────────────────
  const [del] = await db.query(
    "DELETE FROM historial_crecimiento WHERE paciente_id = ?",
    [pid]
  );
  console.log(`🗑  Eliminados ${del.affectedRows} registro(s) previo(s) de crecimiento.`);

  // ── 3. Insertar registros ─────────────────────────────────────────────────
  let insertados = 0;

  for (const [
    fecha, edad_meses, peso_kg, talla_cm, pc_cm,
    z_peso, z_talla, z_imc, z_pc, observaciones,
  ] of registros) {
    const imc = calcImc(peso_kg, talla_cm);

    await db.query(
      `INSERT INTO historial_crecimiento
         (paciente_id, fecha, peso_kg, talla_cm, imc, pc_cm, edad_meses,
          zscore_peso_edad, zscore_talla_edad, zscore_imc_edad, zscore_pc_edad,
          estado_peso_edad, estado_talla_edad, estado_imc_edad, estado_pc_edad,
          observaciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        pid, fecha,
        peso_kg, talla_cm, imc, pc_cm, edad_meses,
        z_peso, z_talla, z_imc, z_pc,
        clasificarZ(z_peso,  "general"),
        clasificarZ(z_talla, "talla"),
        clasificarZ(z_imc,   "imc"),
        clasificarZ(z_pc,    "pc"),
        observaciones,
      ]
    );

    console.log(`  ✔ ${fecha} | ${edad_meses} meses | ${peso_kg} kg / ${talla_cm} cm | IMC ${imc}`);
    insertados++;
  }

  console.log(`\n✅ ${insertados} registros de crecimiento insertados para ${paciente.nombre}.`);
  await db.end();
})();
