import pool from "../../config/db.master.js";
import { getTenantPool } from "../../config/db.renaced.js";

// Catálogo de módulos válidos para tenants RENACED — debe reflejar
// MODULOS_RENACED / MODULOS_HONDURAS en frontend/src/pages/Admin/AdminPanel.jsx.
const MODULOS_VALIDOS_TENANT = [
  "dashboard", "consolidado", "pacientes", "analisis", "consultas", "mapa",
  "mensajes", "reportes", "importaciones", "backup_pacientes",
  "clinicas", "usuarios", "importar_bd", "auditoria",
];

async function crearTablaPermisosSiNoExiste(dbPool) {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS permisos_modulos (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id  INT UNSIGNED NOT NULL,
      modulo      VARCHAR(50) NOT NULL,
      UNIQUE KEY uk_usuario_modulo (usuario_id, modulo),
      CONSTRAINT fk_pm_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function resolverTenant(id) {
  const [[tenant]] = await pool.query(`SELECT * FROM tenants WHERE id = ?`, [id]);
  return tenant || null;
}

// GET /api/admin/tenants/:id/usuarios — lista usuarios del país con sus permisos individuales
export async function listarUsuariosTenant(req, res) {
  try {
    const tenant = await resolverTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: "País no encontrado" });

    const dbPool = getTenantPool(tenant.db_name, tenant.db_host);
    await crearTablaPermisosSiNoExiste(dbPool);

    const [usuarios] = await dbPool.query(
      "SELECT id, nombre_completo, email, perfil_id, activo FROM usuario WHERE activo = 1 ORDER BY nombre_completo ASC"
    );
    const [permisos] = await dbPool.query("SELECT usuario_id, modulo FROM permisos_modulos");

    const mapa = {};
    permisos.forEach(({ usuario_id, modulo }) => {
      if (!mapa[usuario_id]) mapa[usuario_id] = [];
      mapa[usuario_id].push(modulo);
    });

    const resultado = usuarios.map((u) => ({
      ...u,
      modulos: mapa[u.id] ?? null,
    }));

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar usuarios del país" });
  }
}

// PUT /api/admin/tenants/:id/usuarios/:usuarioId/permisos — reemplaza módulos individuales de un usuario
export async function actualizarPermisosUsuarioTenant(req, res) {
  const { modulos } = req.body;
  if (!Array.isArray(modulos))
    return res.status(400).json({ error: "Se esperaba un array de módulos" });

  const invalidos = modulos.filter((m) => !MODULOS_VALIDOS_TENANT.includes(m));
  if (invalidos.length > 0)
    return res.status(400).json({ error: `Módulos inválidos: ${invalidos.join(", ")}` });

  try {
    const tenant = await resolverTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: "País no encontrado" });

    const dbPool = getTenantPool(tenant.db_name, tenant.db_host);
    await crearTablaPermisosSiNoExiste(dbPool);

    const usuarioId = req.params.usuarioId;
    const [usuarios] = await dbPool.query("SELECT id FROM usuario WHERE id = ?", [usuarioId]);
    if (usuarios.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    await dbPool.query("DELETE FROM permisos_modulos WHERE usuario_id = ?", [usuarioId]);

    if (modulos.length > 0) {
      const values = modulos.map((m) => [usuarioId, m]);
      await dbPool.query("INSERT INTO permisos_modulos (usuario_id, modulo) VALUES ?", [values]);
    }

    res.json({ mensaje: "Permisos actualizados correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar permisos del usuario" });
  }
}
