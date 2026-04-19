const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  // 1 ── Agregar columnas numéricas a historial_insulina
  const addCols = [
    "ALTER TABLE historial_insulina ADD COLUMN dosis_corta_u DECIMAL(6,2) NULL",
    "ALTER TABLE historial_insulina ADD COLUMN dosis_prolongada_u DECIMAL(6,2) NULL",
  ];
  for (const sql of addCols) {
    try { await c.execute(sql); console.log("✅", sql.split("ADD")[1].trim()); }
    catch (e) { if (e.code === "ER_DUP_FIELDNAME") console.log("ℹ️  Ya existe:", sql); else throw e; }
  }

  // 2 ── Datos de prueba para Pedro Pérez Prueba (id=45)
  const PAC = 45;

  // Limpiar datos previos de prueba para este paciente
  await c.execute("DELETE FROM historial_insulina WHERE paciente_id = ?", [PAC]);
  await c.execute("DELETE FROM planes_alimentacion WHERE paciente_id = ?", [PAC]);

  // 6 registros mensuales de insulina (últimos 6 meses)
  const insulinas = [
    { fecha: "2025-10-15", insulina_prolongada: "Glargina", insulina_corta: "Lispro", dosis_prolongada: "14", dosis_prolongada_u: 14, dosis_corta: "10ui", dosis_corta_u: 10, motivo_cambio: "Inicio tratamiento" },
    { fecha: "2025-11-12", insulina_prolongada: "Glargina", insulina_corta: "Lispro", dosis_prolongada: "15", dosis_prolongada_u: 15, dosis_corta: "11ui", dosis_corta_u: 11, motivo_cambio: "Ajuste por hiperglucemia" },
    { fecha: "2025-12-10", insulina_prolongada: "Glargina", insulina_corta: "Lispro", dosis_prolongada: "15", dosis_prolongada_u: 15, dosis_corta: "12ui", dosis_corta_u: 12, motivo_cambio: "Ajuste seasonal" },
    { fecha: "2026-01-08", insulina_prolongada: "Glargina", insulina_corta: "Aspart",  dosis_prolongada: "14", dosis_prolongada_u: 14, dosis_corta: "11ui", dosis_corta_u: 11, motivo_cambio: "Cambio a Aspart" },
    { fecha: "2026-02-14", insulina_prolongada: "Glargina", insulina_corta: "Aspart",  dosis_prolongada: "13", dosis_prolongada_u: 13, dosis_corta: "10ui", dosis_corta_u: 10, motivo_cambio: "Mejor control" },
    { fecha: "2026-03-20", insulina_prolongada: "Glargina", insulina_corta: "Aspart",  dosis_prolongada: "13", dosis_prolongada_u: 13, dosis_corta: "9ui",  dosis_corta_u: 9,  motivo_cambio: "Reducción por hipoglucemias" },
  ];

  for (const r of insulinas) {
    await c.execute(
      `INSERT INTO historial_insulina (paciente_id, fecha, insulina_prolongada, insulina_corta,
        dosis_prolongada, dosis_corta, dosis_prolongada_u, dosis_corta_u, via_administracion, motivo_cambio)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [PAC, r.fecha, r.insulina_prolongada, r.insulina_corta,
       r.dosis_prolongada, r.dosis_corta, r.dosis_prolongada_u, r.dosis_corta_u,
       "Subcutánea", r.motivo_cambio]
    );
  }
  console.log("✅ 6 registros de insulina insertados");

  // 6 planes de alimentación (mismo período)
  const planes = [
    { fecha: "2025-10-15", calorias_dia: 1800, carbohidratos_g: 200, proteinas_g: 70, grasas_g: 60, fibra_g: 25, tipo_dieta: "Balanceada", distribucion: "3 comidas + 2 meriendas" },
    { fecha: "2025-11-12", calorias_dia: 1850, carbohidratos_g: 210, proteinas_g: 72, grasas_g: 62, fibra_g: 26, tipo_dieta: "Balanceada", distribucion: "3 comidas + 2 meriendas" },
    { fecha: "2025-12-10", calorias_dia: 1900, carbohidratos_g: 225, proteinas_g: 74, grasas_g: 63, fibra_g: 27, tipo_dieta: "Alta en fibra", distribucion: "3 comidas + 2 meriendas" },
    { fecha: "2026-01-08", calorias_dia: 1850, carbohidratos_g: 215, proteinas_g: 73, grasas_g: 61, fibra_g: 28, tipo_dieta: "Balanceada", distribucion: "3 comidas + 2 meriendas" },
    { fecha: "2026-02-14", calorias_dia: 1800, carbohidratos_g: 200, proteinas_g: 70, grasas_g: 60, fibra_g: 27, tipo_dieta: "Balanceada", distribucion: "3 comidas + 1 merienda" },
    { fecha: "2026-03-20", calorias_dia: 1750, carbohidratos_g: 190, proteinas_g: 68, grasas_g: 58, fibra_g: 26, tipo_dieta: "Baja en carbohidratos", distribucion: "3 comidas" },
  ];

  for (const r of planes) {
    await c.execute(
      `INSERT INTO planes_alimentacion (paciente_id, fecha, tipo_dieta, calorias_dia,
        carbohidratos_g, proteinas_g, grasas_g, fibra_g, distribucion, elaborado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [PAC, r.fecha, r.tipo_dieta, r.calorias_dia,
       r.carbohidratos_g, r.proteinas_g, r.grasas_g, r.fibra_g,
       r.distribucion, "Nutricionista"]
    );
  }
  console.log("✅ 6 planes de alimentación insertados");
  console.log("✅ Migración ICR completada para Pedro Pérez Prueba (id=45)");
  await c.end();
})();
