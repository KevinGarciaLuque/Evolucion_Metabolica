/**
 * Import masivo desde Excel "Niños con MCG con GRAFICOS abril 2.xlsx"
 * - Hoja HMEP: 36 pacientes, hasta 6 lecturas (registros MCG) cada uno
 * - Hoja IHSS: 21 pacientes, 1 lectura cada uno
 *
 * Conversión de valores: si value ≤ 1 → value × 100 (fracción → %)
 *                        si value > 1  → usar tal cual (ya es %)
 */
const XLSX  = require('xlsx');
const mysql = require('mysql2/promise');
const path  = require('path');
require('dotenv').config();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convierte valor que puede ser fracción (0.70) o porcentaje (70.1) */
function toPercent(v) {
  if (v === '' || v === null || v === undefined || isNaN(v)) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return n > 1 ? parseFloat(n.toFixed(2)) : parseFloat((n * 100).toFixed(2));
}

/** Suma dos porcentajes (pueden ser fracciones o %) */
function sumPercent(a, b) {
  const pa = toPercent(a);
  const pb = toPercent(b);
  if (pa === null && pb === null) return null;
  return parseFloat(((pa || 0) + (pb || 0)).toFixed(2));
}

/** Normaliza nombre: titlecase y limpia */
function normNombre(s) {
  if (!s) return '';
  // Quitar contenido entre paréntesis (fechas de seguimiento añadidas)
  return s.replace(/\(.*?\)/g, '').replace(/\r?\n.*/g, '').trim()
    .toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/** Limpia DNI */
function normDni(s) {
  if (!s) return null;
  return String(s).replace(/\r?\n.*/g, '').trim() || null;
}

/** Extrae número entero de edad (ej: "11 años" → 11) */
function normEdad(v) {
  if (typeof v === 'number') return v;
  const m = String(v).match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

/** Clasifica ISPAD */
function clasificarISPAD(tir, tar, tbr, gmi) {
  if (tir >= 70 && tar <= 25 && tbr <= 4 && (gmi === null || gmi <= 7)) return 'OPTIMO';
  if (tir >= 50 && tar <= 35 && tbr <= 8) return 'MODERADO';
  return 'ALTO_RIESGO';
}

/** Parsea texto de duración a minutos: "43 min" → 43, "1h 20min" → 80 */
function parseDuracion(s) {
  if (!s) return null;
  const str = String(s);
  const hours = str.match(/(\d+)\s*h/i);
  const mins  = str.match(/(\d+)\s*min/i);
  return (hours ? parseInt(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1]) : 0) || null;
}

/** Convierte géneros */
function normSexo(g) {
  if (!g) return 'F';
  const s = String(g).toLowerCase();
  if (s.startsWith('m') || s === 'masculino') return 'M';
  return 'F';
}

// ─── Columnas HMEP ──────────────────────────────────────────────────────────
// Cada métrica ocupa 6 columnas (1 por registro)
const HMEP_COLS = {
  fechaColocacion: 0, item: 1, nombre: 2, dni: 3,
  urbana: 4, rural: 5, telefono: 6, edad: 7, sexo: 8,
  tipoInsulina: 9, dosis: 10, glucometriasDia: 11, hba1cPrevio: 12,
  // grupos de 6 (índice base)
  TIR:         13,
  TAR_MUY_ALTO: 19,
  TAR_ALTO:    25,
  TBR_BAJO:    31,
  TBR_MUY_BAJO: 37,
  GRI:         43,
  TA:          49,
  CV:          55,
  GMI:         61,
  HIPOS_N:     67,
  HIPOS_DURACION: 73,
  DOSIS_POST:  79,
  // campos patient-level (columna única después de las 6 dosis post)
  COMENTARIOS:  85,
  HBA1C_POST:   86,
  LIM_INTERNET: 87,
  LIM_ALERGIAS: 88,
  LIM_ECONOMICA: 89,
  CAL_BUENA:    90,
  CAL_MALA:     91,
  CAL_IGUAL:    92,
};

// ─── Columnas IHSS ──────────────────────────────────────────────────────────
const IHSS_COLS = {
  fechaColocacion: 0, item: 1, nombre: 2, dni: 3,
  urbana: 4, rural: 5, telefono: 6, edad: 7, sexo: 8,
  tipoInsulina: 9, dosis: 10, glucometriasDia: 11, hba1cPrevio: 12,
  TIR:          13,
  TAR_MUY_ALTO: 14,
  TAR_ALTO:     15,
  TBR_BAJO:     16,
  TBR_MUY_BAJO: 17,
  GRI:          18,
  TA:           19,
  CV:           20,
  GMI:          21,
  HIPOS_N:      22,
  HIPOS_DURACION: 23,
  DOSIS_POST:   24,
  SE_MODIFICO:  25,
  DOSIS_MOD:    26,
  HBA1C_POST:   27,
  LIM_INTERNET: 28,
  LIM_ALERGIAS: 29,
  LIM_ECONOMICA:30,
  CAL_BUENA:    31,
  CAL_MALA:     32,
  CAL_IGUAL:    33,
  COMENTARIOS:  34,
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function importarExcel() {
  const wb = XLSX.readFile(path.join(__dirname, 'Niños con MCG con GRAFICOS abril 2.xlsx'));

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME     || 'evolucion_metabolica',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  let totalPacientes = 0, totalAnalisis = 0;

  // ─── Procesar HMEP ────────────────────────────────────────────────────────
  console.log('\n📋 Procesando hoja HMEP...');
  const hmepData = XLSX.utils.sheet_to_json(wb.Sheets['HMEP'], { header: 1, defval: '' });

  for (let i = 6; i < hmepData.length; i++) {
    const r = hmepData[i];
    const item = r[HMEP_COLS.item];
    if (!item || typeof item !== 'number') continue;

    const nombre = normNombre(r[HMEP_COLS.nombre]);
    if (!nombre) continue;

    const dni     = normDni(r[HMEP_COLS.dni]);
    const edad    = normEdad(r[HMEP_COLS.edad]);
    const sexo    = normSexo(r[HMEP_COLS.sexo]);
    const telefon = String(r[HMEP_COLS.telefono] || '').trim() || null;
    const hba1c   = toPercent(r[HMEP_COLS.hba1cPrevio]);
    const tipoIns = String(r[HMEP_COLS.tipoInsulina] || '').trim() || null;
    const dosiKg  = String(r[HMEP_COLS.dosis] || '').trim() || null;
    const glucom  = String(r[HMEP_COLS.glucometriasDia] || '').trim() || null;

    // Determinar departamento (urbana o rural)
    const deptUrbana = String(r[HMEP_COLS.urbana] || '').trim();
    const deptRural  = String(r[HMEP_COLS.rural]  || '').trim();
    const departamento = deptUrbana || deptRural || 'Francisco Morazán';
    const procTipo = deptUrbana ? 'Urbana' : (deptRural ? 'Rural' : null);

    // Insertar paciente
    try {
      const [res] = await conn.query(
        `INSERT INTO pacientes
          (dni, nombre, edad, sexo, departamento, procedencia_tipo, institucion, tipo_diabetes,
           hba1c_previo, tipo_insulina, dosis_por_kg, promedio_glucometrias, telefono)
         VALUES (?, ?, ?, ?, ?, ?, 'HMEP', 'Tipo 1', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre=VALUES(nombre), edad=VALUES(edad), institucion='HMEP',
           procedencia_tipo=VALUES(procedencia_tipo),
           hba1c_previo=VALUES(hba1c_previo),
           tipo_insulina=VALUES(tipo_insulina), dosis_por_kg=VALUES(dosis_por_kg),
           promedio_glucometrias=VALUES(promedio_glucometrias), telefono=VALUES(telefono)`,
        [dni, nombre, edad, sexo, departamento, procTipo, hba1c, tipoIns, dosiKg, glucom, telefon]
      );

      let pacienteId;
      if (res.insertId && res.insertId > 0) {
        pacienteId = res.insertId;
        totalPacientes++;
        console.log(`  ✅ Paciente #${item}: ${nombre}`);
      } else {
        // ON DUPLICATE: obtener id existente
        const [existing] = await conn.query('SELECT id FROM pacientes WHERE dni=?', [dni]);
        if (existing.length) pacienteId = existing[0].id;
        else { console.warn(`  ⚠️  No se pudo insertar: ${nombre}`); continue; }
      }

      // Campos patient-level (Observaciones, HbA1c post, limitaciones, calidad vida)
      const comentarios  = String(r[HMEP_COLS.COMENTARIOS]  || '').trim() || null;
      const hba1cPost    = r[HMEP_COLS.HBA1C_POST]
        ? parseFloat(String(r[HMEP_COLS.HBA1C_POST]).replace(/%+/, '')) || null : null;
      const limInternet  = String(r[HMEP_COLS.LIM_INTERNET]  || '').trim() ? 1 : 0;
      const limAlergias  = String(r[HMEP_COLS.LIM_ALERGIAS]  || '').trim() ? 1 : 0;
      const limEconomica = String(r[HMEP_COLS.LIM_ECONOMICA] || '').trim() ? 1 : 0;
      const calBuena = String(r[HMEP_COLS.CAL_BUENA] || '').trim();
      const calMala  = String(r[HMEP_COLS.CAL_MALA]  || '').trim();
      const calIgual = String(r[HMEP_COLS.CAL_IGUAL] || '').trim();
      const calidadVida = calBuena ? 'Buena' : (calMala ? 'Mala' : (calIgual ? 'Igual' : null));

      // Insertar hasta 6 registros MCG
      for (let reg = 0; reg < 6; reg++) {
        const tirCol = HMEP_COLS.TIR + reg;
        const tirVal = toPercent(r[tirCol]);
        if (tirVal === null) continue; // sin dato para este registro

        const tarMuyAlto = toPercent(r[HMEP_COLS.TAR_MUY_ALTO + reg]);
        const tarAlto    = toPercent(r[HMEP_COLS.TAR_ALTO     + reg]);
        const tbrBajo    = toPercent(r[HMEP_COLS.TBR_BAJO     + reg]);
        const tbrMuyBajo = toPercent(r[HMEP_COLS.TBR_MUY_BAJO + reg]);
        const tar        = sumPercent(tarMuyAlto, tarAlto);
        const tbr        = sumPercent(tbrBajo, tbrMuyBajo);
        const gri        = toPercent(r[HMEP_COLS.GRI + reg]);
        const ta         = toPercent(r[HMEP_COLS.TA  + reg]);
        const cv         = toPercent(r[HMEP_COLS.CV  + reg]);
        const gmi        = toPercent(r[HMEP_COLS.GMI + reg]);
        const hiposN     = r[HMEP_COLS.HIPOS_N     + reg] !== '' ? parseInt(r[HMEP_COLS.HIPOS_N     + reg]) || null : null;
        const hiposDurStr = String(r[HMEP_COLS.HIPOS_DURACION + reg] || '').trim() || null;
        const hiposDur   = parseDuracion(hiposDurStr);
        const dosisPost  = String(r[HMEP_COLS.DOSIS_POST + reg] || '').trim() || null;
        const fechaColStr = String(r[HMEP_COLS.fechaColocacion] || '').trim() || null;

        const clasificacion = clasificarISPAD(tirVal, tar || 0, tbr || 0, gmi);
        const fecha = new Date(2025, 11, 1 + reg * 15); // dic 2025 en adelante

        await conn.query(
          `INSERT INTO analisis
            (paciente_id, numero_registro, fecha, fecha_colocacion, tir, tar, tar_muy_alto, tar_alto,
             tbr, tbr_bajo, tbr_muy_bajo, gmi, cv, tiempo_activo, gri,
             eventos_hipoglucemia, duracion_hipoglucemia,
             duracion_hipo_texto, clasificacion, dosis_insulina_post,
             hba1c_post_mcg, limitacion_internet, limitacion_alergias,
             limitacion_economica, calidad_vida, comentarios)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pacienteId, reg + 1, fecha.toISOString().split('T')[0], fechaColStr,
            tirVal, tar, tarMuyAlto, tarAlto, tbr, tbrBajo, tbrMuyBajo,
            gmi, cv, ta, gri, hiposN, hiposDur,
            hiposDurStr, clasificacion, dosisPost,
            hba1cPost, limInternet, limAlergias, limEconomica, calidadVida, comentarios,
          ]
        );
        totalAnalisis++;
      }

    } catch (e) {
      console.error(`  ❌ Error en fila ${i} (${nombre}):`, e.message);
    }
  }

  // ─── Procesar IHSS ────────────────────────────────────────────────────────
  console.log('\n📋 Procesando hoja IHSS...');
  const ihssData = XLSX.utils.sheet_to_json(wb.Sheets['IHSS'], { header: 1, defval: '' });

  for (let i = 4; i < ihssData.length; i++) {
    const r = ihssData[i];
    const item = r[IHSS_COLS.item];
    if (!item || typeof item !== 'number') continue;

    const nombre = normNombre(r[IHSS_COLS.nombre]);
    if (!nombre) continue;

    const dni     = normDni(r[IHSS_COLS.dni]);
    const edad    = normEdad(r[IHSS_COLS.edad]);
    const sexo    = normSexo(r[IHSS_COLS.sexo]);
    const telefon = String(r[IHSS_COLS.telefono] || '').trim() || null;
    const hba1c   = r[IHSS_COLS.hba1cPrevio]
      ? parseFloat(String(r[IHSS_COLS.hba1cPrevio]).replace(/%+/, '')) || null
      : null;
    const tipoIns = String(r[IHSS_COLS.tipoInsulina] || '').trim() || null;
    const dosiKg  = String(r[IHSS_COLS.dosis] || '').trim() || null;
    const glucom  = String(r[IHSS_COLS.glucometriasDia] || '').trim() || null;

    const deptUrbana = String(r[IHSS_COLS.urbana] || '').trim();
    const deptRural  = String(r[IHSS_COLS.rural]  || '').trim();
    const departamento = deptUrbana || deptRural || 'Francisco Morazán';
    const procTipo = deptUrbana ? 'Urbana' : (deptRural ? 'Rural' : null);

    try {
      const [res] = await conn.query(
        `INSERT INTO pacientes
          (dni, nombre, edad, sexo, departamento, procedencia_tipo, institucion, tipo_diabetes,
           hba1c_previo, tipo_insulina, dosis_por_kg, promedio_glucometrias, telefono)
         VALUES (?, ?, ?, ?, ?, ?, 'IHSS', 'Tipo 1', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre=VALUES(nombre), edad=VALUES(edad), institucion='IHSS',
           procedencia_tipo=VALUES(procedencia_tipo),
           hba1c_previo=VALUES(hba1c_previo),
           tipo_insulina=VALUES(tipo_insulina), dosis_por_kg=VALUES(dosis_por_kg),
           promedio_glucometrias=VALUES(promedio_glucometrias), telefono=VALUES(telefono)`,
        [dni, nombre, edad, sexo, departamento, procTipo, hba1c, tipoIns, dosiKg, glucom, telefon]
      );

      let pacienteId;
      if (res.insertId && res.insertId > 0) {
        pacienteId = res.insertId;
        totalPacientes++;
        console.log(`  ✅ Paciente #${item}: ${nombre}`);
      } else {
        const [existing] = await conn.query('SELECT id FROM pacientes WHERE dni=?', [dni]);
        if (existing.length) pacienteId = existing[0].id;
        else { console.warn(`  ⚠️  No se pudo insertar: ${nombre}`); continue; }
      }

      // IHSS: 1 único registro MCG
      const tirVal     = toPercent(r[IHSS_COLS.TIR]);
      if (tirVal === null) continue;

      const tarMuyAlto = toPercent(r[IHSS_COLS.TAR_MUY_ALTO]);
      const tarAlto    = toPercent(r[IHSS_COLS.TAR_ALTO]);
      const tbrBajo    = toPercent(r[IHSS_COLS.TBR_BAJO]);
      const tbrMuyBajo = toPercent(r[IHSS_COLS.TBR_MUY_BAJO]);
      const tar        = sumPercent(tarMuyAlto, tarAlto);
      const tbr        = sumPercent(tbrBajo, tbrMuyBajo);
      const gri        = toPercent(r[IHSS_COLS.GRI]);
      const ta         = toPercent(r[IHSS_COLS.TA]);
      const cv         = toPercent(r[IHSS_COLS.CV]);
      const gmi        = toPercent(r[IHSS_COLS.GMI]);
      const hiposN     = r[IHSS_COLS.HIPOS_N] !== '' ? parseInt(r[IHSS_COLS.HIPOS_N]) || null : null;
      const hiposDurStr = String(r[IHSS_COLS.HIPOS_DURACION] || '').trim() || null;
      const hiposDur   = parseDuracion(hiposDurStr);
      const dosisPost  = String(r[IHSS_COLS.DOSIS_POST] || '').trim() || null;
      const fechaColStr = String(r[IHSS_COLS.fechaColocacion] || '').trim() || null;

      // Campos IHSS específicos
      const seMod       = String(r[IHSS_COLS.SE_MODIFICO] || '').trim();
      const seModBool   = seMod ? 1 : null;
      const dosisMod    = String(r[IHSS_COLS.DOSIS_MOD] || '').trim() || null;
      const hba1cPost   = r[IHSS_COLS.HBA1C_POST]
        ? parseFloat(String(r[IHSS_COLS.HBA1C_POST]).replace(/%+/, '')) || null
        : null;
      const limInternet  = String(r[IHSS_COLS.LIM_INTERNET]  || '').trim() ? 1 : 0;
      const limAlergias  = String(r[IHSS_COLS.LIM_ALERGIAS]  || '').trim() ? 1 : 0;
      const limEconomica = String(r[IHSS_COLS.LIM_ECONOMICA] || '').trim() ? 1 : 0;
      const calBuena = String(r[IHSS_COLS.CAL_BUENA] || '').trim();
      const calMala  = String(r[IHSS_COLS.CAL_MALA]  || '').trim();
      const calIgual = String(r[IHSS_COLS.CAL_IGUAL] || '').trim();
      const calidadVida = calBuena ? 'Buena' : (calMala ? 'Mala' : (calIgual ? 'Igual' : null));
      const comentarios  = String(r[IHSS_COLS.COMENTARIOS] || '').trim() || null;

      const clasificacion = clasificarISPAD(tirVal, tar || 0, tbr || 0, gmi);

      await conn.query(
        `INSERT INTO analisis
          (paciente_id, numero_registro, fecha, fecha_colocacion, tir, tar, tar_muy_alto, tar_alto,
           tbr, tbr_bajo, tbr_muy_bajo, gmi, cv, tiempo_activo, gri,
           eventos_hipoglucemia, duracion_hipoglucemia, duracion_hipo_texto,
           clasificacion, dosis_insulina_post,
           se_modifico_dosis, dosis_modificada, hba1c_post_mcg,
           limitacion_internet, limitacion_alergias, limitacion_economica,
           calidad_vida, comentarios)
         VALUES (?, 1, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId, fechaColStr,
          tirVal, tar, tarMuyAlto, tarAlto, tbr, tbrBajo, tbrMuyBajo,
          gmi, cv, ta, gri, hiposN, hiposDur, hiposDurStr,
          clasificacion, dosisPost,
          seModBool, dosisMod, hba1cPost,
          limInternet, limAlergias, limEconomica,
          calidadVida, comentarios,
        ]
      );
      totalAnalisis++;

    } catch (e) {
      console.error(`  ❌ Error en fila ${i} (${nombre}):`, e.message);
    }
  }

  await conn.end();

  console.log(`\n🎉 Importación completada:`);
  console.log(`   📦 Pacientes insertados: ${totalPacientes}`);
  console.log(`   📊 Análisis insertados:  ${totalAnalisis}`);
}

importarExcel().catch(e => { console.error(e); process.exit(1); });
