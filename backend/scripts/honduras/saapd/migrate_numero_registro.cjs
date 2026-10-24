/**
 * Corrige numero_registro en registros existentes.
 * Asigna 1, 2, 3... por paciente ordenando por fecha ASC.
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

  try {
    console.log('Actualizando numero_registro...');

    await conn.query(`
      UPDATE analisis a
      JOIN (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY paciente_id ORDER BY fecha ASC) AS rn
        FROM analisis
      ) ranked ON a.id = ranked.id
      SET a.numero_registro = ranked.rn
    `);

    const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM analisis');
    console.log(`✅ ${total} registros actualizados correctamente.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}

migrar();
