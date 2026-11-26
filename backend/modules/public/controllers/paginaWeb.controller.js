import pool from "../../../shared/config/db.master.js";
import { asegurarTabla, parseContenido } from "../../admin/services/paginasWeb.js";
import { slugPais, sistemaDe, loginDe } from "../../../shared/utils/paginaWeb.js";

// Página pública de un país. Solo responde si el Super Admin la activó.
export const getPaginaPublica = async (req, res) => {
  try {
    await asegurarTabla();
    const [tenants] = await pool.query(`SELECT nombre, codigo FROM tenants WHERE activo = 1`);
    const t = tenants.find((x) => slugPais(x.nombre) === req.params.pais && sistemaDe(x.codigo) === req.params.sistema);
    if (!t) return res.status(404).json({ error: "No encontrada" });
    const [[p]] = await pool.query(`SELECT activa, contenido FROM paginas_web WHERE tenant_codigo = ?`, [t.codigo]);
    if (!p || !p.activa) return res.status(404).json({ error: "No encontrada" });
    res.json({ pais: t.nombre, codigo: t.codigo, sistema: sistemaDe(t.codigo), login: loginDe(t.codigo), contenido: parseContenido(p.contenido) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la página" });
  }
};
