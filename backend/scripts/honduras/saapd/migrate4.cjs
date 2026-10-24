/**
 * Migración 4: Agrega campos municipio, antecedente_familiar,
 * subtipo_monogenica, nombre_tutor, telefono_tutor a la tabla pacientes.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const alteraciones = [
  "ALTER TABLE pacientes ADD COLUMN municipio VARCHAR(120) NULL AFTER departamento",
  "ALTER TABLE pacientes ADD COLUMN antecedente_familiar TEXT NULL AFTER direccion",
  "ALTER TABLE pacientes ADD COLUMN subtipo_monogenica VARCHAR(80) NULL AFTER tipo_diabetes",
  "ALTER TABLE pacientes ADD COLUMN nombre_tutor VARCHAR(200) NULL AFTER telefono",
  "ALTER TABLE pacientes ADD COLUMN telefono_tutor VARCHAR(120) NULL AFTER nombre_tutor",
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
      console.log('✅', sql.substring(0, 90));
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭  Ya existe:', sql.match(/ADD COLUMN (\w+)/)?.[1]);
      } else {
        console.error('❌', e.message);
      }
    }
  }

  await conn.end();
  console.log('\n🎉 Migración 4 completada');
}

migrar().catch(e => { console.error(e); process.exit(1); });
