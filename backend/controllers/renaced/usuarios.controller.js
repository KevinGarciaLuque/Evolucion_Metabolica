import bcrypt from "bcryptjs";

// perfil_id permitidos al crear/editar. Un admin de país no puede ascender a
// nadie a Administrador desde esta pantalla (evita auto-escalada de privilegios);
// el Super Admin (sesión de impersonación, req.usuario.super_admin) sí puede,
// porque es quien reparte el rol de admin de cada país.
const PERFILES_BASE = [2, 3, 4, 5]; // Médico, Asistente, Enfermera, Investigador de Clínica
function perfilesPermitidos(req) {
  return req.usuario?.super_admin ? [1, ...PERFILES_BASE] : PERFILES_BASE;
}
const MSG_PERFIL_INVALIDO = "Perfil no válido (1=Administrador*, 2=Médico, 3=Asistente, 4=Enfermera, 5=Investigador de Clínica) — *solo el Super Admin puede asignar Administrador";

export async function getUsuarios(req, res) {
  try {
    const [rows] = await req.db.query(
      `SELECT u.id, u.username, u.nombre_completo, u.email, u.perfil_id,
              u.unidad_servicio_id, us.nombre AS unidad_nombre,
              u.activo, u.ultimo_acceso, p.nombre AS perfil_nombre
       FROM usuario u
       JOIN perfil p ON p.id = u.perfil_id
       LEFT JOIN unidad_servicio_salud us ON us.id = u.unidad_servicio_id
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
              u.unidad_servicio_id, us.nombre AS unidad_nombre,
              u.activo, u.ultimo_acceso, p.nombre AS perfil_nombre
       FROM usuario u
       JOIN perfil p ON p.id = u.perfil_id
       LEFT JOIN unidad_servicio_salud us ON us.id = u.unidad_servicio_id
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
  const { nombre_completo, username, email, password, perfil_id, unidad_servicio_id } = req.body;

  if (!nombre_completo || !username || !password || !perfil_id) {
    return res.status(400).json({ error: "nombre_completo, username, contraseña y perfil son requeridos" });
  }
  if (!perfilesPermitidos(req).includes(Number(perfil_id))) {
    return res.status(400).json({ error: MSG_PERFIL_INVALIDO });
  }
  const esAdministrador = Number(perfil_id) === 1;
  // Médico, Asistente, Enfermera e Investigador de Clínica solo ven su propia
  // clínica — deben tener una asignada. Un Administrador no pertenece a ninguna.
  if (!esAdministrador && !unidad_servicio_id) {
    return res.status(400).json({ error: "Debes asignar una clínica al usuario" });
  }

  try {
    const [exist] = await req.db.query(
      "SELECT id FROM usuario WHERE username = ? OR (email = ? AND email IS NOT NULL AND email != '')",
      [username, email || ""]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario con ese username o email" });
    }

    let clinicaId = null;
    if (!esAdministrador) {
      const [[clinica]] = await req.db.query(
        "SELECT id FROM unidad_servicio_salud WHERE id = ? AND activo = 1", [unidad_servicio_id]
      );
      if (!clinica) return res.status(400).json({ error: "La clínica indicada no existe o está inactiva" });
      clinicaId = unidad_servicio_id;
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await req.db.query(
      `INSERT INTO usuario (username, password_hash, nombre_completo, email, perfil_id, unidad_servicio_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [username, hash, nombre_completo, email || null, perfil_id, clinicaId]
    );

    res.status(201).json({ id: result.insertId, message: "Usuario creado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
}

export async function updateUsuario(req, res) {
  const { id } = req.params;
  const { nombre_completo, username, email, password, perfil_id, unidad_servicio_id, activo } = req.body;

  if (perfil_id !== undefined && !perfilesPermitidos(req).includes(Number(perfil_id))) {
    return res.status(400).json({ error: MSG_PERFIL_INVALIDO });
  }

  try {
    const [[current]] = await req.db.query("SELECT id, perfil_id, unidad_servicio_id FROM usuario WHERE id = ?", [id]);
    if (!current) return res.status(404).json({ error: "Usuario no encontrado" });

    // Perfil resultante tras esta actualización (el nuevo si se envía, si no el actual).
    const perfilFinal = perfil_id !== undefined ? Number(perfil_id) : current.perfil_id;
    const esAdministrador = perfilFinal === 1;

    if (!esAdministrador && unidad_servicio_id !== undefined && !unidad_servicio_id) {
      return res.status(400).json({ error: "Debes asignar una clínica al usuario" });
    }

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

    // Un Administrador no pertenece a ninguna clínica — se limpia sin importar
    // lo que haya venido en el body. Si no es admin y no mandaron clínica en este
    // request, se conserva la que ya tenía; si mandaron una nueva, se valida.
    let unidadFinal = current.unidad_servicio_id;
    if (esAdministrador) {
      unidadFinal = null;
    } else if (unidad_servicio_id !== undefined) {
      const [[clinica]] = await req.db.query(
        "SELECT id FROM unidad_servicio_salud WHERE id = ? AND activo = 1", [unidad_servicio_id]
      );
      if (!clinica) return res.status(400).json({ error: "La clínica indicada no existe o está inactiva" });
      unidadFinal = unidad_servicio_id;
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
        nombre_completo    = COALESCE(?, nombre_completo),
        username           = COALESCE(?, username),
        email              = COALESCE(?, email),
        perfil_id          = COALESCE(?, perfil_id),
        unidad_servicio_id = ?,
        activo             = COALESCE(?, activo)
        ${passwordClause}
       WHERE id = ?`,
      [nombre_completo || null, username || null, email || null,
       perfil_id ?? null, unidadFinal, activo ?? null, ...params, id]
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
