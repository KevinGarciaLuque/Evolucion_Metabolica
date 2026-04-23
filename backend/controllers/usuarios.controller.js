import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { auditarAccion } from "../utils/helpers.js";

export async function listar(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, sexo, estado, mostrar_info_graficas, created_at FROM usuarios ORDER BY nombre ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
}

export async function obtener(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol, sexo, estado, mostrar_info_graficas, created_at FROM usuarios WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
}

export async function crear(req, res) {
  const { nombre, email, password, rol, sexo, mostrar_info_graficas } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });

  const rolesValidos = ["admin", "doctor", "asistente", "enfermera"];
  if (rol && !rolesValidos.includes(rol))
    return res.status(400).json({ error: "Rol inválido" });

  const sexosValidos = ["M", "F", null, undefined, ""];
  if (sexo && !sexosValidos.includes(sexo))
    return res.status(400).json({ error: "Sexo inválido" });

  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol, sexo, mostrar_info_graficas) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, email, hash, rol || "doctor", sexo || null, mostrar_info_graficas ? 1 : 0]
    );
    auditarAccion(pool, req, { accion: "crear_usuario", entidad: "usuario", entidad_id: result.insertId, descripcion: `Creó usuario: ${nombre} (${rol || "doctor"})` });
    res.status(201).json({ id: result.insertId, mensaje: "Usuario creado correctamente" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
}

export async function actualizar(req, res) {
  const { nombre, email, password, rol, estado, sexo, mostrar_info_graficas } = req.body;
  if (!nombre || !email)
    return res.status(400).json({ error: "Nombre y email son obligatorios" });

  const rolesValidos = ["admin", "doctor", "asistente", "enfermera"];
  if (rol && !rolesValidos.includes(rol))
    return res.status(400).json({ error: "Rol inválido" });

  try {
    if (password && password.trim() !== "") {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        "UPDATE usuarios SET nombre=?, email=?, password=?, rol=?, sexo=?, estado=?, mostrar_info_graficas=? WHERE id=?",
        [nombre, email, hash, rol || "doctor", sexo || null, estado ?? 1, mostrar_info_graficas ? 1 : 0, req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE usuarios SET nombre=?, email=?, rol=?, sexo=?, estado=?, mostrar_info_graficas=? WHERE id=?",
        [nombre, email, rol || "doctor", sexo || null, estado ?? 1, mostrar_info_graficas ? 1 : 0, req.params.id]
      );
    }
    auditarAccion(pool, req, { accion: "editar_usuario", entidad: "usuario", entidad_id: Number(req.params.id), descripcion: `Editó usuario: ${nombre}` });
    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

export async function eliminar(req, res) {
  // No permitir que el admin se elimine a sí mismo
  if (Number(req.params.id) === req.usuario.id)
    return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });

  try {
    await pool.query("UPDATE usuarios SET estado = 0 WHERE id = ?", [req.params.id]);
    auditarAccion(pool, req, { accion: "eliminar_usuario", entidad: "usuario", entidad_id: Number(req.params.id), descripcion: `Desactivó usuario ID ${req.params.id}` });
    res.json({ mensaje: "Usuario desactivado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
}
