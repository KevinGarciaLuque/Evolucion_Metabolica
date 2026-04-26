const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const medicamentos = [
    "Insulina Glargina 14 U/noche (basal)",
    "Insulina Lispro ratio 1:15 g CHO (preprandial)",
    "Corrección: 1 U por cada 50 mg/dL > 150 mg/dL",
  ].join("\n");

  const observaciones = [
    "Paciente masculino de 10 años con diabetes monogénica (MODY 2). Acude a control mensual acompañado por madre.",
    "",
    "Control glucémico: Glucosa en ayunas 134 mg/dL, HbA1c 7.2% — mejoría respecto a consulta anterior (7.5%).",
    "",
    "Se realiza medición de peso y talla: peso 36.2 kg, talla 141.5 cm, IMC 18.1 kg/m² (acorde al percentil para la edad).",
    "",
    "Tensión arterial 100/65 mmHg — dentro de rangos normales para la edad.",
    "",
    "Madre refiere mejor adherencia al conteo de carbohidratos. Sin episodios de hipoglucemia severa el último mes. 2 episodios leves (< 70 mg/dL) que se resolvieron con jugo sin necesidad de urgencias.",
    "",
    "Examen físico sin hallazgos relevantes. Sin lipodistrofia en sitios de inyección. Desarrollo puberal: Tanner G2 / PH2, acorde a la edad.",
  ].join("\n");

  const plan = [
    "Se ajusta dosis basal de Glargina de 14 a 15 U/noche por tendencia hiperglucémica matutina.",
    "",
    "Se mantiene ratio preprandial 1:15 g CHO. Se refuerza técnica de conteo de carbohidratos con la familia.",
    "",
    "Se indica hemograma y perfil lipídico en laboratorio antes de próxima consulta.",
    "",
    "Controlar glucosa capilar mínimo 4 veces/día (ayunas, pre-almuerzo, pre-cena, 2 h posprandial).",
    "Metas: Glucosa ayunas 80–130 mg/dL, posprandial < 180 mg/dL.",
    "",
    "Se orienta a familia sobre manejo de hipoglucemia (regla de 15-15). Próxima cita en 4 semanas.",
  ].join("\n");

  const tannerObs = "Inicio de desarrollo puberal acorde a los 10 años. G2: inicio de aumento testicular. PH2: vello púbico escaso y fino. Desarrollo puberal dentro del rango esperado para la edad.";

  const [result] = await pool.query(
    `INSERT INTO consultas
      (paciente_id, fecha, tipo_consulta, peso, talla, glucosa_ayunas,
       hba1c, tension_arterial, medicamentos, observaciones, plan_tratamiento,
       proxima_cita, tanner_genitales, tanner_vello_pubico, tanner_observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      46,
      "2026-04-25",
      "Control",
      36.2,
      141.5,
      134,
      7.2,
      "100/65 mmHg",
      medicamentos,
      observaciones,
      plan,
      "2026-05-23",
      2,
      2,
      tannerObs,
    ]
  );

  console.log("✅  Consulta creada con ID:", result.insertId);
  await pool.end();
}

run().catch((err) => { console.error(err); process.exit(1); });
