import bcrypt from "bcryptjs";

// perfil_id permitidos al crear (no se puede crear otro admin desde aquí)
const PERFILES_VALIDOS = [2, 3, 4]; // Médico, Asistente, Enfermera

export async function getUsuarios(req, res) {
  try {
    const [rows] = await req.db.query(
      `SELECT u.id, u.username, u.nombre_completo, u.email, u.perfil_id,
              u.activo, u.ultimo_acceso, p.nombre AS perfil_nombre
       FROM usuario u
       JOIN perfil p ON p.id = u.perfil_id
       ORDER BY u.nombre_completo`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
}

export async function getUsuarioById(req, res) {
  try {
    const [[row]] = await req.db.query(
      `SELECT u.id, u.username, u.nombre_completo, u.email, u.perfil_id,
              u.activo, u.ultimo_acceso, p.nombre AS perfil_nombre
       FROM usuario u
       JOIN perfil p ON p.id = u.perfil_id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
}

export async function createUsuario(req, res) {
  const { nombre_completo, username, email, password, perfil_id } = req.body;

  if (!nombre_completo || !username || !password || !perfil_id) {
    return res.status(400).json({ error: "nombre_completo, username, contraseña y perfil son requeridos" });
  }
  if (!PERFILES_VALIDOS.includes(Number(perfil_id))) {
    return res.status(400).json({ error: "Perfil no válido (2=Médico, 3=Asistente, 4=Enfermera)" });
  }

  try {
    const [exist] = await req.db.query(
      "SELECT id FROM usuario WHERE username = ? OR (email = ? AND email IS NOT NULL AND email != '')",
      [username, email || ""]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario con ese username o email" });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await req.db.query(
      `INSERT INTO usuario (username, password_hash, nombre_completo, email, perfil_id, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [username, hash, nombre_completo, email || null, perfil_id]
    );

    res.status(201).json({ id: result.insertId, message: "Usuario creado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
}

export async function updateUsuario(req, res) {
  const { id } = req.params;
  const { nombre_completo, username, email, password, perfil_id, activo } = req.body;

  if (perfil_id !== undefined && !PERFILES_VALIDOS.includes(Number(perfil_id))) {
    return res.status(400).json({ error: "Perfil no válido (2=Médico, 3=Asistente, 4=Enfermera)" });
  }

  try {
    const [[current]] = await req.db.query("SELECT id FROM usuario WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ error: "Usuario no encontrado" });

    // Check username/email conflict on other users
    if (username || email) {
      const [conflict] = await req.db.query(
        "SELECT id FROM usuario WHERE (username = ? OR (email = ? AND email IS NOT NULL AND email != '')) AND id != ?",
        [username || "", email || "", id]
      );
      if (conflict.length > 0) {
        return res.status(409).json({ error: "Ya existe otro usuario con ese username o email" });
      }
    }

    let passwordClause = "";
    const params = [];

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      passwordClause = ", password_hash = ?";
      params.push(hash);
    }

    await req.db.query(
      `UPDATE usuario SET
        nombre_completo = COALESCE(?, nombre_completo),
        username        = COALESCE(?, username),
        email           = COALESCE(?, email),
        perfil_id       = COALESCE(?, perfil_id),
        activo          = COALESCE(?, activo)
        ${passwordClause}
       WHERE id = ?`,
      [nombre_completo || null, username || null, email || null,
       perfil_id ?? null, activo ?? null, ...params, id]
    );

    res.json({ message: "Usuario actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

export async function toggleUsuario(req, res) {
  const { id } = req.params;
  try {
    const [[u]] = await req.db.query("SELECT id, activo FROM usuario WHERE id = ?", [id]);
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });

    // Prevent self-deactivation
    if (u.id === req.usuario?.id) {
      return res.status(400).json({ error: "No puedes desactivar tu propia cuenta" });
    }

    const nuevoEstado = u.activo ? 0 : 1;
    await req.db.query("UPDATE usuario SET activo = ? WHERE id = ?", [nuevoEstado, id]);
    res.json({ activo: nuevoEstado, message: nuevoEstado ? "Usuario activado" : "Usuario desactivado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar estado del usuario" });
  }
}
