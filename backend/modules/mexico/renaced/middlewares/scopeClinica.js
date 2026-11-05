import { verificarToken } from "../../../../shared/middlewares/auth.js";
// Calcula el alcance de datos del usuario RENACED autenticado.
// perfil_id 1 (Administrador de país) y las sesiones de Super Admin (impersonación,
// super_admin:true) ven todas las clínicas del país. Cualquier otro perfil
// (Médico, Asistente, Enfermera) queda restringido a su propia unidad_servicio_id,
// sin importar qué parámetros envíe el cliente en la query o el body.
//
// perfil_id 7 (Consulta nacional) también ve todas las clínicas, pero solo en lectura:
// ver `soloLecturaConsultaNacional`, que bloquea cualquier escritura.
export const PERFIL_CONSULTA_NACIONAL = 7;

export function resolverAlcanceClinica(req, res, next) {
  const esAdmin = req.usuario?.perfil_id === 1 || req.usuario?.perfil_id === PERFIL_CONSULTA_NACIONAL || !!req.usuario?.super_admin;
  req.alcance = {
    esAdmin,
    unidadId: esAdmin ? null : (req.usuario?.unidad_servicio_id ?? null),
  };
  if (!esAdmin && !req.alcance.unidadId) {
    return res.status(403).json({ error: "Tu usuario no tiene una clínica asignada. Contacta al administrador." });
  }
  next();
}

// Guarda global (se monta antes de todas las rutas de RENACED México): el perfil
// "Consulta nacional" solo puede leer. Se permiten las exportaciones de /reportes
// (el Excel se inicia con POST pero solo lee) y el login.
export function soloLecturaConsultaNacional(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.path.startsWith("/auth") || req.path.startsWith("/reportes")) return next();
  verificarToken(req, res, () => {
    if (req.usuario?.perfil_id === PERFIL_CONSULTA_NACIONAL && !req.usuario?.super_admin) {
      return res.status(403).json({ error: "El perfil Consulta nacional es de solo lectura" });
    }
    next();
  });
}

// Guarda todos los sub-recursos anidados de un paciente (consultas, laboratorio,
// tratamiento, evaluación, etc. — /api/renaced/pacientes/:paciente_id/*). Sin esto,
// un usuario podría leer o modificar datos clínicos de un paciente de otra clínica
// con solo conocer su id, aunque nunca vea su nombre/CURP en las listas.
export async function verificarAccesoPaciente(req, res, next) {
  if (req.alcance.esAdmin) return next();
  try {
    const [[paciente]] = await req.db.query(
      "SELECT unidad_servicio_id FROM paciente WHERE id = ?", [req.params.paciente_id]
    );
    if (!paciente) return res.status(404).json({ error: "Paciente no encontrado" });
    if (paciente.unidad_servicio_id !== req.alcance.unidadId) {
      return res.status(403).json({ error: "No tienes acceso a pacientes de otra clínica" });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al verificar acceso al paciente" });
  }
}
