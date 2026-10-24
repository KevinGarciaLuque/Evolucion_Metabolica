import poolMaster from "../config/db.master.js";

// Extrae "Navegador Versión · SO" de un user-agent, sin dependencias externas.
export function parsearUserAgent(ua) {
  if (!ua) return null;

  let navegador = "Navegador desconocido";
  const nav =
    ua.match(/edg\/([\d.]+)/i)     ? { nombre: "Edge",    v: RegExp.$1 } :
    ua.match(/opr\/([\d.]+)/i)     ? { nombre: "Opera",   v: RegExp.$1 } :
    ua.match(/chrome\/([\d.]+)/i)  ? { nombre: "Chrome",  v: RegExp.$1 } :
    ua.match(/firefox\/([\d.]+)/i) ? { nombre: "Firefox", v: RegExp.$1 } :
    ua.match(/version\/([\d.]+).*safari/i) ? { nombre: "Safari", v: RegExp.$1 } :
    null;
  if (nav) navegador = `${nav.nombre} ${nav.v.split(".")[0]}`;

  let so = "SO desconocido";
  if (/windows nt 10/i.test(ua)) so = "Windows 10/11";
  else if (/windows nt/i.test(ua)) so = "Windows";
  else if (/mac os x/i.test(ua)) so = "macOS";
  else if (/android/i.test(ua)) so = "Android";
  else if (/iphone|ipad/i.test(ua)) so = "iOS";
  else if (/linux/i.test(ua)) so = "Linux";

  return `${navegador} · ${so}`;
}

// Registro fire-and-forget de un intento de login (exitoso o fallido) en la
// bitácora centralizada (alad_master.login_logs). No bloquea la respuesta de
// login: los llamadores no deben esperar (await) esta promesa.
export async function registrarLoginLog({
  tenantId = null,
  tenantCodigo = null,
  usuarioId = null,
  usuarioNombre = null,
  usuarioEmail = null,
  usuarioRol = null,
  exito = 1,
  ip = null,
  userAgent = null,
}) {
  try {
    let id = tenantId;
    if (!id && tenantCodigo) {
      const [[tenant]] = await poolMaster.query(
        "SELECT id FROM tenants WHERE codigo = ?",
        [tenantCodigo]
      );
      id = tenant?.id ?? null;
    }

    await poolMaster.query(
      `INSERT INTO login_logs
        (tenant_id, tenant_codigo, usuario_id, usuario_nombre, usuario_email, usuario_rol, exito, ip, user_agent, navegador)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, tenantCodigo, usuarioId, usuarioNombre, usuarioEmail, usuarioRol,
        exito ? 1 : 0, ip, userAgent, parsearUserAgent(userAgent),
      ]
    );
  } catch (_) {
    // La bitácora no debe romper el flujo de login
  }
}
