// Zona horaria efectiva de un usuario RENACED: la de su clínica (unidad_servicio_salud.zona_horaria)
// si la tiene configurada; si no, la del país. México abarca varias zonas, por eso cada clínica
// puede fijar la suya. Quien no pertenece a una clínica (admin del país, Super Admin) usa la del país.
import { zonaDeTenant, zonaValida } from "../../../../shared/utils/zonaHoraria.js";

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // `${db}::${unidad}` -> { zona, hasta }

export async function zonaDeClinica(db, unidadId, dbKey = "") {
  if (!unidadId) return null;
  const clave = `${dbKey}::${unidadId}`;
  const c = cache.get(clave);
  if (c && c.hasta > Date.now()) return c.zona;
  let zona = null;
  try {
    const [[fila]] = await db.query("SELECT zona_horaria FROM unidad_servicio_salud WHERE id = ?", [unidadId]);
    if (zonaValida(fila?.zona_horaria)) zona = fila.zona_horaria;
  } catch { /* columna aún no creada: se usa la del país */ }
  cache.set(clave, { zona, hasta: Date.now() + TTL_MS });
  return zona;
}

export function olvidarZonaClinica() {
  cache.clear();
}

/** Zona del usuario: clínica → país. `usuario` trae tenant, unidad_servicio_id y db_name (token). */
export async function zonaDeUsuario(db, usuario) {
  let unidadId = usuario?.unidad_servicio_id;
  if (!unidadId && usuario?.id && !usuario.super_admin) {
    // Los tokens emitidos por el login unificado no traen la unidad: se consulta
    try {
      const [[u]] = await db.query("SELECT unidad_servicio_id FROM usuario WHERE id = ?", [usuario.id]);
      unidadId = u?.unidad_servicio_id;
    } catch { /* sin unidad: zona del país */ }
  }
  const deClinica = await zonaDeClinica(db, unidadId, usuario?.db_name || "");
  return deClinica || zonaDeTenant(usuario?.tenant || "mx");
}
