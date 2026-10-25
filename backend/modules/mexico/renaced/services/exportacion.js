import fs from "fs";
import path from "path";
import crypto from "crypto";
import ExcelJS from "exceljs";
import { UPLOADS_PATH } from "../../../../shared/paths.js";

// Exportaciones masivas de RENACED sin cargar el país completo en memoria:
// los datos se leen por bloques (keyset por id) y se escriben en streaming.
// - CSV: se envía directo a la respuesta.
// - Excel: corre como trabajo en segundo plano y deja un archivo temporal.

const BLOQUE = 2000;
const MAX_FILAS_HOJA = 1_048_000; // límite de Excel por hoja (1,048,576)
const MAX_TRABAJOS_SIMULTANEOS = 2;
const VIDA_ARCHIVO_MS = 60 * 60 * 1000;

const dirExports = path.join(UPLOADS_PATH, "renaced_exports");

const formatDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
};

// ── Lectura por bloques ───────────────────────────────────────────────────────
const SQL_PACIENTES = (scoped) => `
  SELECT p.id, p.expediente, p.ap_pat, p.ap_mat, p.nombre, p.sexo, p.fecha_nacimiento,
         TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
         p.curp, p.estado_nacimiento, p.estado_residencia, p.colonia, p.calle_num,
         p.codigo_postal, p.telefonos, p.email, p.establecimiento_cve,
         u.nombre AS unidad, pe.descripcion AS estatus,
         IF(p.tiene_aviso_privacidad, 'Sí', 'No') AS aviso_privacidad,
         IF(p.tiene_consentimiento,   'Sí', 'No') AS consentimiento
  FROM paciente p
  LEFT JOIN cat_paciente_estatus pe ON pe.id = p.estatus_id
  LEFT JOIN unidad_servicio_salud u ON u.id = p.unidad_servicio_id
  WHERE p.id > ? ${scoped ? "AND p.unidad_servicio_id = ?" : ""}
  ORDER BY p.id LIMIT ${BLOQUE}`;

// Último diagnóstico (por fecha_captura) de los pacientes del bloque
async function diagnosticosDe(db, ids) {
  if (!ids.length) return new Map();
  const [rows] = await db.query(
    `SELECT d.paciente_id, td.descripcion AS tipo_diabetes, d.fecha_diagnostico, d.edad_diagnostico
       FROM diagnostico d
       LEFT JOIN cat_tipo_diabetes td ON td.id = d.tipo_diabetes_id
      WHERE d.paciente_id IN (?)
      ORDER BY d.fecha_captura DESC, d.id DESC`, [ids]);
  const m = new Map();
  for (const r of rows) if (!m.has(r.paciente_id)) m.set(r.paciente_id, r);
  return m;
}

async function* bloquesPacientes(db, unidadId) {
  let ultimo = 0;
  for (;;) {
    const [rows] = await db.query(SQL_PACIENTES(!!unidadId), unidadId ? [ultimo, unidadId] : [ultimo]);
    if (!rows.length) return;
    ultimo = rows[rows.length - 1].id;
    yield rows;
    if (rows.length < BLOQUE) return;
  }
}

// ── Mapeos de fila ────────────────────────────────────────────────────────────
const COLS_PACIENTE = [
  "Expediente", "Apellido Paterno", "Apellido Materno", "Nombre(s)", "Sexo", "Fecha Nacimiento", "Edad", "CURP",
  "Estado Nacimiento", "Estado Residencia", "Colonia", "Calle y Número", "Código Postal", "Teléfonos", "Email",
  "Establecimiento", "Unidad", "Tipo Diabetes", "Fecha Diagnóstico", "Edad al Diagnóstico",
  "Aviso Privacidad", "Consentimiento", "Estatus",
];
const filaPaciente = (p, d) => [
  p.expediente || "", p.ap_pat || "", p.ap_mat || "", p.nombre || "", p.sexo === "F" ? "Femenino" : "Masculino",
  formatDate(p.fecha_nacimiento), p.edad ?? "", p.curp || "", p.estado_nacimiento || "", p.estado_residencia || "",
  p.colonia || "", p.calle_num || "", p.codigo_postal || "", p.telefonos || "", p.email || "", p.establecimiento_cve || "",
  p.unidad || "", d?.tipo_diabetes || "", formatDate(d?.fecha_diagnostico), d?.edad_diagnostico ?? "",
  p.aviso_privacidad, p.consentimiento, p.estatus || "",
];

const COLS_LAB = ["Paciente", "Expediente", "Fecha Muestra", "HbA1c (%)", "Glucosa Ayuno", "Colesterol Total", "HDL", "LDL", "Triglicéridos", "Creatinina"];
const COLS_CONSULTA = ["Paciente", "Expediente", "Fecha Consulta", "Peso (kg)", "Talla (m)", "IMC", "Cintura (cm)", "PA Sistólica", "PA Diastólica"];

const nombreCompleto = (p) => `${p.ap_pat || ""} ${p.ap_mat || ""}, ${p.nombre || ""}`;

// Último registro (por id) de una tabla para los pacientes del bloque
async function ultimosDe(db, tabla, ids) {
  if (!ids.length) return new Map();
  const [rows] = await db.query(`SELECT * FROM ${tabla} WHERE paciente_id IN (?) ORDER BY id DESC`, [ids]);
  const m = new Map();
  for (const r of rows) if (!m.has(r.paciente_id)) m.set(r.paciente_id, r);
  return m;
}
const filaLab = (p, l) => [nombreCompleto(p), p.expediente || "", formatDate(l.fecha_muestra), l.hba1c ?? "", l.glucosa_ayuno ?? "",
  l.colesterol_total ?? "", l.hdl ?? "", l.ldl ?? "", l.trigliceridos ?? "", l.creatinina ?? ""];
const filaConsulta = (p, c) => [nombreCompleto(p), p.expediente || "", formatDate(c.fecha_consulta), c.peso ?? "", c.estatura ?? "",
  c.imc ?? "", c.cintura ?? "", c.pa_sistolica ?? "", c.pa_diastolica ?? ""];

// ── CSV en streaming ──────────────────────────────────────────────────────────
const csvCelda = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportarCSVStream(db, unidadId, res) {
  const cols = ["expediente", "ap_pat", "ap_mat", "nombre", "sexo", "fecha_nacimiento", "edad", "curp", "estado_residencia",
    "telefonos", "email", "establecimiento_cve", "tipo_diabetes", "fecha_diagnostico", "aviso_privacidad", "consentimiento", "estatus"];
  res.write("﻿" + cols.join(",") + "\r\n");
  for await (const bloque of bloquesPacientes(db, unidadId)) {
    const diag = await diagnosticosDe(db, bloque.map((p) => p.id));
    let chunk = "";
    for (const p of bloque) {
      const d = diag.get(p.id);
      chunk += [
        p.expediente, p.ap_pat, p.ap_mat, p.nombre, p.sexo, formatDate(p.fecha_nacimiento), p.edad, p.curp, p.estado_residencia,
        p.telefonos, p.email, p.establecimiento_cve, d?.tipo_diabetes, formatDate(d?.fecha_diagnostico),
        p.aviso_privacidad === "Sí" ? "Si" : "No", p.consentimiento === "Sí" ? "Si" : "No", p.estatus,
      ].map(csvCelda).join(",") + "\r\n";
    }
    if (!res.write(chunk)) await new Promise((r) => res.once("drain", r));
  }
  res.end();
}

// ── Excel en segundo plano ────────────────────────────────────────────────────
const trabajos = new Map();

export function trabajosActivos() {
  return [...trabajos.values()].filter((t) => t.estado === "corriendo").length;
}
export function obtenerTrabajo(id) {
  return trabajos.get(id) || null;
}

function limpiarViejos() {
  const ahora = Date.now();
  for (const [id, t] of trabajos) {
    if (t.fin && ahora - t.fin > VIDA_ARCHIVO_MS) {
      if (t.archivo) fs.promises.unlink(t.archivo).catch(() => {});
      trabajos.delete(id);
    }
  }
}

export function iniciarExcel({ db, unidadId, usuarioId }) {
  limpiarViejos();
  const id = crypto.randomUUID();
  fs.mkdirSync(dirExports, { recursive: true });
  const archivo = path.join(dirExports, `${id}.xlsx`);
  const t = { id, usuarioId, estado: "corriendo", filas: 0, archivo, error: null, nota: null, inicio: Date.now(), fin: null };
  trabajos.set(id, t);

  (async () => {
    try {
      const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: archivo, useStyles: false, useSharedStrings: false });

      // Hoja por hoja (cada una recorre los pacientes por bloques)
      const hoja = async (nombre, columnas, generarFilas) => {
        const ws = wb.addWorksheet(nombre);
        ws.addRow(columnas).commit();
        let n = 0;
        for await (const bloque of bloquesPacientes(db, unidadId)) {
          const filas = await generarFilas(bloque);
          for (const f of filas) {
            if (n >= MAX_FILAS_HOJA) { t.nota = `La hoja ${nombre} se recortó en ${MAX_FILAS_HOJA} filas (límite de Excel). Usa el CSV para el total.`; break; }
            ws.addRow(f).commit();
            n++;
          }
          t.filas += filas.length;
          if (n >= MAX_FILAS_HOJA) break;
        }
        ws.commit();
      };

      await hoja("Pacientes", COLS_PACIENTE, async (bloque) => {
        const diag = await diagnosticosDe(db, bloque.map((p) => p.id));
        return bloque.map((p) => filaPaciente(p, diag.get(p.id)));
      });
      await hoja("Laboratorio", COLS_LAB, async (bloque) => {
        const ult = await ultimosDe(db, "laboratorio", bloque.map((p) => p.id));
        return bloque.filter((p) => ult.has(p.id)).map((p) => filaLab(p, ult.get(p.id)));
      });
      await hoja("Consultas", COLS_CONSULTA, async (bloque) => {
        const ult = await ultimosDe(db, "consulta", bloque.map((p) => p.id));
        return bloque.filter((p) => ult.has(p.id)).map((p) => filaConsulta(p, ult.get(p.id)));
      });

      await wb.commit();
      t.estado = "terminado";
    } catch (e) {
      console.error("Exportación Excel:", e);
      t.estado = "error";
      t.error = "No se pudo generar el Excel";
      fs.promises.unlink(archivo).catch(() => {});
    } finally {
      t.fin = Date.now();
    }
  })();

  return t;
}
