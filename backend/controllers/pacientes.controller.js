import pool from "../config/db.js";
import { calcularEdad, auditarAccion } from "../utils/helpers.js";
import { geocodificar } from "../services/geocoding.js";

export async function listarMapa(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.nombre, p.departamento, p.municipio, p.sexo,
             p.edad, p.institucion, p.latitud, p.longitud,
             (
               SELECT a.clasificacion FROM analisis a
               WHERE a.paciente_id = p.id
               ORDER BY a.fecha DESC LIMIT 1
             ) AS clasificacion
      FROM pacientes p
      WHERE p.estado = 1 AND p.latitud IS NOT NULL AND p.longitud IS NOT NULL
      ORDER BY p.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener datos del mapa" });
  }
}

export async function listar(req, res) {
  const { departamento, sexo, edad_min, edad_max, buscar, institucion, con_monitor } = req.query;
  let sql = `
    SELECT p.*,
      sub.tir_promedio,
      sub.ultima_clasificacion
    FROM pacientes p
    LEFT JOIN (
      SELECT a.paciente_id,
        ROUND(AVG(a.tir), 1) AS tir_promedio,
        (SELECT a2.clasificacion FROM analisis a2
         WHERE a2.paciente_id = a.paciente_id
         ORDER BY a2.fecha DESC LIMIT 1) AS ultima_clasificacion
      FROM analisis a
      GROUP BY a.paciente_id
    ) sub ON sub.paciente_id = p.id
    WHERE p.estado = 1`;
  const params = [];

  if (institucion)  { sql += " AND p.institucion = ?";  params.push(institucion); }
  if (departamento) { sql += " AND p.departamento = ?"; params.push(departamento); }
  if (sexo)         { sql += " AND p.sexo = ?";         params.push(sexo); }
  if (buscar)       { sql += " AND p.nombre LIKE ?";    params.push(`%${buscar}%`); }
  if (edad_min)     { sql += " AND p.edad >= ?";        params.push(Number(edad_min)); }
  if (edad_max)     { sql += " AND p.edad <= ?";        params.push(Number(edad_max)); }
  if (con_monitor !== undefined && con_monitor !== "") { sql += " AND p.con_monitor = ?"; params.push(Number(con_monitor)); }

  sql += " ORDER BY p.nombre ASC";

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
    tipo_insulina, dosis_insulina_prolongada, tipo_insulina_2, dosis_insulina_corta,
    anticuerpos, dosis_por_kg, promedio_glucometrias,
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
         tipo_diabetes, subtipo_monogenica, hba1c_previo,
         tipo_insulina, dosis_insulina_prolongada, tipo_insulina_2, dosis_insulina_corta,
         anticuerpos, dosis_por_kg, promedio_glucometrias, telefono, nombre_tutor, telefono_tutor, con_monitor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

      [
        dni, nombre, fecha_nacimiento, edad, edad_debut || null, sexo, departamento,
        municipio || null, procedencia_tipo || null, direccion || null,
        antecedente_familiar || null, inst, peso, talla, tipo_diabetes,
        subtipo_monogenica || null, hba1c_previo || null,
        tipo_insulina || null, dosis_insulina_prolongada || null, tipo_insulina_2 || null, dosis_insulina_corta || null,
        anticuerpos || null, dosis_por_kg || null, promedio_glucometrias || null, telefono || null,
        nombre_tutor || null, telefono_tutor || null, con_monitor ? 1 : 0,
      ]
    );
    auditarAccion(pool, req, { accion: "crear_paciente", entidad: "paciente", entidad_id: result.insertId, descripcion: `Nuevo paciente: ${nombre}` });

    // Geocodificar en background (no bloquea la respuesta)
    if (municipio || departamento) {
      geocodificar(municipio, departamento).then(coords => {
        if (coords) {
          pool.query("UPDATE pacientes SET latitud=?, longitud=? WHERE id=?",
            [coords.lat, coords.lng, result.insertId]);
        }
      }).catch(() => {});
    }

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
    tipo_insulina, dosis_insulina_prolongada, tipo_insulina_2, dosis_insulina_corta,
    anticuerpos, dosis_por_kg, promedio_glucometrias,
    edad_debut, direccion, antecedente_familiar, nombre_tutor, telefono_tutor, con_monitor,
  } = req.body;
  const edad = fecha_nacimiento ? calcularEdad(fecha_nacimiento) : null;

  try {
    await pool.query(
      `UPDATE pacientes
       SET dni=?, nombre=?, fecha_nacimiento=?, edad=?, edad_debut=?, sexo=?, departamento=?,
           municipio=?, procedencia_tipo=?, direccion=?, antecedente_familiar=?, institucion=?,
           peso=?, talla=?, tipo_diabetes=?, subtipo_monogenica=?,
           hba1c_previo=?, tipo_insulina=?, dosis_insulina_prolongada=?, tipo_insulina_2=?, dosis_insulina_corta=?,
           anticuerpos=?, dosis_por_kg=?, promedio_glucometrias=?,
           telefono=?, nombre_tutor=?, telefono_tutor=?, con_monitor=?
       WHERE id = ?`,
      [
        dni, nombre, fecha_nacimiento, edad, edad_debut || null, sexo, departamento,
        municipio || null, procedencia_tipo || null, direccion || null,
        antecedente_familiar || null, institucion || 'HMEP', peso, talla,
        tipo_diabetes, subtipo_monogenica || null,
        hba1c_previo || null, tipo_insulina || null, dosis_insulina_prolongada || null,
        tipo_insulina_2 || null, dosis_insulina_corta || null,
        anticuerpos || null, dosis_por_kg || null, promedio_glucometrias || null, telefono || null,
        nombre_tutor || null, telefono_tutor || null, con_monitor ? 1 : 0, req.params.id,
      ]
    );
    auditarAccion(pool, req, { accion: "editar_paciente", entidad: "paciente", entidad_id: Number(req.params.id), descripcion: `Editó paciente: ${nombre}` });

    // Re-geocodificar si cambió municipio/departamento
    if (municipio || departamento) {
      geocodificar(municipio, departamento).then(coords => {
        if (coords) {
          pool.query("UPDATE pacientes SET latitud=?, longitud=? WHERE id=?",
            [coords.lat, coords.lng, req.params.id]);
        }
      }).catch(() => {});
    }

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
