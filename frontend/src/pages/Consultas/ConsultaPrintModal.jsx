import { useEffect, useState } from "react";
import { FiX, FiPrinter, FiLoader } from "react-icons/fi";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const TANNER_LABEL = {
  "1": "I — Prepuberal",
  "2": "II — Inicio de pubertad",
  "3": "III — Pubertad media",
  "4": "IV — Pubertad avanzada",
  "5": "V — Desarrollo adulto",
};

function fmtFecha(s) {
  if (!s) return "—";
  const d = new Date(s.split("T")[0] + "T12:00:00");
  return d.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac.split("T")[0] + "T12:00:00");
  let anios = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) anios--;
  return anios;
}

function generarHTMLImpresion(consulta, paciente, doctor) {
  const esFemenino = paciente?.sexo === "F";
  const edad = calcularEdad(paciente?.fecha_nacimiento);
  const tannerPrincipal = esFemenino
    ? (consulta.tanner_mama ? `M${consulta.tanner_mama} — Mama: ${TANNER_LABEL[consulta.tanner_mama]}` : null)
    : (consulta.tanner_genitales ? `G${consulta.tanner_genitales} — Genitales: ${TANNER_LABEL[consulta.tanner_genitales]}` : null);
  const tannerVello = consulta.tanner_vello_pubico
    ? `PH${consulta.tanner_vello_pubico} — Vello púbico: ${TANNER_LABEL[consulta.tanner_vello_pubico]}`
    : null;
  const hayTanner = tannerPrincipal || tannerVello || consulta.tanner_observaciones;

  const fila = (label, val) => val
    ? `<tr><td style="padding:5px 10px;font-weight:600;color:#475569;width:45%;border-bottom:1px solid #f1f5f9">${label}</td><td style="padding:5px 10px;color:#1e293b;border-bottom:1px solid #f1f5f9">${val}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Consulta — ${paciente?.nombre || consulta.paciente_nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 28px 36px; }

    /* ── Encabezado ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7c3aed; padding-bottom: 14px; margin-bottom: 18px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .logo-box { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg,#7c3aed,#0ea5e9); display: flex; align-items: center; justify-content: center; }
    .logo-box svg { width: 28px; height: 28px; }
    .app-name { font-size: 18px; font-weight: 700; color: #7c3aed; }
    .app-sub  { font-size: 11px; color: #94a3b8; letter-spacing: .05em; text-transform: uppercase; }
    .header-right { text-align: right; }
    .doc-nombre { font-size: 13px; font-weight: 700; color: #1e293b; }
    .doc-email  { font-size: 11px; color: #64748b; }
    .doc-rol    { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; }

    /* ── Título principal ── */
    .titulo-doc { text-align: center; margin: 10px 0 18px; }
    .titulo-doc h2 { font-size: 16px; font-weight: 700; color: #1e293b; letter-spacing: .03em; text-transform: uppercase; }
    .titulo-doc .subtitulo { font-size: 11px; color: #94a3b8; margin-top: 3px; }

    /* ── Sección ── */
    .seccion { margin-bottom: 16px; }
    .seccion-titulo {
      font-size: 10px; font-weight: 700; color: #7c3aed;
      text-transform: uppercase; letter-spacing: .1em;
      background: #f5f3ff; padding: 4px 10px; border-left: 3px solid #7c3aed;
      margin-bottom: 8px; border-radius: 0 4px 4px 0;
    }
    table { width: 100%; border-collapse: collapse; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }

    /* ── Chips Tanner ── */
    .tanner-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .chip {
      background: #f5f3ff; border: 1px solid #ddd6fe;
      border-radius: 6px; padding: 4px 10px;
      font-size: 12px; font-weight: 600; color: #6d28d9;
    }

    /* ── Área de texto ── */
    .texto-area {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 6px; padding: 10px 12px;
      font-size: 12.5px; line-height: 1.6; color: #334155;
      white-space: pre-wrap; min-height: 40px;
    }

    /* ── Footer ── */
    .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
    .proxima-cita { font-size: 12px; }
    .proxima-cita strong { color: #7c3aed; }
    .firma { text-align: center; width: 200px; }
    .firma-linea { border-top: 1.5px solid #334155; margin-bottom: 5px; }
    .firma-nombre { font-size: 12px; font-weight: 600; color: #1e293b; }
    .firma-sub    { font-size: 10px; color: #94a3b8; }

    @media print {
      body { padding: 16px 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>

  <!-- Encabezado -->
  <div class="header">
    <div class="header-left">
      <div class="logo-box">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 8 C48 16 48 24 32 32 C16 40 16 48 32 56" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>
          <path d="M32 8 C16 16 16 24 32 32 C48 40 48 48 32 56" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="4" stroke-linecap="round"/>
          <line x1="44" y1="20" x2="20" y2="20" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <line x1="20" y1="44" x2="44" y2="44" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <circle cx="32" cy="8"  r="3.5" fill="white"/>
          <circle cx="32" cy="56" r="3.5" fill="white"/>
        </svg>
      </div>
      <div>
        <div class="app-name">Evolución Metabólica</div>
        <div class="app-sub">Consulta Médica</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-nombre">${doctor?.nombre || "—"}</div>
      <div class="doc-email">${doctor?.email || ""}</div>
      <div class="doc-rol">${doctor?.rol === "admin" ? "Administrador" : "Médico"}</div>
      <div style="font-size:11px;color:#64748b;margin-top:3px">Fecha de emisión: ${fmtFecha(new Date().toISOString())}</div>
    </div>
  </div>

  <!-- Título -->
  <div class="titulo-doc">
    <h2>Registro de Consulta</h2>
    <div class="subtitulo">${fmtFecha(consulta.fecha)} &nbsp;·&nbsp; ${consulta.tipo_consulta || "Presencial"}</div>
  </div>

  <!-- Paciente -->
  <div class="seccion">
    <div class="seccion-titulo">Datos del Paciente</div>
    <table>
      ${fila("Nombre completo", paciente?.nombre || consulta.paciente_nombre)}
      ${fila("DNI / ID", paciente?.dni || consulta.paciente_dni || "—")}
      ${fila("Fecha de nacimiento", fmtFecha(paciente?.fecha_nacimiento))}
      ${fila("Edad", edad != null ? `${edad} años` : null)}
      ${fila("Sexo", paciente?.sexo === "F" ? "Femenino" : paciente?.sexo === "M" ? "Masculino" : null)}
      ${fila("Diagnóstico principal", paciente?.diagnostico)}
    </table>
  </div>

  <!-- Signos vitales -->
  <div class="seccion">
    <div class="seccion-titulo">Signos Vitales y Mediciones</div>
    <table>
      ${fila("Peso", consulta.peso != null ? `${consulta.peso} kg` : null)}
      ${fila("Talla", consulta.talla != null ? `${consulta.talla} cm` : null)}
      ${consulta.peso && consulta.talla
        ? fila("IMC", `${(consulta.peso / Math.pow(consulta.talla / 100, 2)).toFixed(1)} kg/m²`)
        : ""}
      ${fila("Tensión arterial", consulta.tension_arterial)}
    </table>
  </div>

  <!-- Laboratorio -->
  <div class="seccion">
    <div class="seccion-titulo">Laboratorio</div>
    <table>
      ${fila("Glucosa en ayunas", consulta.glucosa_ayunas != null ? `${consulta.glucosa_ayunas} mg/dL` : null)}
      ${fila("HbA1c", consulta.hba1c != null ? `${consulta.hba1c}%` : null)}
    </table>
    ${!consulta.glucosa_ayunas && !consulta.hba1c
      ? `<div style="color:#94a3b8;font-size:12px;padding:6px 10px">Sin resultados registrados en esta consulta.</div>`
      : ""}
  </div>

  ${hayTanner ? `
  <!-- Tanner -->
  <div class="seccion">
    <div class="seccion-titulo">Estadios de Tanner — Desarrollo Puberal</div>
    <div class="tanner-chips">
      ${tannerPrincipal ? `<div class="chip">${tannerPrincipal}</div>` : ""}
      ${tannerVello     ? `<div class="chip">${tannerVello}</div>` : ""}
    </div>
    ${consulta.tanner_observaciones
      ? `<div class="texto-area">${consulta.tanner_observaciones}</div>`
      : ""}
  </div>
  ` : ""}

  ${consulta.medicamentos ? `
  <div class="seccion">
    <div class="seccion-titulo">Medicamentos / Dosis Actuales</div>
    <div class="texto-area">${consulta.medicamentos}</div>
  </div>
  ` : ""}

  ${consulta.observaciones ? `
  <div class="seccion">
    <div class="seccion-titulo">Observaciones Clínicas</div>
    <div class="texto-area">${consulta.observaciones}</div>
  </div>
  ` : ""}

  ${consulta.plan_tratamiento ? `
  <div class="seccion">
    <div class="seccion-titulo">Plan de Tratamiento</div>
    <div class="texto-area">${consulta.plan_tratamiento}</div>
  </div>
  ` : ""}

  <!-- Footer -->
  <div class="footer">
    <div class="proxima-cita">
      ${consulta.proxima_cita
        ? `Próxima cita: <strong>${fmtFecha(consulta.proxima_cita)}</strong>`
        : '<span style="color:#94a3b8">Sin próxima cita registrada</span>'}
    </div>
    <div class="firma">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${doctor?.nombre || "—"}</div>
      <div class="firma-sub">Firma del Médico</div>
    </div>
  </div>

</body>
</html>`;
}

export default function ConsultaPrintModal({ consultaId, onClose }) {
  const { usuario } = useAuth();
  const [consulta, setConsulta] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    api.get(`/consultas/${consultaId}`)
      .then((r) => {
        setConsulta(r.data);
        return api.get(`/pacientes/${r.data.paciente_id}`);
      })
      .then((r) => setPaciente(r.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [consultaId]);

  function imprimir() {
    const html = generarHTMLImpresion(consulta, paciente, usuario);
    const w = window.open("", "_blank", "width=900,height=750");
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 700,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
      }}>

        {/* Header del modal */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 22px", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FiPrinter size={18} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>Vista previa de impresión</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#64748b", display: "flex" }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ overflowY: "auto", flex: 1, padding: "22px" }}>
          {cargando ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: "0.9rem" }}>Cargando datos de la consulta…</div>
            </div>
          ) : !consulta ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#ef4444" }}>
              No se pudo cargar la consulta.
            </div>
          ) : (
            <PreviewConsulta consulta={consulta} paciente={paciente} doctor={usuario} />
          )}
        </div>

        {/* Acciones */}
        <div style={{
          padding: "14px 22px", borderTop: "1px solid #e2e8f0",
          display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0,
        }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
          >
            Cerrar
          </button>
          <button
            className="btn btn-primary"
            onClick={imprimir}
            disabled={cargando || !consulta}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <FiPrinter size={15} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Vista previa dentro del modal ──────────────────────────────────────── */
function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed",
        textTransform: "uppercase", letterSpacing: "0.1em",
        background: "#f5f3ff", padding: "4px 10px",
        borderLeft: "3px solid #7c3aed", marginBottom: 8,
        borderRadius: "0 4px 4px 0",
      }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

function FilaDato({ label, valor }) {
  if (!valor && valor !== 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid #f8fafc" }}>
      <span style={{ color: "#64748b", fontSize: "0.82rem", minWidth: 170 }}>{label}</span>
      <span style={{ color: "#1e293b", fontSize: "0.82rem", fontWeight: 500 }}>{valor}</span>
    </div>
  );
}

const TANNER_LABEL_SHORT = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V" };

function PreviewConsulta({ consulta, paciente, doctor }) {
  const esFemenino = paciente?.sexo === "F";
  const edad = calcularEdad(paciente?.fecha_nacimiento);
  const tannerPrincipal = esFemenino ? consulta.tanner_mama : consulta.tanner_genitales;
  const hayTanner = tannerPrincipal || consulta.tanner_vello_pubico || consulta.tanner_observaciones;

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Encabezado del documento */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        borderBottom: "3px solid #7c3aed", paddingBottom: 14, marginBottom: 18,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg,#7c3aed,#0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 64 64" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 8 C48 16 48 24 32 32 C16 40 16 48 32 56" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              <path d="M32 8 C16 16 16 24 32 32 C48 40 48 48 32 56" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round"/>
              <line x1="44" y1="20" x2="20" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="20" y1="44" x2="44" y2="44" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="32" cy="8"  r="3.5" fill="white"/>
              <circle cx="32" cy="56" r="3.5" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#7c3aed" }}>Evolución Metabólica</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Consulta Médica</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>{doctor?.nombre || "—"}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{doctor?.email}</div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {doctor?.rol === "admin" ? "Administrador" : "Médico"}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>
            Emitido: {fmtFecha(new Date().toISOString())}
          </div>
        </div>
      </div>

      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Registro de Consulta
        </div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 3 }}>
          {fmtFecha(consulta.fecha)} · {consulta.tipo_consulta || "Presencial"}
        </div>
      </div>

      {/* Paciente */}
      <Seccion titulo="Datos del Paciente">
        <FilaDato label="Nombre completo" valor={paciente?.nombre || consulta.paciente_nombre} />
        <FilaDato label="DNI / ID" valor={paciente?.dni || consulta.paciente_dni} />
        <FilaDato label="Fecha de nacimiento" valor={fmtFecha(paciente?.fecha_nacimiento)} />
        <FilaDato label="Edad" valor={edad != null ? `${edad} años` : null} />
        <FilaDato label="Sexo" valor={paciente?.sexo === "F" ? "Femenino" : paciente?.sexo === "M" ? "Masculino" : null} />
        <FilaDato label="Diagnóstico principal" valor={paciente?.diagnostico} />
      </Seccion>

      {/* Signos vitales */}
      <Seccion titulo="Signos Vitales y Mediciones">
        <FilaDato label="Peso" valor={consulta.peso != null ? `${consulta.peso} kg` : null} />
        <FilaDato label="Talla" valor={consulta.talla != null ? `${consulta.talla} cm` : null} />
        {consulta.peso && consulta.talla && (
          <FilaDato label="IMC" valor={`${(consulta.peso / Math.pow(consulta.talla / 100, 2)).toFixed(1)} kg/m²`} />
        )}
        <FilaDato label="Tensión arterial" valor={consulta.tension_arterial} />
      </Seccion>

      {/* Laboratorio */}
      <Seccion titulo="Laboratorio">
        <FilaDato label="Glucosa en ayunas" valor={consulta.glucosa_ayunas != null ? `${consulta.glucosa_ayunas} mg/dL` : null} />
        <FilaDato label="HbA1c" valor={consulta.hba1c != null ? `${consulta.hba1c}%` : null} />
        {!consulta.glucosa_ayunas && !consulta.hba1c && (
          <div style={{ color: "#94a3b8", fontSize: "0.8rem", padding: "4px 0" }}>Sin resultados registrados.</div>
        )}
      </Seccion>

      {/* Tanner */}
      {hayTanner && (
        <Seccion titulo={`Estadios de Tanner — ${esFemenino ? "♀ Niña" : "♂ Niño"}`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: consulta.tanner_observaciones ? 8 : 0 }}>
            {esFemenino && consulta.tanner_mama && (
              <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 6, padding: "4px 10px", fontSize: "0.82rem", fontWeight: 600, color: "#6d28d9" }}>
                Mama M{consulta.tanner_mama} — {TANNER_LABEL[consulta.tanner_mama]}
              </div>
            )}
            {!esFemenino && consulta.tanner_genitales && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 10px", fontSize: "0.82rem", fontWeight: 600, color: "#1d4ed8" }}>
                Genitales G{consulta.tanner_genitales} — {TANNER_LABEL[consulta.tanner_genitales]}
              </div>
            )}
            {consulta.tanner_vello_pubico && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
                Vello púbico PH{consulta.tanner_vello_pubico} — {TANNER_LABEL[consulta.tanner_vello_pubico]}
              </div>
            )}
          </div>
          {consulta.tanner_observaciones && (
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 6, padding: "8px 12px", fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
              {consulta.tanner_observaciones}
            </div>
          )}
        </Seccion>
      )}

      {/* Medicamentos */}
      {consulta.medicamentos && (
        <Seccion titulo="Medicamentos / Dosis Actuales">
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px", fontSize: "0.82rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {consulta.medicamentos}
          </div>
        </Seccion>
      )}

      {/* Observaciones clínicas */}
      {consulta.observaciones && (
        <Seccion titulo="Observaciones Clínicas">
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px", fontSize: "0.82rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {consulta.observaciones}
          </div>
        </Seccion>
      )}

      {/* Plan de tratamiento */}
      {consulta.plan_tratamiento && (
        <Seccion titulo="Plan de Tratamiento">
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 12px", fontSize: "0.82rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {consulta.plan_tratamiento}
          </div>
        </Seccion>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: "0.82rem" }}>
          {consulta.proxima_cita
            ? <span>Próxima cita: <strong style={{ color: "#7c3aed" }}>{fmtFecha(consulta.proxima_cita)}</strong></span>
            : <span style={{ color: "#94a3b8" }}>Sin próxima cita registrada</span>}
        </div>
        <div style={{ textAlign: "center", width: 180 }}>
          <div style={{ borderTop: "1.5px solid #334155", marginBottom: 5 }} />
          <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{doctor?.nombre || "—"}</div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Firma del Médico</div>
        </div>
      </div>
    </div>
  );
}
