import pool from "../config/db.js";
import XLSX from "xlsx";

function buildFiltros(query) {
  const { buscar, departamento, sexo, clasificacion, institucion, fecha_desde, fecha_hasta } = query;
  const where = ["1=1"];
  const params = [];

  if (buscar) {
    where.push("(p.nombre LIKE ? OR p.dni LIKE ?)");
    params.push(`%${buscar}%`, `%${buscar}%`);
  }
  if (departamento) {
    where.push("p.departamento = ?");
    params.push(departamento);
  }
  if (sexo) {
    where.push("p.sexo = ?");
    params.push(sexo);
  }
  if (clasificacion) {
    where.push("a.clasificacion = ?");
    params.push(clasificacion);
  }
  if (institucion) {
    where.push("p.institucion = ?");
    params.push(institucion);
  }
  if (fecha_desde) {
    where.push("a.fecha >= ?");
    params.push(fecha_desde);
  }
  if (fecha_hasta) {
    where.push("a.fecha <= ?");
    params.push(fecha_hasta);
  }

  return { where: where.join(" AND "), params };
}

async function obtenerFilas(query) {
  const { where, params } = buildFiltros(query);
  const sql = `
    SELECT
      a.id,
      a.paciente_id,
      a.numero_registro,
      a.fecha,
      a.tir,
      a.tar,
      a.tbr,
      a.gmi,
      a.cv,
      a.gri,
      a.clasificacion,
      a.hba1c_post_mcg,
      p.nombre AS paciente_nombre,
      p.dni AS paciente_dni,
      p.sexo,
      p.departamento,
      p.edad,
      p.institucion
    FROM analisis a
    INNER JOIN pacientes p ON p.id = a.paciente_id
    WHERE ${where}
    ORDER BY a.fecha DESC, a.id DESC
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function listar(req, res) {
  try {
    const rows = await obtenerFilas(req.query);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar reportes visuales" });
  }
}

export async function exportarExcel(req, res) {
  try {
    const rows = await obtenerFilas(req.query);
    const data = rows.map((r) => ({
      "Fecha": r.fecha ? String(r.fecha).slice(0, 10) : "",
      "Paciente": r.paciente_nombre,
      "DNI": r.paciente_dni || "",
      "Sexo": r.sexo || "",
      "Edad": r.edad ?? "",
      "Departamento": r.departamento || "",
      "Institucion": r.institucion || "",
      "Registro #": r.numero_registro ?? "",
      "TIR %": r.tir ?? "",
      "TAR %": r.tar ?? "",
      "TBR %": r.tbr ?? "",
      "GMI %": r.gmi ?? "",
      "CV %": r.cv ?? "",
      "GRI": r.gri ?? "",
      "HbA1c post MCG %": r.hba1c_post_mcg ?? "",
      "Clasificacion ISPAD": r.clasificacion || "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Reportes");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte_visual_${fecha}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar Excel del reporte visual" });
  }
}
