import pool from "../../../shared/config/db.master.js";
import { asegurarTabla, parseContenido, cacheGet, cacheSet } from "../../admin/services/paginasWeb.js";
import { slugPais, sistemaDe, loginDe, plantillaContenido, fusionar } from "../../../shared/utils/paginaWeb.js";

// Página pública de un país. Solo responde si el Super Admin la activó.
export const getPaginaPublica = async (req, res) => {
  try {
    const clave = `${req.params.pais}/${req.params.sistema}`;
    res.set("Cache-Control", "public, max-age=30");
    const enCache = cacheGet(clave);
    if (enCache) return res.json(enCache);
    await asegurarTabla();
    const [tenants] = await pool.query(`SELECT nombre, codigo FROM tenants WHERE activo = 1`);
    const t = tenants.find((x) => slugPais(x.nombre) === req.params.pais && sistemaDe(x.codigo) === req.params.sistema);
    if (!t) return res.status(404).json({ error: "No encontrada" });
    const [[p]] = await pool.query(`SELECT activa, contenido FROM paginas_web WHERE tenant_codigo = ?`, [t.codigo]);
    if (!p || !p.activa) return res.status(404).json({ error: "No encontrada" });
    const datos = { pais: t.nombre, codigo: t.codigo, sistema: sistemaDe(t.codigo), login: loginDe(t.codigo), contenido: fusionar(plantillaContenido(t), parseContenido(p.contenido)) };
    cacheSet(clave, datos);
    res.json(datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la página" });
  }
};
