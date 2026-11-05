// migrate_cuentas_antiguas.cjs
// Migra las cuentas de usuario del sistema PHP viejo (cuentausuario) a renaced_mexico.
//   node scripts/mexico/renaced/migrate_cuentas_antiguas.cjs            → solo simula
//   node scripts/mexico/renaced/migrate_cuentas_antiguas.cjs --aplicar  → escribe
//
// Reglas (acordadas con el cliente):
//  - Solo cuentas de nivel "Unidad Médica" (perfil 6). Root, Nacional y Estatal se dejan fuera.
//  - La clínica sale de cuentausuario.unidad_recurso_cve → unidad_servicio_recurso_humano.
//  - Un médico con varias clínicas = una cuenta por clínica (se conserva su usuario tal cual).
//  - Se conserva la contraseña: el hash SHA1 viejo queda en password_hash y el login lo
//    convierte a bcrypt en el primer ingreso exitoso (ver auth.controller.js).
//  - Perfil nuevo: 6 = Administrador de Clínica. Por clínica es administrador el médico que
//    coincide con el "responsable" de la clínica; si ninguno coincide, el primer médico de
//    la clínica (cuenta más antigua). El resto: tipo Médico → Médico (2), Administrativo → Asistente (3).
//  - También llena medico.unidad_servicio_id con la clínica del médico (la primera si tiene varias).

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", "..", "..", ".env") });

const APLICAR = process.argv.includes("--aplicar");
const DUMP = process.env.DUMP_PHP || path.join(__dirname, "..", "..", "..", "RENACED PHP", "renaced1.sql");

const PERFIL_ADMIN_CLINICA = 6, PERFIL_MEDICO = 2, PERFIL_ASISTENTE = 3;

// ── Lectura de INSERTs del dump ───────────────────────────────────────────────
function filas(sql, tabla) {
  const i = sql.indexOf("INSERT INTO `" + tabla + "`");
  if (i < 0) return [];
  const j = sql.indexOf(";\n", i);
  const body = sql.slice(sql.indexOf("VALUES", i) + 6, j);
  const res = []; let cur = [], tok = "", inq = false, depth = 0, quoted = false;
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (inq) {
      if (c === "\\") { const n = body[++k]; tok += n === "n" ? "\n" : n === "r" ? "\r" : n; continue; }
      if (c === "'") { if (body[k + 1] === "'") { tok += "'"; k++; continue; } inq = false; quoted = true; continue; }
      tok += c; continue;
    }
    if (c === "'") { inq = true; tok = ""; continue; }
    if (c === "(" && !depth) { depth = 1; cur = []; tok = ""; quoted = false; continue; }
    if ((c === "," || c === ")") && depth) {
      const t = tok.trim();
      cur.push(quoted ? tok : (t === "NULL" || t === "" ? null : t));
      tok = ""; quoted = false;
      if (c === ")") { res.push(cur); depth = 0; }
      continue;
    }
    tok += c;
  }
  return res;
}

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const sql = fs.readFileSync(DUMP, "utf8");
  const cuentas = filas(sql, "cuentausuario").map((r) => ({
    cve: +r[0], usuario: r[1], hash: r[2], descripcion: r[3], vigencia: r[4], activo: r[5] === "1",
    perfilViejo: +r[6], curp: r[7], unidadDirecta: r[9], unidadRecurso: r[10],
  }));
  const asign = Object.fromEntries(filas(sql, "unidad_servicio_recurso_humano").map((r) => [r[0], r[1]]));
  const rh = Object.fromEntries(filas(sql, "recurso_humano").map((r) => [r[0], {
    nombre: r[1], pat: r[2], mat: r[3], tipo: r[6], email: r[9], cedula: r[11],
  }]));
  const unidades = Object.fromEntries(filas(sql, "unidad_servicio_salud").map((r) => [r[0], { nombre: r[2], responsable: r[7] }]));

  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
    connectTimeout: 20000,
  });
  console.log(`\n${APLICAR ? "⚙️  APLICANDO" : "🔎 SIMULACIÓN (usa --aplicar para escribir)"} → ${db.config.database}@${db.config.host}\n`);

  const [exist] = await db.query("SELECT username, email FROM usuario");
  const ocupados = new Set(exist.flatMap((u) => [u.username, u.email]).filter(Boolean).map((x) => x.toLowerCase()));
  const [clinicasDB] = await db.query("SELECT id FROM unidad_servicio_salud");
  const clinicasOK = new Set(clinicasDB.map((c) => String(c.id)));

  // 1) Candidatas: perfil Unidad Médica con clínica resuelta
  const omitidas = [], candidatas = [];
  for (const c of cuentas) {
    if (c.perfilViejo !== 6) { omitidas.push([c.usuario, "nivel " + ({ 0: "root", 4: "nacional", 5: "estatal" }[c.perfilViejo] || c.perfilViejo)]); continue; }
    const unidad = asign[c.unidadRecurso] || c.unidadDirecta;
    if (!unidad || !clinicasOK.has(String(unidad))) { omitidas.push([c.usuario, "sin clínica identificable"]); continue; }
    if (ocupados.has(c.usuario.toLowerCase())) { omitidas.push([c.usuario, "usuario ya existe en el sistema nuevo"]); continue; }
    const r = rh[c.curp] || {};
    candidatas.push({ ...c, unidad: +unidad, rh: r, nombre: [r.nombre, r.pat, r.mat].filter(Boolean).join(" ") || c.usuario });
  }

  // 2) Perfil por clínica
  const porClinica = {};
  for (const c of candidatas) (porClinica[c.unidad] ||= []).push(c);
  for (const [uid, lista] of Object.entries(porClinica)) {
    lista.sort((a, b) => a.cve - b.cve);
    const resp = norm(unidades[uid]?.responsable);
    const medicos = lista.filter((c) => c.rh.tipo === "2" && c.activo);
    const coincide = medicos.find((c) => resp && norm(c.rh.pat) && resp.includes(norm(c.rh.pat).split(" ")[0]) && resp.includes(norm(c.rh.nombre).split(" ")[0]))
      || medicos.find((c) => resp && norm(c.rh.pat) && resp.includes(norm(c.rh.pat).split(" ")[0]));
    const admin = coincide || medicos[0] || null;
    for (const c of lista) {
      c.perfil = c === admin ? PERFIL_ADMIN_CLINICA : c.rh.tipo === "1" ? PERFIL_ASISTENTE : PERFIL_MEDICO;
      c.motivoAdmin = c === admin ? (coincide ? "coincide con responsable" : "primer médico de la clínica") : null;
    }
  }

  // 3) Reporte
  const nombrePerfil = { 6: "Admin. Clínica", 2: "Médico", 3: "Asistente" };
  console.log("Clínicas con cuentas a migrar:", Object.keys(porClinica).length, "· cuentas:", candidatas.length);
  for (const [uid, lista] of Object.entries(porClinica)) {
    console.log(`\n[${uid}] ${unidades[uid]?.nombre?.trim()}  (responsable: ${unidades[uid]?.responsable?.trim() || "—"})`);
    for (const c of lista) console.log(`   ${nombrePerfil[c.perfil].padEnd(15)} ${c.usuario.trim().padEnd(18)} ${c.nombre.trim()}${c.activo ? "" : "  [inactiva]"}${c.motivoAdmin ? "  ← " + c.motivoAdmin : ""}`);
    if (!lista.some((c) => c.perfil === PERFIL_ADMIN_CLINICA)) console.log("   ⚠ sin administrador (no hay médico activo): se asigna después desde la app");
  }
  console.log("\nOmitidas:", omitidas.length);
  for (const [u, m] of omitidas) console.log("   -", u.trim(), "→", m);
  const resumen = {}; candidatas.forEach((c) => { resumen[nombrePerfil[c.perfil]] = (resumen[nombrePerfil[c.perfil]] || 0) + 1; });
  console.log("\nResumen por perfil:", resumen);

  if (!APLICAR) { console.log("\nNo se escribió nada. Revisa y corre con --aplicar.\n"); return db.end(); }

  // 4) Escritura
  await db.query("INSERT INTO perfil (id, nombre, nivel) VALUES (?, 'Administrador de Clínica', 2) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)", [PERFIL_ADMIN_CLINICA]);
  let creadas = 0, medicosAct = 0;
  for (const c of candidatas) {
    const r = await db.query(
      `INSERT IGNORE INTO usuario (username, password_hash, nombre_completo, email, perfil_id, recurso_humano_curp, unidad_servicio_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.usuario.trim(), c.hash.trim(), c.nombre.trim(), (c.rh.email || "").trim() || null, c.perfil,
       (await db.query("SELECT curp FROM medico WHERE curp = ?", [c.curp]))[0].length ? c.curp : null, c.unidad, c.activo ? 1 : 0]
    );
    creadas += r[0].affectedRows;
  }
  // Vínculo médico → clínica (primera clínica en la que aparece)
  const vistos = new Set();
  for (const c of candidatas.sort((a, b) => a.cve - b.cve)) {
    if (vistos.has(c.curp)) continue; vistos.add(c.curp);
    const [u] = await db.query("UPDATE medico SET unidad_servicio_id = ? WHERE curp = ? AND unidad_servicio_id IS NULL", [c.unidad, c.curp]);
    medicosAct += u.affectedRows;
  }
  console.log(`\n✅ Usuarios creados: ${creadas} · médicos ligados a clínica: ${medicosAct}\n`);
  await db.end();
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
