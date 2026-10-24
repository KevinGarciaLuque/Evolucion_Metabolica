import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { BACKEND_DIR, UPLOADS_PATH, SCRIPTS_DIR } from "../../../../shared/paths.js";
import { dumpDatabase, importSqlDump } from "../../../../shared/utils/sqlDump.js";

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
export function iniciarMigracionLegacy({ sqlText, cfg, pool, usuario }) {
  const id = crypto.randomUUID();
  const t = {
    id, estado: "corriendo", paso: "Preparando", pasoActual: 0, totalPasos: PASOS.length + 2,
    log: [], backup: null, error: null, inicio: Date.now(), fin: null, usuario,
  };
  trabajos.set(id, t);
  trabajoActivo = id;

  (async () => {
    let admin;
    try {
      // 1. Backup
      t.paso = "Respaldando base actual";
      log(t, "Generando backup de la base actual…");
      fs.mkdirSync(backupsDir, { recursive: true });
      const backupSql = await dumpDatabase(pool);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupsDir, `renaced_mexico_${ts}.sql`);
      fs.writeFileSync(backupPath, backupSql, "utf8");
      t.backup = path.basename(backupPath);
      log(t, `Backup guardado: ${t.backup}`);
      t.pasoActual = 1;

      // 2. Base temporal con el dump viejo
      t.paso = "Cargando archivo en base temporal";
      admin = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password });
      await admin.query(`DROP DATABASE IF EXISTS \`${DB_TEMPORAL}\``);
      await admin.query(`CREATE DATABASE \`${DB_TEMPORAL}\` CHARACTER SET utf8mb4`);
      log(t, `Cargando el .sql en la base temporal ${DB_TEMPORAL}…`);
      await importSqlDump({ ...cfg, database: DB_TEMPORAL }, sqlText);
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
      log(t, `Base temporal lista (${n} tablas).`);
      t.pasoActual = 2;

      // 3. ETL
      const envOrigen = {
        ORIGEN_DB_HOST: cfg.host, ORIGEN_DB_PORT: String(cfg.port),
        ORIGEN_DB_USER: cfg.user, ORIGEN_DB_PASSWORD: cfg.password,
        ORIGEN_DB_NAME: DB_TEMPORAL,
      };
      for (let i = 0; i < PASOS.length; i++) {
        const [nombre, archivo] = PASOS[i];
        t.paso = nombre;
        log(t, `▶ ${nombre} (${archivo})`);
        const code = await correrScript(t, archivo, envOrigen);
        if (code !== 0) throw new Error(`El paso "${nombre}" terminó con error (código ${code}). Revisa el detalle.`);
        t.pasoActual = 3 + i;
      }

      t.paso = "Terminado";
      t.estado = "terminado";
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
