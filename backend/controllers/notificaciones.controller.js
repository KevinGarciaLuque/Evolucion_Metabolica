import pool from "../config/db.js";
import { getTenantPool } from "../config/db.renaced.js";

// Sirve a los dos mundos (Evolución Metabólica y RENACED): el token decide de
// dónde salen los datos. Las tablas `avisos` y `novedades` viven en la base
// principal y son globales para todos los usuarios.

let tablasListas = null;
function asegurarTablas() {
  if (!tablasListas) {
    tablasListas = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS avisos (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          titulo      VARCHAR(150) NOT NULL,
          mensaje     TEXT         DEFAULT NULL,
          creado_por  VARCHAR(150) DEFAULT NULL,
          fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          vence_en    DATE         DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    })().catch((e) => { tablasListas = null; throw e; });
  }
  return tablasListas;
}

const esSuperAdmin = (u) => u?.rol === "SUPER_ADMIN" || !!u?.super_admin;

function soloSuperAdmin(req, res) {
  if (!esSuperAdmin(req.usuario)) {
    res.status(403).json({ error: "Solo el Super Admin puede hacer esto" });
    return false;
  }
  return true;
}

// ── Campana ───────────────────────────────────────────────────────────────────
async function altoRiesgoEM(u) {
  const params = [];
  let filtro = "";
  if (Array.isArray(u.instituciones_acceso) && u.rol !== "admin" && u.rol !== "SUPER_ADMIN") {
    const inst = u.instituciones_acceso.map((i) => String(i).trim().toUpperCase()).filter(Boolean);
    if (inst.length) { filtro = ` AND p.institucion IN (${inst.map(() => "?").join(",")})`; params.push(...inst); }
  }
  const [rows] = await pool.query(
    `SELECT p.id AS paciente_id, p.nombre, a.fecha, a.tir, a.tbr
       FROM pacientes p
       JOIN analisis a ON a.id = (SELECT a2.id FROM analisis a2 WHERE a2.paciente_id = p.id
                                  ORDER BY a2.fecha DESC, a2.id DESC LIMIT 1)
      WHERE p.estado = 1 AND a.clasificacion = 'ALTO_RIESGO'${filtro}
      ORDER BY a.fecha DESC LIMIT 100`, params);
  return rows;
}

async function altoRiesgoRenaced(db) {
  const [rows] = await db.query(
    `SELECT p.id AS paciente_id, CONCAT_WS(' ', p.nombre, p.ap_pat) AS nombre, e.fecha, e.tir, e.tbr
       FROM paciente p
       JOIN escaneo_mcg e ON e.id = (SELECT e2.id FROM escaneo_mcg e2 WHERE e2.paciente_id = p.id
                                     ORDER BY e2.fecha DESC, e2.id DESC LIMIT 1)
      WHERE e.clasificacion = 'ALTO_RIESGO'
      ORDER BY e.fecha DESC LIMIT 100`);
  return rows;
}

const aTxt = (v) => (v === null || v === undefined ? null : String(v));

export async function obtenerNotificaciones(req, res) {
  const u = req.usuario;
  const esRenaced = u?.tipo === "renaced" && u?.db_name;
  const items = [];

  const intentar = async (fn) => { try { await fn(); } catch (e) { console.error("Notificaciones:", e.message); } };

  try { await asegurarTablas(); } catch (e) { console.error("Notificaciones (tablas):", e.message); }

  // 1) Avisos del Super Admin
  await intentar(async () => {
    const [rows] = await pool.query(
      `SELECT id, titulo, mensaje, creado_por, fecha FROM avisos
        WHERE vence_en IS NULL OR vence_en >= CURDATE()
        ORDER BY fecha DESC LIMIT 20`);
    for (const r of rows) {
      items.push({ clave: `aviso-${r.id}`, tipo: "aviso", id: r.id, titulo: r.titulo, detalle: r.mensaje, fecha: aTxt(r.fecha) });
    }
  });

  // 2) Pacientes en alto riesgo (último análisis/escaneo)
  await intentar(async () => {
    const rows = esRenaced
      ? await altoRiesgoRenaced(getTenantPool(u.db_name, u.db_host))
      : await altoRiesgoEM(u);
    for (const r of rows.slice(0, 15)) {
      items.push({
        clave: `riesgo-${r.paciente_id}-${r.fecha}`, tipo: "riesgo",
        titulo: `${r.nombre || "Paciente"} en alto riesgo`,
        detalle: `TIR ${r.tir ?? "—"}% · TBR ${r.tbr ?? "—"}%`,
        fecha: aTxt(r.fecha), paciente_id: r.paciente_id,
      });
    }
    items.totalRiesgo = rows.length;
  });
  const totalRiesgo = items.totalRiesgo ?? 0;

  // 3) Escaneos / análisis MCG recientes (últimos 7 días)
  await intentar(async () => {
    const [rows] = esRenaced
      ? await getTenantPool(u.db_name, u.db_host).query(
          `SELECT e.id, e.paciente_id, e.fecha, e.clasificacion, CONCAT_WS(' ', p.nombre, p.ap_pat) AS nombre
             FROM escaneo_mcg e JOIN paciente p ON p.id = e.paciente_id
            WHERE e.creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY e.creado_en DESC LIMIT 8`)
      : await pool.query(
          `SELECT a.id, a.paciente_id, a.fecha, a.clasificacion, p.nombre
             FROM analisis a JOIN pacientes p ON p.id = a.paciente_id
            WHERE a.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ORDER BY a.fecha DESC, a.id DESC LIMIT 8`);
    for (const r of rows) {
      items.push({
        clave: `escaneo-${r.id}`, tipo: "escaneo",
        titulo: `Reporte MCG cargado: ${r.nombre || "paciente"}`,
        detalle: r.clasificacion ? `Clasificación: ${String(r.clasificacion).replace("_", " ")}` : null,
        fecha: aTxt(r.fecha), paciente_id: r.paciente_id,
      });
    }
  });

  // 4) Actividad del sistema (últimos 7 días)
  await intentar(async () => {
    // En RENACED los inicios de sesión viven en la bitácora, no en la campana.
    if (!esRenaced) {
      const [rows] = await pool.query(
        `SELECT id, usuario_nombre, accion, entidad, descripcion, fecha FROM auditoria_sesiones
          WHERE accion NOT IN ('login','logout') AND fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY fecha DESC LIMIT 8`);
      for (const r of rows) {
        items.push({
          clave: `act-${r.id}`, tipo: "actividad",
          titulo: `${r.usuario_nombre || "Un usuario"}: ${r.accion}${r.entidad ? ` ${r.entidad}` : ""}`,
          detalle: r.descripcion, fecha: aTxt(r.fecha),
        });
      }
    }
  });

  items.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  res.json({ items: [...items], totalRiesgo });
}

// ── Avisos (Super Admin) ──────────────────────────────────────────────────────
export async function crearAviso(req, res) {
  if (!soloSuperAdmin(req, res)) return;
  const titulo = String(req.body?.titulo || "").trim();
  if (!titulo) return res.status(400).json({ error: "El título es obligatorio" });
  try {
    await asegurarTablas();
    const [r] = await pool.query(
      "INSERT INTO avisos (titulo, mensaje, creado_por, vence_en) VALUES (?, ?, ?, ?)",
      [titulo.slice(0, 150), req.body?.mensaje?.trim() || null, req.usuario.nombre || req.usuario.email || null, req.body?.vence_en || null]);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al crear el aviso" });
  }
}

export async function eliminarAviso(req, res) {
  if (!soloSuperAdmin(req, res)) return;
  try {
    await asegurarTablas();
    await pool.query("DELETE FROM avisos WHERE id = ?", [req.params.id]);
    res.json({ deleted: 1 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al eliminar el aviso" });
  }
}
