/**
 * Migración 3 – Campos faltantes del Excel IHSS
 * Agrega a `pacientes`:
 *   - edad_debut   : edad del paciente al momento del diagnóstico (TINYINT)
 *   - direccion    : dirección completa (colonia, municipio, dpto.)
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const ALTERACIONES = [
  "ALTER TABLE pacientes ADD COLUMN edad_debut TINYINT UNSIGNED NULL COMMENT 'Edad al diagnóstico de diabetes (años)' AFTER fecha_nacimiento",
  "ALTER TABLE pacientes ADD COLUMN direccion VARCHAR(255) NULL COMMENT 'Dirección completa: colonia, municipio, departamento' AFTER procedencia_tipo",
];

async function migrar() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  console.log('🔧 Iniciando migración 3...\n');

  for (const sql of ALTERACIONES) {
    try {
      await conn.query(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
      console.log(`  ✅ ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
        console.log(`  ⏭  Ya existe: ${col}`);
      } else {
        console.error(`  ❌ ${e.message}\n     SQL: ${sql.substring(0, 90)}`);
      }
    }
  }

  await conn.end();
  console.log('\n🎉 Migración 3 completada');
}

migrar().catch(e => { console.error(e); process.exit(1); });
