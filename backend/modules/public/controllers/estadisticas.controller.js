import pool from "../../../shared/config/db.master.js";
import mysql from "mysql2/promise";
import { asegurarTabla } from "../../admin/services/paginasWeb.js";
import { rutaPagina } from "../../../shared/utils/paginaWeb.js";
import { consultarStatsTenant } from "../../admin/controllers/tenants.controller.js";

// Endpoint público (sin login) para la landing de ALAD: solo expone agregados
// nacionales (nombre del país, bandera, total de pacientes) — nunca datos de
// pacientes individuales ni información interna del tenant (db_name, db_host,
// configuración). También sirve como catálogo de países para el selector de login.
export const getEstadisticasPublicas = async (req, res) => {
  try {
    const [tenants] = await pool.query(
      `SELECT nombre, codigo FROM tenants WHERE activo = 1 ORDER BY nombre`
    );

    // Páginas web activas: si el país tiene una, la landing lo lleva allí antes del login.
    await asegurarTabla();
    const [activas] = await pool.query(`SELECT tenant_codigo FROM paginas_web WHERE activa = 1`);
    const conPagina = new Set(activas.map((a) => a.tenant_codigo));

    const estadisticas = await Promise.all(
      tenants.map(async (t) => {
        try {
          const [[tenantFull]] = await pool.query(
            `SELECT db_name, db_host FROM tenants WHERE codigo = ?`, [t.codigo]
          );
          const tp = mysql.createPool({
            host: tenantFull.db_host || process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: tenantFull.db_name,
            port: process.env.DB_PORT,
            connectionLimit: 1,
          });
          const s = await consultarStatsTenant(tp, t);
          await tp.end();
          return { pais: t.nombre, codigo: t.codigo, total_pacientes: Number(s.total_pacientes) || 0, pagina_ruta: conPagina.has(t.codigo) ? rutaPagina(t) : null };
        } catch (_) {
          return { pais: t.nombre, codigo: t.codigo, total_pacientes: null, pagina_ruta: conPagina.has(t.codigo) ? rutaPagina(t) : null };
        }
      })
    );

    res.json(estadisticas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};
