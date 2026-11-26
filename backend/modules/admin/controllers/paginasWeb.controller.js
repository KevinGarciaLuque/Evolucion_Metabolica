import pool from "../../../shared/config/db.master.js";
import { asegurarTabla, parseContenido } from "../services/paginasWeb.js";
import { rutaPagina, sistemaDe, loginDe, plantillaContenido, fusionar } from "../../../shared/utils/paginaWeb.js";

const fila = (t, p) => ({
  codigo: t.codigo,
  pais: t.nombre,
  ruta: rutaPagina(t),
  sistema: sistemaDe(t.codigo),
  login: loginDe(t.codigo),
  creada: !!p,
  activa: !!p?.activa,
  contenido: p ? parseContenido(p.contenido) : null,
});

async function cargar(codigo) {
  const [[t]] = await pool.query(`SELECT nombre, codigo FROM tenants WHERE codigo = ?`, [codigo]);
  if (!t) return {};
  const [[p]] = await pool.query(`SELECT * FROM paginas_web WHERE tenant_codigo = ?`, [codigo]);
  return { t, p };
}

// Lista todos los países (los nuevos aparecen solos, con "Crear página").
export const listarPaginas = async (req, res) => {
  try {
    await asegurarTabla();
    const [tenants] = await pool.query(`SELECT nombre, codigo FROM tenants ORDER BY nombre`);
    const [paginas] = await pool.query(`SELECT * FROM paginas_web`);
    const porCodigo = new Map(paginas.map((p) => [p.tenant_codigo, p]));
    res.json(tenants.map((t) => fila(t, porCodigo.get(t.codigo))));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener las páginas web" });
  }
};

export const obtenerPagina = async (req, res) => {
  try {
    await asegurarTabla();
    const { t, p } = await cargar(req.params.codigo);
    if (!t) return res.status(404).json({ error: "País no encontrado" });
    const f = fila(t, p);
    // Vista previa: si aún no se crea, muestra la plantilla.
    res.json({ ...f, contenido: fusionar(plantillaContenido(t), f.contenido) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la página web" });
  }
};

// Crea la página del país con la plantilla (queda inactiva).
export const crearPagina = async (req, res) => {
  try {
    await asegurarTabla();
    const { t, p } = await cargar(req.params.codigo);
    if (!t) return res.status(404).json({ error: "País no encontrado" });
    if (!p) {
      await pool.query(
        `INSERT INTO paginas_web (tenant_codigo, activa, contenido) VALUES (?, 0, ?)`,
        [t.codigo, JSON.stringify(plantillaContenido(t))]
      );
    }
    res.status(201).json(fila(t, (await cargar(t.codigo)).p));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear la página web" });
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    await asegurarTabla();
    const { t, p } = await cargar(req.params.codigo);
    if (!t) return res.status(404).json({ error: "País no encontrado" });
    if (!p) return res.status(400).json({ error: "Primero crea la página de este país" });
    await pool.query(`UPDATE paginas_web SET activa = ? WHERE tenant_codigo = ?`, [req.body?.activa ? 1 : 0, t.codigo]);
    res.json(fila(t, (await cargar(t.codigo)).p));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar el estado" });
  }
};
