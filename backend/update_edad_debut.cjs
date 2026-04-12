/**
 * Actualiza el campo edad_debut en pacientes existentes leyendo
 * las columnas C (edad_debut) y D (DNI) del Excel actual.
 *
 * Columnas de la hoja HMEP (0-indexed):
 *   0 = fechaColocacion
 *   1 = nombre (con HTML span)
 *   2 = edad_debut  ← NUEVA columna "Edad del debut"
 *   3 = DNI
 *
 * Columnas de la hoja IHSS (0-indexed):
 *   0 = fechaColocacion
 *   1 = nombre
 *   2 = edad_debut
 *   3 = DNI
 */
const XLSX  = require('xlsx');
const mysql = require('mysql2/promise');
const path  = require('path');
require('dotenv').config();

const EXCEL_FILE = path.join(__dirname, 'Niños con MCG con GRAFICOS abril 2.xlsx');

/** Extrae número entero de edad ("10 AÑOS" → 10, "2 años" → 2, 5 → 5) */
function normEdad(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const m = String(v).match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

/** Limpia DNI de saltos de línea y espacios */
function normDni(s) {
  if (!s) return null;
  return String(s).replace(/\r?\n.*/g, '').trim() || null;
}

async function actualizar() {
  const wb = XLSX.readFile(EXCEL_FILE);
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  let actualizados = 0, sinDni = 0, noencontrado = 0;

  const hojas = ['HMEP', 'IHSS'].filter(h => wb.SheetNames.includes(h));

  for (const hoja of hojas) {
    console.log(`\n📋 Hoja: ${hoja}`);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: '' });

    for (let i = 6; i < rows.length; i++) {
      const r = rows[i];
      const edadDebut = normEdad(r[2]);  // columna C
      const dni       = normDni(r[3]);   // columna D

      if (edadDebut === null) continue;  // fila sin dato de edad debut
      if (!dni) { sinDni++; continue; }

      const [res] = await conn.query(
        'UPDATE pacientes SET edad_debut = ? WHERE dni = ?',
        [edadDebut, dni]
      );

      if (res.affectedRows > 0) {
        actualizados++;
        console.log(`  ✅ DNI ${dni} → edad_debut = ${edadDebut}`);
      } else {
        noencontrado++;
        console.log(`  ⚠️  No encontrado en BD: DNI ${dni}`);
      }
    }
  }

  await conn.end();
  console.log(`\n🎉 Listo: ${actualizados} actualizados, ${sinDni} sin DNI, ${noencontrado} no encontrados`);
}

actualizar().catch(e => { console.error(e); process.exit(1); });
