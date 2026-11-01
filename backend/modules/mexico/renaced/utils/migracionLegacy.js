import { asegurarEsquema } from "./asegurarEsquema.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { BACKEND_DIR, UPLOADS_PATH, SCRIPTS_DIR } from "../../../../shared/paths.js";
import { dumpDatabase, importSqlDumpConProgreso } from "../../../../shared/utils/sqlDump.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = BACKEND_DIR;
const backupsDir = path.join(UPLOADS_PATH, "renaced_backups");

const DB_TEMPORAL = "renaced1_import_tmp";

// Orden exacto documentado en MIGRACION_RENACED.md
const PASOS = [
  ["Esquema base",                  "migrate_renaced_mexico.cjs"],
  ["Datos (pacientes, consultas…)", "migrate_renaced_datos.cjs"],
  ["Datos 2",                       "migrate_renaced_datos2.cjs"],
  ["Datos 3",                       "migrate_renaced_datos3.cjs"],
  ["Datos 4",                       "migrate_renaced_datos4.cjs"],
  ["Datos 5",                       "migrate_renaced_datos5.cjs"],
  ["Diagnóstico completo",          "migrate_renaced_diagnostico_full.cjs"],
  ["Laboratorio completo",          "migrate_renaced_laboratorio_full.cjs"],
  ["Eventos",                       "migrate_renaced_evento_completo.cjs"],
  ["Evaluación complementaria",     "migrate_renaced_evaluacion_complementaria.cjs"],
  ["Monitoreo por periodo",         "migrate_renaced_monitoreo_periodo.cjs"],
  ["Tratamiento otros",             "migrate_renaced_tratamiento_otx.cjs"],
  ["Ajuste de dosis",               "migrate_renaced_ajuste_dosis.cjs"],
  ["Corrección de terapia",         "migrate_fix_terapia.cjs"],
];

// Solo en modo "actualizar": los pacientes recién cargados reciben folio (los que ya tenían conservan el suyo)
const PASO_FOLIOS = ["Folios RENACED", "migrate_renaced_folio.cjs"];

// Tablas de datos de pacientes que vienen del sistema anterior. En modo "actualizar" se vacían
// antes de cargar el dump nuevo. NO se tocan usuarios, perfiles, médicos, clínicas, catálogos,
// escaneos de monitores (escaneo_mcg) ni alertas. Las que no existan en la base se omiten.
const TABLAS_A_VACIAR = [
  "paciente_cambio_estatus", "diagnostico", "reclasificacion", "consulta", "evaluacion",
  "evaluacion_complementaria", "laboratorio", "tratamiento", "tratamiento_insulina_detalle",
  "tratamiento_hist_dosis", "tratamiento_oral", "tratamiento_otx", "tratamiento_ajuste_dosis_detalle",
  "tratamiento_ajuste_dosis", "monitoreo", "monitoreo_periodo", "antecedentes_go", "antecedente_embarazo",
  "estilovida", "toxicomanias", "patologia", "ccronica", "comorbilidad", "embarazo", "educacion",
  "evento", "menarca", "resumen_dashboard", "paciente",
];
// Tablas con paciente_id que se conservan a propósito (datos creados en la app nueva o derivados)
const TABLAS_CONSERVADAS = new Set(["escaneo_mcg", "alerta_riesgo", "auditoria", "_folios_respaldo"]);

// Reparto del porcentaje total entre las fases
const FASES = { backup: [0, 5], carga: [5, 35], limpieza: [35, 40], etl: [40, 95], cierre: [95, 100] };
function avance(t, fase, fraccion = 0, detalle = "") {
  const [a, b] = FASES[fase];
  t.porcentaje = Math.max(t.porcentaje || 0, Math.round(a + (b - a) * Math.min(Math.max(fraccion, 0), 1)));
  if (detalle) t.detalle = detalle;
}
const mb = (n) => (n / 1048576).toFixed(1);

const conectar = (cfg) =>
  mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: cfg.database });

// Vacía las tablas de pacientes migrados, guardando antes los folios RENACED ya asignados.
async function limpiarDatosMigrados(t, cfg) {
  const conn = await conectar(cfg);
  try {
    const [filas] = await conn.query(
      "SELECT TABLE_NAME n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [cfg.database]
    );
    const existentes = new Set(filas.map((f) => f.n));

    // Folios: se respaldan (IGNORE conserva lo ya respaldado si una corrida anterior falló a medias)
    if (existentes.has("paciente")) {
      await conn.query("CREATE TABLE IF NOT EXISTS _folios_respaldo (paciente_id INT UNSIGNED NOT NULL PRIMARY KEY, folio_renaced INT UNSIGNED NOT NULL)");
      const [r] = await conn.query(
        "INSERT IGNORE INTO _folios_respaldo (paciente_id, folio_renaced) SELECT id, folio_renaced FROM paciente WHERE folio_renaced IS NOT NULL"
      );
      log(t, `Folios RENACED respaldados: ${r.affectedRows}`);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    const lista = TABLAS_A_VACIAR.filter((n) => existentes.has(n));
    for (let i = 0; i < lista.length; i++) {
      const [[{ c }]] = await conn.query(`SELECT COUNT(*) c FROM \`${lista[i]}\``);
      await conn.query(`TRUNCATE TABLE \`${lista[i]}\``);
      log(t, `   vaciada ${lista[i]} (${c} filas)`);
      avance(t, "limpieza", (i + 1) / lista.length, `Vaciando ${lista[i]}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS=1");

    // Aviso de tablas con paciente_id que no se limpiaron (por si hay tablas no previstas)
    const [conPac] = await conn.query(
      "SELECT DISTINCT TABLE_NAME n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'paciente_id'", [cfg.database]
    );
    const sinLimpiar = conPac.map((f) => f.n).filter((n) => !lista.includes(n) && !TABLAS_CONSERVADAS.has(n) && existentes.has(n));
    if (sinLimpiar.length) log(t, `⚠ Tablas con paciente_id que NO se vaciaron: ${sinLimpiar.join(", ")}`);
  } finally {
    await conn.end();
  }
}

// Restaura los folios guardados a los pacientes que ya existían y elimina el respaldo.
async function restaurarFolios(t, cfg) {
  const conn = await conectar(cfg);
  try {
    const [hay] = await conn.query(
      "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = '_folios_respaldo'", [cfg.database]
    );
    if (!hay[0].n) return;
    const [r] = await conn.query(
      "UPDATE paciente p JOIN _folios_respaldo f ON f.paciente_id = p.id SET p.folio_renaced = f.folio_renaced"
    );
    log(t, `Folios restaurados a pacientes existentes: ${r.affectedRows}`);
    await conn.query("DROP TABLE _folios_respaldo");
  } finally {
    await conn.end();
  }
}

// Estado de trabajos en memoria (un trabajo a la vez).
const trabajos = new Map();
let trabajoActivo = null;

export function obtenerTrabajo(id) {
  return trabajos.get(id) || null;
}
export function hayTrabajoActivo() {
  return !!trabajoActivo;
}

function log(t, msg) {
  t.log.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  if (t.log.length > 2000) t.log.splice(0, t.log.length - 2000);
}

function correrScript(t, archivo, envExtra) {
  return new Promise((resolve) => {
    const hijo = spawn(process.execPath, [path.join(SCRIPTS_DIR, "mexico", "renaced", archivo)], {
      cwd: backendDir,
      env: { ...process.env, ...envExtra },
    });
    const volcar = (buf) => {
      for (const l of buf.toString("utf8").split(/\r?\n/)) {
        if (l.trim()) log(t, `   ${l}`);
      }
    };
    hijo.stdout.on("data", volcar);
    hijo.stderr.on("data", volcar);
    hijo.on("error", (e) => { log(t, `   ❌ ${e.message}`); resolve(1); });
    hijo.on("close", (code) => resolve(code ?? 1));
  });
}

// Inicia la migración en segundo plano y devuelve el id del trabajo.
// cfg: { host, port, user, password, database } de la base destino (renaced_mexico)
// modo: "fusionar" (conserva lo existente) | "actualizar" (vacía los datos de pacientes migrados y recarga todo)
export function iniciarMigracionLegacy({ sqlText, cfg, pool, usuario, modo = "fusionar" }) {
  const id = crypto.randomUUID();
  const actualizar = modo === "actualizar";
  const pasos = actualizar ? [...PASOS, PASO_FOLIOS] : PASOS;
  const t = {
    id, modo, estado: "corriendo", paso: "Preparando", pasoActual: 0, totalPasos: pasos.length + 2,
    porcentaje: 0, detalle: "",
    log: [], backup: null, error: null, inicio: Date.now(), fin: null, usuario,
  };
  trabajos.set(id, t);
  trabajoActivo = id;

  (async () => {
    let admin;
    try {
      log(t, actualizar
        ? "Modo ACTUALIZAR: se vaciarán los datos de pacientes y se recargarán desde el archivo."
        : "Modo FUSIONAR: se conserva lo existente.");

      // 1. Backup
      t.paso = "Respaldando base actual";
      avance(t, "backup", 0.1, "Generando respaldo…");
      log(t, "Generando backup de la base actual…");
      fs.mkdirSync(backupsDir, { recursive: true });
      const backupSql = await dumpDatabase(pool);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupsDir, `renaced_mexico_${ts}.sql`);
      fs.writeFileSync(backupPath, backupSql, "utf8");
      t.backup = path.basename(backupPath);
      log(t, `Backup guardado: ${t.backup}`);
      t.pasoActual = 1;
      avance(t, "backup", 1, `Respaldo guardado (${mb(Buffer.byteLength(backupSql))} MB)`);

      // 2. Base temporal con el dump viejo (con avance por tandas)
      t.paso = "Cargando archivo en base temporal";
      admin = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password });
      await admin.query(`DROP DATABASE IF EXISTS \`${DB_TEMPORAL}\``);
      await admin.query(`CREATE DATABASE \`${DB_TEMPORAL}\` CHARACTER SET utf8mb4`);
      log(t, `Cargando el .sql en la base temporal ${DB_TEMPORAL}…`);
      await importSqlDumpConProgreso({ ...cfg, database: DB_TEMPORAL }, sqlText, (f, hechos, total) =>
        avance(t, "carga", f, `Cargando archivo: ${mb(hechos)} MB de ${mb(total)} MB`));
      const [[{ n }]] = await admin.query(
        "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=?", [DB_TEMPORAL]
      );
      const [[{ n: clave }]] = await admin.query(
        "SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('paciente','consulta','ccronica')",
        [DB_TEMPORAL]
      );
      if (clave < 3) {
        throw new Error("El archivo no parece ser un dump del sistema PHP original (faltan las tablas paciente, consulta y ccronica).");
      }
      const [[{ pacs }]] = await admin.query(`SELECT COUNT(*) pacs FROM \`${DB_TEMPORAL}\`.paciente`);
      log(t, `Base temporal lista (${n} tablas, ${pacs} pacientes en el archivo).`);
      t.pasoActual = 2;
      avance(t, "carga", 1, `Archivo cargado (${pacs} pacientes)`);

      // 3. (solo actualizar) vaciar los datos migrados; el archivo ya quedó validado arriba
      if (actualizar) {
        t.paso = "Vaciando datos anteriores";
        avance(t, "limpieza", 0, "Vaciando datos anteriores…");
        log(t, "Vaciando los datos de pacientes del sistema anterior…");
        await limpiarDatosMigrados(t, cfg);
      }
      avance(t, "limpieza", 1);

      // 4. ETL
      const envOrigen = {
        ORIGEN_DB_HOST: cfg.host, ORIGEN_DB_PORT: String(cfg.port),
        ORIGEN_DB_USER: cfg.user, ORIGEN_DB_PASSWORD: cfg.password,
        ORIGEN_DB_NAME: DB_TEMPORAL,
      };
      for (let i = 0; i < pasos.length; i++) {
        const [nombre, archivo] = pasos[i];
        t.paso = nombre;
        avance(t, "etl", i / pasos.length, `Paso ${i + 1} de ${pasos.length}: ${nombre}`);
        log(t, `▶ ${nombre} (${archivo})`);
        // Los folios guardados se restauran justo antes de asignar folio a los pacientes nuevos
        if (actualizar && archivo === PASO_FOLIOS[1]) await restaurarFolios(t, cfg);
        const code = await correrScript(t, archivo, envOrigen);
        if (code !== 0) throw new Error(`El paso "${nombre}" terminó con error (código ${code}). Revisa el detalle.`);
        t.pasoActual = 3 + i;
        avance(t, "etl", (i + 1) / pasos.length, `Paso ${i + 1} de ${pasos.length} listo: ${nombre}`);
      }

      t.paso = "Verificando esquema";
      avance(t, "cierre", 0.3, "Verificando esquema…");
      await asegurarEsquema(pool, cfg.database, true);
      if (actualizar) {
        try {
          const [[{ huerfanos }]] = await pool.query(
            "SELECT COUNT(*) huerfanos FROM escaneo_mcg WHERE paciente_id NOT IN (SELECT id FROM paciente)"
          );
          if (huerfanos) log(t, `⚠ ${huerfanos} escaneos MCG son de pacientes que ya no existen (no se borraron).`);
        } catch { /* la tabla puede no existir */ }
      }

      t.paso = "Terminado";
      t.estado = "terminado";
      t.porcentaje = 100;
      t.detalle = "Migración terminada";
      log(t, "✅ Migración terminada.");
    } catch (e) {
      t.estado = "error";
      t.error = e?.message || String(e);
      log(t, `❌ ${t.error}`);
    } finally {
      try { if (admin) await admin.query(`DROP DATABASE IF EXISTS \`${DB_TEMPORAL}\``); } catch { /* ignorar */ }
      try { if (admin) await admin.end(); } catch { /* ignorar */ }
      t.fin = Date.now();
      trabajoActivo = null;
    }
  })();

  return id;
}
