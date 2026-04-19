import pool from "../config/db.js";
import { calcularEdad, auditarAccion } from "../utils/helpers.js";

export async function listar(req, res) {
  const { departamento, sexo, edad_min, edad_max, buscar, institucion, con_monitor } = req.query;
  let sql = "SELECT * FROM pacientes WHERE estado = 1";
  const params = [];

  if (institucion)  { sql += " AND institucion = ?";  params.push(institucion); }
  if (departamento) { sql += " AND departamento = ?"; params.push(departamento); }
  if (sexo)         { sql += " AND sexo = ?";         params.push(sexo); }
  if (buscar)       { sql += " AND nombre LIKE ?";     params.push(`%${buscar}%`); }
  if (edad_min)     { sql += " AND edad >= ?";         params.push(Number(edad_min)); }
  if (edad_max)     { sql += " AND edad <= ?";         params.push(Number(edad_max)); }
  if (con_monitor !== undefined && con_monitor !== "") { sql += " AND con_monitor = ?"; params.push(Number(con_monitor)); }

  sql += " ORDER BY nombre ASC";

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar pacientes" });
  }
}

export async function obtener(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM pacientes WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Paciente no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener paciente" });
  }
}

export async function crear(req, res) {
  const {
    dni, nombre, fecha_nacimiento, sexo, departamento, municipio, procedencia_tipo,
    peso, talla, tipo_diabetes, subtipo_monogenica, institucion, hba1c_previo, telefono,
    tipo_insulina, tipo_insulina_2, anticuerpos, dosis_por_kg, promedio_glucometrias,
    edad_debut, direccion, antecedente_familiar, nombre_tutor, telefono_tutor, con_monitor,
  } = req.body;
  if (!nombre || !sexo || !departamento)
    return res.status(400).json({ error: "Nombre, sexo y departamento son obligatorios" });

  const edad = fecha_nacimiento ? calcularEdad(fecha_nacimiento) : null;
  const inst = institucion || 'HMEP';

  try {
    const [result] = await pool.query(
      `INSERT INTO pacientes
        (dni, nombre, fecha_nacimiento, edad, edad_debut, sexo, departamento, municipio,
         procedencia_tipo, direccion, antecedente_familiar, institucion, peso, talla,
         tipo_diabetes, subtipo_monogenica, hba1c_previo, tipo_insulina, tipo_insulina_2, anticuerpos,
         dosis_por_kg, promedio_glucometrias, telefono, nombre_tutor, telefono_tutor, con_monitor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

      [
        dni, nombre, fecha_nacimiento, edad, edad_debut || null, sexo, departamento,
        municipio || null, procedencia_tipo || null, direccion || null,
        antecedente_familiar || null, inst, peso, talla, tipo_diabetes,
        subtipo_monogenica || null, hba1c_previo || null, tipo_insulina || null, tipo_insulina_2 || null, anticuerpos || null,
        dosis_por_kg || null, promedio_glucometrias || null, telefono || null,
        nombre_tutor || null, telefono_tutor || null, con_monitor ? 1 : 0,
      ]
    );
    auditarAccion(pool, req, { accion: "crear_paciente", entidad: "paciente", entidad_id: result.insertId, descripcion: `Nuevo paciente: ${nombre}` });
    res.status(201).json({ id: result.insertId, mensaje: "Paciente creado correctamente" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ya existe un paciente con ese DNI" });
    console.error(err);
    res.status(500).json({ error: "Error al crear paciente" });
  }
}

export async function actualizar(req, res) {
  const {
    nombre, fecha_nacimiento, sexo, departamento, municipio, procedencia_tipo,
    peso, talla, tipo_diabetes, subtipo_monogenica, dni, institucion, hba1c_previo, telefono,
    tipo_insulina, tipo_insulina_2, anticuerpos, dosis_por_kg, promedio_glucometrias,
    edad_debut, direccion, antecedente_familiar, nombre_tutor, telefono_tutor, con_monitor,
  } = req.body;
  const edad = fecha_nacimiento ? calcularEdad(fecha_nacimiento) : null;

  try {
    await pool.query(
      `UPDATE pacientes
       SET dni=?, nombre=?, fecha_nacimiento=?, edad=?, edad_debut=?, sexo=?, departamento=?,
           municipio=?, procedencia_tipo=?, direccion=?, antecedente_familiar=?, institucion=?,
           peso=?, talla=?, tipo_diabetes=?, subtipo_monogenica=?,
           hba1c_previo=?, tipo_insulina=?, tipo_insulina_2=?, anticuerpos=?, dosis_por_kg=?, promedio_glucometrias=?,
           telefono=?, nombre_tutor=?, telefono_tutor=?, con_monitor=?
       WHERE id = ?`,
      [
        dni, nombre, fecha_nacimiento, edad, edad_debut || null, sexo, departamento,
        municipio || null, procedencia_tipo || null, direccion || null,
        antecedente_familiar || null, institucion || 'HMEP', peso, talla,
        tipo_diabetes, subtipo_monogenica || null,
        hba1c_previo || null, tipo_insulina || null, tipo_insulina_2 || null, anticuerpos || null, dosis_por_kg || null,
        promedio_glucometrias || null, telefono || null,
        nombre_tutor || null, telefono_tutor || null, con_monitor ? 1 : 0, req.params.id,
      ]
    );
    auditarAccion(pool, req, { accion: "editar_paciente", entidad: "paciente", entidad_id: Number(req.params.id), descripcion: `Editó paciente: ${nombre}` });
    res.json({ mensaje: "Paciente actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar paciente" });
  }
}

export async function eliminar(req, res) {
  try {
    await pool.query("UPDATE pacientes SET estado = 0 WHERE id = ?", [req.params.id]);
    auditarAccion(pool, req, { accion: "eliminar_paciente", entidad: "paciente", entidad_id: Number(req.params.id), descripcion: `Eliminó paciente ID ${req.params.id}` });
    res.json({ mensaje: "Paciente eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar paciente" });
  }
}

export async function historial(req, res) {
  try {
    const [analisis] = await pool.query(
      `SELECT a.*, p.nombre, p.sexo, p.departamento, p.edad
       FROM analisis a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.paciente_id = ?
       ORDER BY a.fecha DESC, a.id DESC`,
      [req.params.id]
    );
    res.json(analisis);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener historial" });
  }
}

export async function departamentos(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT departamento FROM pacientes WHERE estado = 1 AND departamento IS NOT NULL ORDER BY departamento"
    );
    res.json(rows.map((r) => r.departamento));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
}
