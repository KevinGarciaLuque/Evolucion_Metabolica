/**
 * seed_pedro_produccion.cjs
 * Inserta el paciente de prueba Pedro Pérez Prueba y todos sus registros en producción.
 */
const mysql = require("mysql2/promise");

(async () => {
  const prod = await mysql.createConnection({
    host: "metro.proxy.rlwy.net",
    port: 35534,
    user: "root",
    password: "MfZrJWHJcbyzUIbshhtDGuXQuvldatYt",
    database: "railway",
  });

  // ── 1. Paciente ────────────────────────────────────────────────────────────
  const [[existe]] = await prod.query(
    "SELECT id FROM pacientes WHERE dni = ?",
    ["0801201620467"]
  );
  let pid;

  if (existe) {
    pid = existe.id;
    console.log("Paciente ya existe con id=" + pid + ", usando ese id.");
  } else {
    const [r] = await prod.execute(
      `INSERT INTO pacientes
         (dni, nombre, fecha_nacimiento, edad_debut, edad, sexo,
          departamento, municipio, procedencia_tipo, direccion,
          antecedente_familiar, institucion, peso, talla,
          tipo_diabetes, subtipo_monogenica, hba1c_previo,
          tipo_insulina, tipo_insulina_2, dosis_por_kg,
          promedio_glucometrias, telefono, nombre_tutor,
          telefono_tutor, con_monitor, estado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        "0801201620467", "Pedro Perez Prueba", "2016-02-15",
        8, 10, "M", "Francisco Morazán", "Tegucigalpa",
        "Urbana", "Col. La Peña",
        "La Tia tiene diabetes tipo 2 desde los 40 años se le detecto",
        "HMEP", "50.50", "80.00",
        "Monogénicas", "Neonatal", "8.50",
        "Galargina 1.5", "NPH", "0.97",
        "4 al dia", "96065564", "Pedro Perez",
        "00000", 1,
      ]
    );
    pid = r.insertId;
    console.log("Paciente insertado con id=" + pid);
  }

  // ── 2. Análisis ────────────────────────────────────────────────────────────
  const [[yaAnalisis]] = await prod.query(
    "SELECT id FROM analisis WHERE paciente_id = ?", [pid]
  );
  if (!yaAnalisis) {
    await prod.execute(
      `INSERT INTO analisis
         (paciente_id, numero_registro, fecha, tir, tar, tar_muy_alto,
          tar_alto, tbr, tbr_bajo, tbr_muy_bajo, gmi, cv,
          tiempo_activo, glucosa_promedio, gri, eventos_hipoglucemia,
          duracion_hipoglucemia, clasificacion,
          limitacion_internet, limitacion_alergias, limitacion_economica)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        pid, 1, "2026-04-18",
        60.8, 35.5, 13.9, 21.6, 3.7, 2.7, 1.0,
        7.2, 48.5, 96.5, 163.0, 49.0, 18, 43,
        "ALTO_RIESGO", 0, 0, 0,
      ]
    );
    console.log("Análisis insertado");
  } else {
    console.log("Análisis ya existe, omitido");
  }

  // ── 3. Historial insulina ──────────────────────────────────────────────────
  const [rowsIns] = await prod.query(
    "SELECT id FROM historial_insulina WHERE paciente_id = ?", [pid]
  );
  if (rowsIns.length === 0) {
    const insulinas = [
      ["2025-10-15", "Glargina", "Lispro",  "14", 14.0, "10ui", 10.0, "Inicio tratamiento"],
      ["2025-11-12", "Glargina", "Lispro",  "15", 15.0, "11ui", 11.0, "Ajuste por hiperglucemia"],
      ["2025-12-10", "Glargina", "Lispro",  "15", 15.0, "12ui", 12.0, "Ajuste seasonal"],
      ["2026-01-08", "Glargina", "Aspart",  "14", 14.0, "11ui", 11.0, "Cambio a Aspart"],
      ["2026-02-14", "Glargina", "Aspart",  "13", 13.0, "10ui", 10.0, "Mejor control"],
      ["2026-03-20", "Glargina", "Aspart",  "13", 13.0, "9ui",   9.0, "Reducción por hipoglucemias"],
    ];
    for (const [fecha, ip, ic, dp, dpu, dc, dcu, motivo] of insulinas) {
      await prod.execute(
        `INSERT INTO historial_insulina
           (paciente_id, fecha, insulina_prolongada, insulina_corta,
            dosis_prolongada, dosis_prolongada_u, dosis_corta, dosis_corta_u,
            via_administracion, motivo_cambio)
         VALUES (?,?,?,?,?,?,?,?,'Subcutánea',?)`,
        [pid, fecha, ip, ic, dp, dpu, dc, dcu, motivo]
      );
    }
    console.log("6 registros de insulina insertados");
  } else {
    console.log("Insulina ya existe, omitido");
  }

  // ── 4. Planes de alimentación ──────────────────────────────────────────────
  const [rowsAlim] = await prod.query(
    "SELECT id FROM planes_alimentacion WHERE paciente_id = ?", [pid]
  );
  if (rowsAlim.length === 0) {
    const planes = [
      ["2025-10-15", "Balanceada",            1800, 200, 70, 60, 25, "3 comidas + 2 meriendas"],
      ["2025-11-12", "Balanceada",            1850, 210, 72, 62, 26, "3 comidas + 2 meriendas"],
      ["2025-12-10", "Alta en fibra",         1900, 225, 74, 63, 27, "3 comidas + 2 meriendas"],
      ["2026-01-08", "Balanceada",            1850, 215, 73, 61, 28, "3 comidas + 2 meriendas"],
      ["2026-02-14", "Balanceada",            1800, 200, 70, 60, 27, "3 comidas + 1 merienda"],
      ["2026-03-20", "Baja en carbohidratos", 1750, 190, 68, 58, 26, "3 comidas"],
    ];
    for (const [fecha, dieta, cal, carb, prot, gras, fib, dist] of planes) {
      await prod.execute(
        `INSERT INTO planes_alimentacion
           (paciente_id, fecha, tipo_dieta, calorias_dia,
            carbohidratos_g, proteinas_g, grasas_g, fibra_g,
            distribucion, elaborado_por)
         VALUES (?,?,?,?,?,?,?,?,?,'Nutricionista')`,
        [pid, fecha, dieta, cal, carb, prot, gras, fib, dist]
      );
    }
    console.log("6 planes de alimentación insertados");
  } else {
    console.log("Alimentación ya existe, omitido");
  }

  await prod.end();
  console.log("\n✅ Pedro Pérez Prueba migrado a producción correctamente");
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
