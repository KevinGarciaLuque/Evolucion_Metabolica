/**
 * Seed script - Paciente de prueba: Helen Zhen
 * Datos reales extraídos del PDF Syai X1 (Feb 19 - Mar 5, 2026)
 * 
 * Métricas CGM:
 *   TIR: 68.6%  |  TAR: 30.4%  |  TBR: 1.0%
 *   GMI: 7.0%   |  CV: 39.0%   |  Tiempo activo: 93.5%
 *   Glucosa promedio: 154 mg/dL |  GRI: 33.5
 *   Hipoglucemia: 3 eventos, duración promedio: 65 min
 *   Clasificación ISPAD: MODERADO
 */

const mysql = require("mysql2/promise");
const fs    = require("fs");
const path  = require("path");
require("dotenv").config();

async function seed() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "123456789",
    database: process.env.DB_NAME     || "evolucion_metabolica",
    port:     Number(process.env.DB_PORT) || 3306,
  });

  try {
    // ── 1. Copiar PDF a uploads/pdfs ────────────────────────────────────────────
    const origen  = path.join(__dirname, "Helen Zhen .pdf");
    const destDir = path.join(__dirname, "uploads", "pdfs");
    const destNombre = `helen_zhen_${Date.now()}.pdf`;
    const destino = path.join(destDir, destNombre);

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    if (fs.existsSync(origen)) {
      fs.copyFileSync(origen, destino);
      console.log("✅ PDF copiado a:", destino);
    } else {
      console.warn("⚠️  PDF origen no encontrado:", origen);
    }

    // ── 2. Insertar paciente ────────────────────────────────────────────────────
    // Primero verificar si ya existe por DNI
    const [existe] = await conn.query(
      "SELECT id FROM pacientes WHERE dni = ?",
      ["HZ-2026-001"]
    );

    let pacienteId;

    if (existe.length > 0) {
      pacienteId = existe[0].id;
      console.log(`ℹ️  Paciente ya existe con id=${pacienteId}, se reutiliza.`);
    } else {
      const [resP] = await conn.query(
        `INSERT INTO pacientes
          (dni, nombre, fecha_nacimiento, edad, sexo, departamento, peso, talla, tipo_diabetes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "HZ-2026-001",       // dni
          "Helen Zhen",        // nombre
          "2010-09-15",        // fecha_nacimiento (15 años en feb 2026)
          15,                  // edad
          "F",                 // sexo
          "Francisco Morazán", // departamento (Honduras)
          65.1,                // peso (kg) - del PDF
          161,                 // talla (cm) - del PDF
          "Tipo 1",            // tipo_diabetes
        ]
      );
      pacienteId = resP.insertId;
      console.log(`✅ Paciente creado con id=${pacienteId}`);
    }

    // ── 3. Insertar análisis ────────────────────────────────────────────────────
    const [resA] = await conn.query(
      `INSERT INTO analisis
        (paciente_id, fecha, tir, tar, tbr, gmi, cv, tiempo_activo,
         glucosa_promedio, gri, eventos_hipoglucemia, duracion_hipoglucemia,
         clasificacion, archivo_pdf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pacienteId,
        "2026-03-05",          // fecha (fin del período de análisis)
        68.6,                  // tir
        30.4,                  // tar
        1.0,                   // tbr
        7.0,                   // gmi
        39.0,                  // cv
        93.5,                  // tiempo_activo
        154.0,                 // glucosa_promedio
        33.5,                  // gri
        3,                     // eventos_hipoglucemia
        65,                    // duracion_hipoglucemia (minutos promedio)
        "MODERADO",            // clasificacion ISPAD
        fs.existsSync(origen) ? destNombre : null,  // archivo_pdf
      ]
    );
    const analisisId = resA.insertId;
    console.log(`✅ Análisis creado con id=${analisisId} → clasificación: MODERADO`);

    // ── 4. Insertar historial_resumen ───────────────────────────────────────────
    await conn.query(
      "INSERT INTO historial_resumen (paciente_id, fecha, tir, gmi, cv) VALUES (?, ?, ?, ?, ?)",
      [pacienteId, "2026-03-05", 68.6, 7.0, 39.0]
    );
    console.log("✅ Historial resumen registrado");

    console.log("\n🎉 Seed completado con éxito!");
    console.log(`   Paciente: Helen Zhen (id=${pacienteId})`);
    console.log(`   Análisis id=${analisisId}: TIR 68.6% | TAR 30.4% | TBR 1% | GMI 7.0% | GRI 33.5`);
    console.log(`   Clasificación ISPAD: MODERADO`);

  } catch (err) {
    console.error("❌ Error en seed:", err.message);
    if (err.sqlMessage) console.error("   SQL:", err.sqlMessage);
  } finally {
    await conn.end();
  }
}

seed();
