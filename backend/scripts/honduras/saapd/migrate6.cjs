/**
 * Migración 6 – Agrega columna anticuerpos a pacientes
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrar() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  console.log('🔧 Iniciando migración 6...\n');

  const sql = "ALTER TABLE pacientes ADD COLUMN anticuerpos VARCHAR(300) NULL AFTER tipo_insulina_2";
  try {
    await conn.query(sql);
    console.log('  ✅ anticuerpos agregada');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('  ⏭  Ya existe: anticuerpos');
    } else {
      console.error('  ❌', e.message);
    }
  }

  await conn.end();
  console.log('\n🎉 Migración 6 completada');
}

migrar().catch(console.error);
