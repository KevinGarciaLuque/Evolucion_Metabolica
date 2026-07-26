import bcrypt from "bcryptjs";

// Gestión de clínicas (unidad_servicio_salud) por el Administrador del país.
// El catálogo de establecimientos (establecimiento_salud) llega precargado por el
// módulo de importación de BD (RENACED/INEGI); aquí se activan como clínicas
// operativas o se dan de alta manualmente las que no estén en ese catálogo.
//
// Perfil "Investigador de Clínica" — al activar una unidad se crea junto con
// ella el usuario que la representa; no hay alta de clínica sin un responsable.
const PERFIL_INVESTIGADOR = 5;

export async function getClinicas(req, res) {
  try {
    const [rows] = await req.db.query(
      `SELECT u.id, u.nombre, u.establecimiento_cve, u.activo,
              e.estado_cve, e.municipio_cve,
              (SELECT COUNT(*) FROM usuario  us WHERE us.unidad_servicio_id = u.id) AS total_usuarios,
              (SELECT COUNT(*) FROM paciente p  WHERE p.unidad_servicio_id  = u.id) AS total_pacientes
       FROM unidad_servicio_salud u
       LEFT JOIN establecimiento_salud e ON e.clave = u.establecimiento_cve
       ORDER BY u.nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener clínicas" });
  }
}

// Catálogo de establecimientos oficiales que aún no están dados de alta como clínica.
export async function getEstablecimientosDisponibles(req, res) {
  try {
    const { busqueda } = req.query;
    let where = "WHERE e.clave NOT IN (SELECT establecimiento_cve FROM unidad_servicio_salud WHERE establecimiento_cve IS NOT NULL)";
    const params = [];
    if (busqueda) {
      where += " AND (e.nombre LIKE ? OR e.clave LIKE ?)";
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    const [rows] = await req.db.query(
      `SELECT e.clave, e.nombre, e.estado_cve, e.municipio_cve
       FROM establecimiento_salud e
       ${where}
       ORDER BY e.nombre LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener establecimientos disponibles" });
  }
}

export async function createClinica(req, res) {
  const conn = await req.db.getConnection();
  try {
    const {
      nombre, establecimiento_cve,
      investigador_nombre, investigador_email, investigador_password,
    } = req.body;

    if (!nombre) return res.status(400).json({ error: "El nombre de la clínica es requerido" });
    if (!investigador_nombre || !investigador_email || !investigador_password) {
      return res.status(400).json({
        error: "Nombre, correo y contraseña del investigador responsable son requeridos",
      });
    }

    const [existe] = await conn.query(
      "SELECT id FROM usuario WHERE username = ? OR email = ?",
      [investigador_email, investigador_email]
    );
    if (existe.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario con ese correo" });
    }

    await conn.beginTransaction();

    const [clinica] = await conn.query(
      `INSERT INTO unidad_servicio_salud (nombre, establecimiento_cve, activo) VALUES (?, ?, 1)`,
      [nombre, establecimiento_cve || null]
    );
    const clinicaId = clinica.insertId;

    const hash = await bcrypt.hash(investigador_password, 10);
    const [usuario] = await conn.query(
      `INSERT INTO usuario (username, password_hash, nombre_completo, email, perfil_id, unidad_servicio_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [investigador_email, hash, investigador_nombre, investigador_email, PERFIL_INVESTIGADOR, clinicaId]
    );

    await conn.commit();
    res.status(201).json({
      id: clinicaId,
      usuario_id: usuario.insertId,
      message: "Clínica activada e investigador creado correctamente",
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un usuario con ese correo" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear la clínica" });
  } finally {
    conn.release();
  }
}

export async function updateClinica(req, res) {
  try {
    const { id } = req.params;
    const { nombre, establecimiento_cve } = req.body;

    const [[actual]] = await req.db.query("SELECT id FROM unidad_servicio_salud WHERE id = ?", [id]);
    if (!actual) return res.status(404).json({ error: "Clínica no encontrada" });

    await req.db.query(
      `UPDATE unidad_servicio_salud SET
        nombre = COALESCE(?, nombre),
        establecimiento_cve = COALESCE(?, establecimiento_cve)
       WHERE id = ?`,
      [nombre || null, establecimiento_cve || null, id]
    );
    res.json({ message: "Clínica actualizada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar clínica" });
  }
}

export async function toggleClinica(req, res) {
  try {
    const { id } = req.params;
    const [[clinica]] = await req.db.query("SELECT id, activo FROM unidad_servicio_salud WHERE id = ?", [id]);
    if (!clinica) return res.status(404).json({ error: "Clínica no encontrada" });

    const nuevoEstado = clinica.activo ? 0 : 1;
    await req.db.query("UPDATE unidad_servicio_salud SET activo = ? WHERE id = ?", [nuevoEstado, id]);
    res.json({ activo: nuevoEstado, message: nuevoEstado ? "Clínica activada" : "Clínica desactivada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar estado de la clínica" });
  }
}
