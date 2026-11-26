// "Mi página web" de Honduras: las doctoras (rol admin) editan el contenido de su página pública.
// La activación (publicar/ocultar) sigue siendo del Super Admin.
import pool from "../../../../shared/config/db.master.js";
import { asegurarTabla, parseContenido, invalidarCachePaginas } from "../../../admin/services/paginasWeb.js";
import { plantillaContenido, fusionar, limpiarContenido, rutaPagina, sistemaDe, loginDe } from "../../../../shared/utils/paginaWeb.js";

const CODIGO = "hn";

async function tenant() {
  const [[t]] = await pool.query(`SELECT nombre, codigo FROM tenants WHERE codigo = ?`, [CODIGO]);
  return t;
}

export const obtenerMiPagina = async (req, res) => {
  try {
    await asegurarTabla();
    const t = await tenant();
    if (!t) return res.status(404).json({ error: "País no encontrado" });
    const [[p]] = await pool.query(`SELECT activa, contenido FROM paginas_web WHERE tenant_codigo = ?`, [CODIGO]);
    res.json({
      codigo: t.codigo, pais: t.nombre, ruta: rutaPagina(t), sistema: sistemaDe(t.codigo), login: loginDe(t.codigo),
      creada: !!p, activa: !!p?.activa,
      contenido: fusionar(plantillaContenido(t), p ? parseContenido(p.contenido) : null),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la página" });
  }
};

export const guardarMiPagina = async (req, res) => {
  try {
    await asegurarTabla();
    const t = await tenant();
    if (!t) return res.status(404).json({ error: "País no encontrado" });
    const contenido = JSON.stringify(limpiarContenido(req.body?.contenido));
    // Si aún no existe se crea inactiva: el Super Admin decide cuándo publicarla.
    await pool.query(
      `INSERT INTO paginas_web (tenant_codigo, activa, contenido) VALUES (?, 0, ?)
       ON DUPLICATE KEY UPDATE contenido = VALUES(contenido)`,
      [CODIGO, contenido]
    );
    invalidarCachePaginas();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar la página" });
  }
};
