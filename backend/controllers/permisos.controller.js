import pool from "../config/db.js";

export const MODULOS_VALIDOS = [
  "dashboard", "consolidado", "pacientes", "analisis", "consultas", "mapa",
];

// GET /api/permisos — admin: lista todos los usuarios no-admin con sus módulos
export async function listarTodos(req, res) {
  try {
    const [usuarios] = await pool.query(
      "SELECT id, nombre, email, rol FROM usuarios WHERE rol != 'admin' AND estado = 1 ORDER BY nombre ASC"
    );
    const [permisos] = await pool.query("SELECT usuario_id, modulo FROM permisos_modulos");

    const mapa = {};
    permisos.forEach(({ usuario_id, modulo }) => {
      if (!mapa[usuario_id]) mapa[usuario_id] = [];
      mapa[usuario_id].push(modulo);
    });

    const resultado = usuarios.map((u) => ({
      ...u,
      modulos: mapa[u.id] ?? null, // null = sin configurar → acceso total
    }));

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar permisos" });
  }
}

// GET /api/permisos/mios — módulos del usuario autenticado
export async function misPermisos(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT modulo FROM permisos_modulos WHERE usuario_id = ?",
      [req.usuario.id]
    );
    // Si no tiene ningún registro aún, null indica "sin configurar → acceso total"
    const modulos = rows.length === 0 ? null : rows.map((r) => r.modulo);
    res.json({ modulos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener permisos" });
  }
}

// GET /api/permisos/:usuarioId — módulos de un usuario específico (admin)
export async function obtenerPorUsuario(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT modulo FROM permisos_modulos WHERE usuario_id = ?",
      [req.params.usuarioId]
    );
    const modulos = rows.length === 0 ? null : rows.map((r) => r.modulo);
    res.json({ modulos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener permisos" });
  }
}

// PUT /api/permisos/:usuarioId — reemplaza módulos de un usuario (admin)
export async function actualizarPermisos(req, res) {
  const { modulos } = req.body;
  if (!Array.isArray(modulos))
    return res.status(400).json({ error: "Se esperaba un array de módulos" });

  const invalidos = modulos.filter((m) => !MODULOS_VALIDOS.includes(m));
  if (invalidos.length > 0)
    return res.status(400).json({ error: `Módulos inválidos: ${invalidos.join(", ")}` });

  const usuarioId = req.params.usuarioId;

  try {
    const [users] = await pool.query("SELECT id, rol FROM usuarios WHERE id = ?", [usuarioId]);
    if (users.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });
    if (users[0].rol === "admin")
      return res.status(400).json({ error: "No se pueden configurar permisos para administradores" });

    await pool.query("DELETE FROM permisos_modulos WHERE usuario_id = ?", [usuarioId]);

    if (modulos.length > 0) {
      const values = modulos.map((m) => [usuarioId, m]);
      await pool.query("INSERT INTO permisos_modulos (usuario_id, modulo) VALUES ?", [values]);
    }

    res.json({ mensaje: "Permisos actualizados correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar permisos" });
  }
}
