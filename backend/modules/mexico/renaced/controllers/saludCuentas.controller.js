// Salud de cuentas: detecta usuarios y clínicas con datos incompletos, para que el
// Administrador no tenga que consultar la base a mano.

const PERFIL_ADMIN = 1;
const PERFIL_ADMIN_CLINICA = 6;
const PERFIL_CONSULTA_NACIONAL = 7;

const COLS = `u.id, u.username, u.nombre_completo, u.perfil_id, p.nombre AS perfil_nombre,
              u.activo, u.ultimo_acceso, u.fecha_alta,
              u.unidad_servicio_id, us.nombre AS unidad_nombre,
              (m.curp IS NOT NULL) AS tiene_medico`;
const FROM = `FROM usuario u
              JOIN perfil p ON p.id = u.perfil_id
              LEFT JOIN unidad_servicio_salud us ON us.id = u.unidad_servicio_id
              LEFT JOIN medico m ON m.curp = u.recurso_humano_curp`;

export async function getSaludCuentas(req, res) {
  try {
    const q = (where, order = "u.nombre_completo") =>
      req.db.query(`SELECT ${COLS} ${FROM} WHERE ${where} ORDER BY ${order}`).then(([r]) => r);

    const [sinMedico, sinClinica, inactivos, nuncaEntraron, [clinicasSinAdmin], [[totales]]] = await Promise.all([
      // Capturan consultas: sin médico vinculado, la consulta queda sin médico.
      q(`u.activo = 1 AND u.perfil_id <> ${PERFIL_CONSULTA_NACIONAL} AND m.curp IS NULL`, "u.perfil_id IN (2,6) DESC, u.nombre_completo"),
      // Todos los perfiles, salvo Administrador y Consulta nacional, deben pertenecer a una clínica existente.
      q(`u.activo = 1 AND u.perfil_id NOT IN (${PERFIL_ADMIN}, ${PERFIL_CONSULTA_NACIONAL}) AND us.id IS NULL`),
      q("u.activo = 0"),
      q("u.activo = 1 AND u.ultimo_acceso IS NULL", "u.fecha_alta, u.nombre_completo"),
      req.db.query(
        `SELECT s.id, s.nombre,
                (SELECT COUNT(*) FROM usuario x WHERE x.unidad_servicio_id = s.id AND x.activo = 1) AS usuarios_activos
         FROM unidad_servicio_salud s
         WHERE s.activo = 1
           AND NOT EXISTS (SELECT 1 FROM usuario a WHERE a.unidad_servicio_id = s.id AND a.activo = 1 AND a.perfil_id = ${PERFIL_ADMIN_CLINICA})
         ORDER BY s.nombre`
      ),
      req.db.query(
        `SELECT COUNT(*) AS usuarios, SUM(activo = 1) AS activos,
                (SELECT COUNT(*) FROM unidad_servicio_salud WHERE activo = 1) AS clinicas
         FROM usuario`
      ),
    ]);

    res.json({
      resumen: {
        usuarios: Number(totales.usuarios), usuarios_activos: Number(totales.activos), clinicas_activas: Number(totales.clinicas),
        sin_medico: sinMedico.length, sin_clinica: sinClinica.length, inactivos: inactivos.length,
        nunca_entraron: nuncaEntraron.length, clinicas_sin_admin: clinicasSinAdmin.length,
      },
      sin_medico: sinMedico, sin_clinica: sinClinica, inactivos, nunca_entraron: nuncaEntraron,
      clinicas_sin_admin: clinicasSinAdmin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al revisar la salud de las cuentas" });
  }
}
