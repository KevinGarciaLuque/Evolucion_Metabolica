import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiActivity, FiDroplet, FiHeart, FiShield, FiBookOpen, FiChevronDown } from "react-icons/fi";
import { getHistorialConsultas } from "../api/renacedApi";

const C = { violet: "#6366f1", slate: "#64748b" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const LAB_ETIQUETAS = {
  hba1c: ["HbA1c", "%"], glucosa_ayuno: ["Glucosa en ayuno", "mg/dl"], glucosa_postprandial: ["Glucosa postprandial", "mg/dl"],
  colesterol_total: ["Colesterol total", "mg/dl"], hdl: ["HDL", "mg/dl"], ldl: ["LDL", "mg/dl"], trigliceridos: ["Triglicéridos", "mg/dl"],
  creatinina: ["Creatinina", "mg/dl"], tasa_filtracion: ["TFG", "ml/min"], microalbuminuria: ["Microalbuminuria", ""],
  tsh: ["TSH", "µUI/ml"], c_peptido: ["Péptido C", "ng/ml"], anti_gad: ["Anti-GAD", "nmol/L"], anti_ia2: ["Anti-IA2", "nmol/L"], insulinemia: ["Insulinemia", ""],
};

const tiene = (v) => v !== null && v !== undefined && String(v).trim() !== "";
const num = (v) => (tiene(v) ? String(parseFloat(v)) : null); // quita ceros sobrantes: 62.00 → 62

function fechaLarga(f) {
  if (f === "sin_fecha") return { dia: "—", mes: "", anio: "", texto: "Registros sin fecha" };
  const [a, m, d] = f.split("-");
  return { dia: d, mes: MESES[parseInt(m, 10) - 1] || m, anio: a, texto: `${parseInt(d, 10)} de ${MESES[parseInt(m, 10) - 1]} de ${a}` };
}

function Dato({ etiqueta, valor }) {
  if (!tiene(valor)) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "3px 0", borderBottom: "1px dashed #eef2f7" }}>
      <span style={{ color: C.slate }}>{etiqueta}</span>
      <strong style={{ color: "#0f172a", textAlign: "right" }}>{valor}</strong>
    </div>
  );
}

function Bloque({ icono: Icono, color, titulo, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: `3px solid ${color}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 12, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        <Icono size={14} /> {titulo}
      </div>
      {children}
    </div>
  );
}

function Detalle({ v }) {
  const c = v.visita;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, padding: "4px 18px 18px" }}>
      {c && (
        <Bloque icono={FiActivity} color="#6366f1" titulo="Visita">
          <Dato etiqueta="Peso" valor={num(c.peso) && `${num(c.peso)} kg`} />
          <Dato etiqueta="Estatura" valor={num(c.estatura) && `${Math.round(parseFloat(c.estatura) * 100)} cm`} />
          <Dato etiqueta="IMC" valor={num(c.imc)} />
          <Dato etiqueta="Percentil" valor={c.percentil} />
          <Dato etiqueta="Cintura" valor={num(c.cintura) && `${num(c.cintura)} cm`} />
          <Dato etiqueta="Cadera" valor={num(c.cadera) && `${num(c.cadera)} cm`} />
          <Dato etiqueta="ICA" valor={num(c.ica)} />
          <Dato etiqueta="ICC" valor={num(c.indice_cc)} />
          <Dato etiqueta="Músculo" valor={num(c.musculo_kg) && `${num(c.musculo_kg)} kg`} />
          <Dato etiqueta="Grasa" valor={num(c.grasa_kg) && `${num(c.grasa_kg)} kg`} />
          <Dato etiqueta="Grasa %" valor={num(c.grasa_pct) && `${num(c.grasa_pct)} %`} />
          <Dato etiqueta="Grasa visceral" valor={num(c.grasa_visceral)} />
          <Dato etiqueta="Perímetro cefálico" valor={num(c.perimetro_cefalico) && `${num(c.perimetro_cefalico)} cm`} />
          <Dato etiqueta="Presión arterial" valor={c.pa_sistolica && c.pa_diastolica ? `${c.pa_sistolica}/${c.pa_diastolica} mmHg` : null} />
        </Bloque>
      )}

      {v.laboratorio.map((l) => (
        <Bloque key={`l${l.id}`} icono={FiDroplet} color="#0ea5e9" titulo="Laboratorio">
          {String(l.fecha_muestra).slice(0, 10) !== v.fecha && <Dato etiqueta="Muestra tomada el" valor={String(l.fecha_muestra).slice(0, 10)} />}
          {Object.entries(LAB_ETIQUETAS).map(([k, [et, un]]) => (
            <Dato key={k} etiqueta={et} valor={num(l[k]) && `${num(l[k])}${un ? ` ${un}` : ""}`} />
          ))}
          <Dato etiqueta="Observaciones" valor={l.observaciones} />
        </Bloque>
      ))}

      {v.tratamiento.length > 0 && (
        <Bloque icono={FiHeart} color="#ec4899" titulo="Tratamiento">
          {v.tratamiento.map((t) => (
            t.tipo === "oral" ? (
              <div key={`o${t.id}`} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px dashed #eef2f7" }}>
                <strong>{t.antidiabetico || "Antidiabético oral"}</strong>
                <span style={{ color: C.slate }}> {[num(t.dosis_mg) && `${num(t.dosis_mg)} mg`, t.frecuencia].filter(Boolean).join(" · ")}</span>
              </div>
            ) : (
              <div key={`t${t.id}`} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px dashed #eef2f7" }}>
                <strong>{[t.terapia, t.esquema_insulina, t.dispositivo].filter(Boolean).join(" · ") || "Tratamiento"}</strong>
                {t.insulinas.map((i, k) => (
                  <div key={k} style={{ color: C.slate, paddingLeft: 10 }}>
                    {i.insulina}{num(i.dosis_unidades) ? ` · ${num(i.dosis_unidades)} U` : ""}{i.frecuencia ? ` · ${i.frecuencia}` : ""}
                  </div>
                ))}
              </div>
            )
          ))}
        </Bloque>
      )}

      {v.evaluacion.map((e) => (
        <Bloque key={`e${e.id}`} icono={FiShield} color="#f59e0b" titulo="Complicaciones">
          <Dato etiqueta="Retinopatía" valor={e.retinopatia} />
          <Dato etiqueta="Nefropatía" valor={e.nefropatia} />
          <Dato etiqueta="Neuropatía" valor={e.neuropatia} />
          <Dato etiqueta="Pie diabético" valor={e.pie_diabetico} />
          <Dato etiqueta="Enf. cardiovascular" valor={e.enf_cardiovascular} />
          <Dato etiqueta="Observaciones" valor={e.observaciones} />
        </Bloque>
      ))}

      {v.educacion.map((d) => (
        <Bloque key={`d${d.id}`} icono={FiBookOpen} color="#10b981" titulo="Educación">
          <Dato etiqueta="Tema" valor={d.tema} />
          <Dato etiqueta="Modalidad" valor={d.modalidad} />
          <Dato etiqueta="Duración" valor={d.duracion_min ? `${d.duracion_min} min` : null} />
          <Dato etiqueta="Educador" valor={d.educador} />
          <Dato etiqueta="Observaciones" valor={d.observaciones} />
        </Bloque>
      ))}
    </div>
  );
}

function Chip({ color, children }) {
  return <span style={{ background: `${color}1a`, color, borderRadius: 20, padding: "2px 10px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

export default function HistorialConsultas({ pacienteId }) {
  const [visitas, setVisitas] = useState(null);
  const [error, setError] = useState("");
  const [abiertas, setAbiertas] = useState({});
  const [anio, setAnio] = useState("");

  useEffect(() => {
    setVisitas(null); setError("");
    getHistorialConsultas(pacienteId)
      .then((r) => setVisitas(r.data))
      .catch((e) => setError(e.response?.data?.error || "No se pudo cargar el historial"));
  }, [pacienteId]);

  const anios = useMemo(
    () => [...new Set((visitas || []).filter((v) => v.fecha !== "sin_fecha").map((v) => v.fecha.slice(0, 4)))],
    [visitas]
  );
  const lista = (visitas || []).filter((v) => !anio || v.fecha.startsWith(anio));
  const alternar = (f) => setAbiertas((a) => ({ ...a, [f]: !a[f] }));
  const todasAbiertas = lista.length > 0 && lista.every((v) => abiertas[v.fecha]);

  if (error) return <div className="card" style={{ color: "#dc2626" }}>{error}</div>;
  if (!visitas) return <div className="loading">Cargando historial…</div>;
  if (visitas.length === 0) return <div className="card empty-cell">Este paciente aún no tiene consultas registradas</div>;

  const conFecha = visitas.filter((v) => v.fecha !== "sin_fecha");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: C.slate }}>
          <strong style={{ color: "#0f172a", fontSize: 15 }}>{conFecha.length} {conFecha.length === 1 ? "visita" : "visitas"}</strong>
          {conFecha.length > 0 && <> · de {fechaLarga(conFecha[conFecha.length - 1].fecha).texto} a {fechaLarga(conFecha[0].fecha).texto}</>}
        </div>
        {anios.length > 1 && (
          <select value={anio} onChange={(e) => setAnio(e.target.value)} style={{ padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}>
            <option value="">Todos los años</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <button className="btn btn-secondary btn-sm" onClick={() => setAbiertas(todasAbiertas ? {} : Object.fromEntries(lista.map((v) => [v.fecha, true])))}>
          {todasAbiertas ? "Contraer todo" : "Expandir todo"}
        </button>
      </div>

      <div style={{ position: "relative", paddingLeft: 26 }}>
        <div style={{ position: "absolute", left: 9, top: 6, bottom: 6, width: 2, background: "linear-gradient(#c7d2fe,#e2e8f0)", borderRadius: 2 }} />
        {lista.map((v) => {
          const f = fechaLarga(v.fecha);
          const abierta = !!abiertas[v.fecha];
          const c = v.visita;
          const hba = v.laboratorio.map((l) => num(l.hba1c)).find(Boolean);
          const resumen = [
            c && num(c.peso) && `${num(c.peso)} kg`,
            c && num(c.imc) && `IMC ${num(c.imc)}`,
            c && c.pa_sistolica && c.pa_diastolica && `PA ${c.pa_sistolica}/${c.pa_diastolica}`,
            hba && `HbA1c ${hba}%`,
          ].filter(Boolean).join("  ·  ");
          return (
            <div key={v.fecha} style={{ position: "relative", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: -23, top: 20, width: 12, height: 12, borderRadius: "50%", background: abierta ? C.violet : "#fff", border: `3px solid ${C.violet}` }} />
              <div style={{ background: "#fff", border: `1px solid ${abierta ? C.violet : "#e2e8f0"}`, borderRadius: 14, overflow: "hidden", boxShadow: abierta ? "0 6px 22px rgba(99,102,241,.13)" : "0 1px 3px rgba(0,0,0,.05)" }}>
                <button type="button" onClick={() => alternar(v.fecha)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 52, textAlign: "center", flexShrink: 0, lineHeight: 1.1 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{f.dia}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.violet, textTransform: "uppercase" }}>{f.mes} {f.anio}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: resumen ? 4 : 0 }}>
                      {c && <Chip color="#6366f1">Visita</Chip>}
                      {v.laboratorio.length > 0 && <Chip color="#0ea5e9">Laboratorio{v.laboratorio.length > 1 ? ` ×${v.laboratorio.length}` : ""}</Chip>}
                      {v.tratamiento.length > 0 && <Chip color="#ec4899">Tratamiento</Chip>}
                      {v.evaluacion.length > 0 && <Chip color="#f59e0b">Complicaciones</Chip>}
                      {v.educacion.length > 0 && <Chip color="#10b981">Educación</Chip>}
                    </div>
                    {resumen && <div style={{ fontSize: 12.5, color: C.slate, whiteSpace: "pre" }}>{resumen}</div>}
                  </div>
                  <motion.span animate={{ rotate: abierta ? 180 : 0 }} style={{ color: "#94a3b8", display: "flex" }}><FiChevronDown size={18} /></motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {abierta && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ paddingTop: 14 }}><Detalle v={v} /></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
