// Resumen del dashboard guardado en la tabla `resumen_dashboard` de cada país.
// Con millones de registros las agregaciones tardan segundos; por eso:
//  - Resumen fresco (menos de DASHBOARD_TTL_SEG, 5 min por defecto): se sirve tal cual.
//  - Resumen viejo: se sirve igual (rápido) y se recalcula en segundo plano.
//  - Sin resumen todavía: se calcula una vez y se guarda.
// Un solo cálculo a la vez por clave (evita que 50 usuarios disparen 50 cálculos).

const TTL_MS = Number(process.env.DASHBOARD_TTL_SEG || 300) * 1000;
const MAX_EDAD_MS = 24 * 60 * 60 * 1000; // pasado esto se espera el cálculo en vez de servir un dato muy viejo

const tablasListas = new WeakSet();   // pools con la tabla ya creada
const enCurso = new Map();            // `${poolId}:${clave}` -> Promise

async function asegurarTabla(db) {
  if (tablasListas.has(db)) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS resumen_dashboard (
      clave        VARCHAR(60) NOT NULL PRIMARY KEY,
      payload      LONGTEXT    NOT NULL,
      calculado_en DATETIME    NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  tablasListas.add(db);
}

const idPool = new WeakMap();
let seq = 0;
const poolId = (db) => { if (!idPool.has(db)) idPool.set(db, ++seq); return idPool.get(db); };

async function recalcular(db, clave, args, calcular) {
  const k = `${poolId(db)}:${clave}`;
  if (enCurso.has(k)) return enCurso.get(k);
  const p = (async () => {
    const resumen = await calcular(db, args);
    const calculado_en = new Date();
    const dato = { ...resumen, calculado_en: calculado_en.toISOString() };
    await db.query(
      `INSERT INTO resumen_dashboard (clave, payload, calculado_en) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), calculado_en = NOW()`,
      [clave, JSON.stringify(dato)]
    );
    return dato;
  })().finally(() => enCurso.delete(k));
  enCurso.set(k, p);
  return p;
}

export async function obtenerResumen(db, { esAdmin, unidad_id, forzar = false, calcular }) {
  const clave = `${esAdmin ? "adm" : "usr"}:${unidad_id || "todas"}`;
  const args = { esAdmin, unidad_id };
  try {
    await asegurarTabla(db);
    if (!forzar) {
      const [[fila]] = await db.query(
        "SELECT payload, TIMESTAMPDIFF(SECOND, calculado_en, NOW()) AS edad_seg FROM resumen_dashboard WHERE clave = ?", [clave]
      );
      if (fila) {
        const edadMs = fila.edad_seg * 1000;
        if (edadMs < MAX_EDAD_MS) {
          if (edadMs >= TTL_MS) recalcular(db, clave, args, calcular).catch((e) => console.error("Resumen dashboard:", e.message));
          return JSON.parse(fila.payload);
        }
      }
    }
  } catch (e) {
    // Si la tabla de resumen falla, el dashboard sigue funcionando calculando directo
    console.error("Resumen dashboard (caché):", e.message);
    return { ...(await calcular(db, args)), calculado_en: new Date().toISOString() };
  }
  return recalcular(db, clave, args, calcular);
}
