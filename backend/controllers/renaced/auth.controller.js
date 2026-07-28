import poolRenaced from "../../config/db.renaced.js";
import poolMaster from "../../config/db.master.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Intersecta los módulos habilitados para el país con los permisos
// individuales del usuario (tabla permisos_modulos de la BD del tenant).
// Si el usuario no tiene permisos configurados, no se aplica restricción
// adicional — hereda el set completo del país.
async function intersectarConPermisosUsuario(dbPool, usuarioId, modulosPais) {
  try {
    const [rows] = await dbPool.query(
      "SELECT modulo FROM permisos_modulos WHERE usuario_id = ?",
      [usuarioId]
    );
    if (rows.length === 0) return modulosPais;
    const modulosUsuario = rows.map((r) => r.modulo);
    return Array.isArray(modulosPais)
      ? modulosPais.filter((m) => modulosUsuario.includes(m))
      : modulosUsuario;
  } catch (_) {
    // Tabla aún no existe u otra falla — no se restringe nada extra
    return modulosPais;
  }
}

export async function loginRenaced(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña son requeridos" });

  try {
    const [rows] = await poolRenaced.query(
      "SELECT * FROM usuario WHERE (username = ? OR email = ?) AND activo = 1",
      [email, email]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];
    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    // Actualizar último acceso
    poolRenaced.query("UPDATE usuario SET ultimo_acceso = NOW() WHERE id = ?", [usuario.id]).catch(() => {});

    // Módulos habilitados para el país (toggle del Super Admin) — techo máximo
    // para cualquier usuario que entre, sea Administrador o no.
    let modulosPais = null;
    try {
      const [[tenantMx]] = await poolMaster.query(
        "SELECT modulos FROM tenants WHERE codigo = 'mx'"
      );
      modulosPais = tenantMx?.modulos ?? null;
    } catch (_) {
      modulosPais = null; // si falla la consulta, no se restringe nada
    }

    // Permisos individuales del usuario (configurados por el Super Admin desde
    // el Panel de Instancias). Si el usuario no tiene ninguno configurado, no
    // se le aplica restricción adicional — hereda el set completo del país.
    const modulos = await intersectarConPermisosUsuario(poolRenaced, usuario.id, modulosPais);

    const payload = {
      id: usuario.id,
      nombre: usuario.nombre_completo,
      email: usuario.email || usuario.username,
      perfil_id: usuario.perfil_id,
      unidad_servicio_id: usuario.unidad_servicio_id ?? null,
      tenant: "mx",
      tenant_nombre: "México",
      modulos,
      // Este login es específico de RENACED México (poolRenaced apunta siempre a
      // renaced_mexico); resolverTenantDB exige db_name/db_host en el token para
      // resolver la conexión del tenant, igual que en la sesión de impersonación.
      db_name: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
      db_host: process.env.DB_HOST,
      tipo: "renaced",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({ token, usuario: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
}

export async function meRenaced(req, res) {
  // Sesión de Super Admin (impersonación) — no corresponde a un usuario real del tenant
  if (req.usuario?.super_admin) {
    const { id, nombre, email, perfil_id, tenant, tenant_nombre, db_name, db_host, modulos } = req.usuario;
    return res.json({
      id, nombre, email, perfil_id, tenant, tenant_nombre, db_name, db_host,
      modulos: modulos ?? null, tipo: "renaced", super_admin: true,
    });
  }
  try {
    const [rows] = await req.db.query(
      "SELECT id, username, nombre_completo, email, perfil_id, unidad_servicio_id FROM usuario WHERE id = ? AND activo = 1",
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const u = rows[0];

    // Recalcula módulos en cada consulta (país ∩ usuario) para que los cambios
    // hechos por el Super Admin se reflejen sin necesidad de volver a loguear.
    let modulosPais = null;
    try {
      const [[tenantRow]] = await poolMaster.query(
        "SELECT modulos FROM tenants WHERE codigo = ?", [req.usuario.tenant]
      );
      modulosPais = tenantRow?.modulos ?? null;
    } catch (_) {
      modulosPais = req.usuario.modulos ?? null;
    }
    const modulos = await intersectarConPermisosUsuario(req.db, req.usuario.id, modulosPais);

    res.json({
      id: u.id, nombre: u.nombre_completo, email: u.email || u.username, perfil_id: u.perfil_id,
      unidad_servicio_id: u.unidad_servicio_id ?? null,
      tenant: req.usuario.tenant, tenant_nombre: req.usuario.tenant_nombre,
      db_name: req.usuario.db_name, db_host: req.usuario.db_host,
      modulos, tipo: "renaced",
    });
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
}
