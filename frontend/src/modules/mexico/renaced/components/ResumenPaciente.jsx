import { useEffect, useState } from "react";
import { getConsultas, getLaboratorios, getTratamiento } from "../api/renacedApi";

const C = { slate: "#64748b" };

const dia = (f) => (f ? String(f).slice(0, 10) : null);
const num = (v) => (v === null || v === undefined || v === "" ? null : String(parseFloat(v)));

function fechaCorta(f) {
  const d = dia(f);
  if (!d) return "";
  const [a, m, di] = d.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(di, 10)} ${meses[parseInt(m, 10) - 1]} ${a}`;
}

// Años de evolución desde el diagnóstico (fecha exacta o, si es aproximada, solo el año)
function aniosEvolucion(dx) {
  if (!dx) return null;
  const anio = dx.fecha_diagnostico ? parseInt(String(dx.fecha_diagnostico).slice(0, 4), 10) : parseInt(dx.fecha_approx_anio, 10);
  if (!anio) return null;
  const n = new Date().getFullYear() - anio;
  return n <= 0 ? "menos de 1 año" : `${n} ${n === 1 ? "año" : "años"}`;
}

function Dato({ etiqueta, children, alerta }) {
  return (
    <div style={{
      background: alerta ? "#fffbeb" : "#fff", border: `1px solid ${alerta ? "#fde68a" : "#e2e8f0"}`,
      borderRadius: 10, padding: "8px 12px", minWidth: 0,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: alerta ? "#b45309" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{etiqueta}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", marginTop: 2, overflowWrap: "anywhere" }}>{children}</div>
    </div>
  );
}

/**
 * Franja de contexto (solo lectura) para ver antes de examinar al paciente:
 * tipo de diabetes, evolución, patologías, última HbA1c, tratamiento actual y última consulta.
 */
export default function ResumenPaciente({ paciente, pacienteId, patologias = [] }) {
  const [ultimaConsulta, setUltimaConsulta] = useState(null);
  const [ultimaHba1c, setUltimaHba1c] = useState(null);
  const [tratamiento, setTratamiento] = useState(null);

  useEffect(() => {
    getConsultas(pacienteId).then((r) => setUltimaConsulta(r.data?.[0] || null)).catch(() => {});
    getLaboratorios(pacienteId).then((r) => setUltimaHba1c((r.data || []).find((l) => num(l.hba1c)) || null)).catch(() => {});
    getTratamiento(pacienteId).then((r) => {
      const t = r.data?.tratamientos?.[0];
      if (!t) return setTratamiento(null);
      const ins = (r.data.insulinas || []).filter((i) => i.tratamiento_id === t.id).map((i) => i.insulina);
      const ora = (r.data.orales || []).filter((o) => o.activo).map((o) => o.antidiabetico);
      setTratamiento([t.terapia, t.esquema_insulina, t.dispositivo, ...ins, ...ora].filter(Boolean).join(" · "));
    }).catch(() => {});
  }, [pacienteId]);

  const dx = paciente?.diagnostico;
  const sinDx = !dx?.fecha_diagnostico && !dx?.fecha_approx_anio;
  const evolucion = aniosEvolucion(dx);
  const pats = patologias.map((p) => p.nombre).filter(Boolean);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 6 }}>
      {sinDx ? (
        <Dato etiqueta="Diagnóstico" alerta>Pendiente de capturar</Dato>
      ) : (
        <Dato etiqueta="Diabetes">
          {dx?.tipo_diabetes || "—"}{evolucion ? <span style={{ color: C.slate, fontWeight: 500 }}> · {evolucion} de evolución</span> : null}
        </Dato>
      )}
      <Dato etiqueta="Patologías asociadas">
        {pats.length ? <>{pats.slice(0, 3).join(", ")}{pats.length > 3 ? <span style={{ color: C.slate, fontWeight: 500 }}> +{pats.length - 3}</span> : null}</> : <span style={{ color: C.slate, fontWeight: 500 }}>Ninguna registrada</span>}
      </Dato>
      <Dato etiqueta="Última HbA1c">
        {ultimaHba1c ? <>{num(ultimaHba1c.hba1c)} %<span style={{ color: C.slate, fontWeight: 500 }}> · {fechaCorta(ultimaHba1c.fecha_muestra)}</span></> : <span style={{ color: C.slate, fontWeight: 500 }}>Sin registro</span>}
      </Dato>
      <Dato etiqueta="Tratamiento registrado">
        {tratamiento || <span style={{ color: C.slate, fontWeight: 500 }}>Sin registro</span>}
      </Dato>
      <Dato etiqueta="Última consulta">
        {ultimaConsulta ? <>{fechaCorta(ultimaConsulta.fecha_consulta)}{num(ultimaConsulta.peso) ? <span style={{ color: C.slate, fontWeight: 500 }}> · {num(ultimaConsulta.peso)} kg{num(ultimaConsulta.imc) ? ` · IMC ${num(ultimaConsulta.imc)}` : ""}</span> : null}</> : <span style={{ color: C.slate, fontWeight: 500 }}>Primera consulta</span>}
      </Dato>
    </div>
  );
}
