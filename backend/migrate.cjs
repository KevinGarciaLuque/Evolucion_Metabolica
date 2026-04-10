/**
 * Migración de base de datos:
 * - Agrega institucion (HMEP/IHSS), hba1c_previo, telefono a pacientes
 * - Agrega numero_registro, tar_muy_alto, tbr_muy_bajo a analisis
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const alteraciones = [
  "ALTER TABLE pacientes ADD COLUMN institucion ENUM('HMEP','IHSS') NOT NULL DEFAULT 'HMEP' AFTER departamento",
  "ALTER TABLE pacientes ADD COLUMN hba1c_previo DECIMAL(5,2) NULL AFTER tipo_diabetes",
  "ALTER TABLE pacientes ADD COLUMN telefono VARCHAR(120) NULL AFTER hba1c_previo",
  "ALTER TABLE analisis ADD COLUMN numero_registro TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER paciente_id",
  "ALTER TABLE analisis ADD COLUMN tar_muy_alto DECIMAL(5,2) NULL AFTER tar",
  "ALTER TABLE analisis ADD COLUMN tbr_muy_bajo DECIMAL(5,2) NULL AFTER tbr",
  "ALTER TABLE analisis ADD COLUMN duracion_hipo_texto VARCHAR(30) NULL AFTER duracion_hipoglucemia",
  "ALTER TABLE analisis ADD COLUMN dosis_insulina_post VARCHAR(200) NULL AFTER archivo_pdf",
];

async function migrar() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  for (const sql of alteraciones) {
    try {
      await conn.query(sql);
      console.log('✅', sql.substring(0, 80));
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭  Ya existe:', sql.match(/ADD COLUMN (\w+)/)?.[1]);
      } else {
        console.error('❌', e.message);
      }
    }
  }

  // Helen Zhen → HMEP
  await conn.query("UPDATE pacientes SET institucion='HMEP' WHERE id=1");
  console.log('✅ Helen Zhen → institucion=HMEP');

  await conn.end();
  console.log('\n🎉 Migración completada');
}

migrar().catch(e => { console.error(e); process.exit(1); });
