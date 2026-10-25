import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiActivity, FiDroplet, FiHeart, FiShield, FiBookOpen, FiChevronDown, FiCalendar, FiCheck, FiPlus, FiX,
} from "react-icons/fi";
import { createHojaConsulta, getConsultas, getTratamiento } from "../api/renacedApi";

const C = { violet: "#6366f1", green: "#22c55e", slate: "#64748b" };

const TERAPIAS = [["1", "Dieta y ejercicio"], ["2", "Oral"], ["3", "Insulina"], ["4", "Insulina+Oral"], ["5", "Otra"]];
const ESQUEMAS = [["1", "Tradicional"], ["2", "Premezcla"], ["3", "Basal"], ["4", "Basal-Bolo"], ["5", "Microinfusora"]];
const DISPOSITIVOS = [["1", "Jeringa"], ["2", "Pluma"], ["3", "Microinfusora"], ["4", "Otro"]];
const INSULINAS = [["1", "NPH"], ["2", "Glargina"], ["3", "Detemir"], ["4", "Degludec"], ["5", "Rápida"], ["6", "Lispro"], ["7", "Aspart"], ["8", "Glulisina"], ["14", "Glargina U300"], ["15", "FiAsp"]];
const ORALES = [["1", "Metformina"], ["2", "Sulfonilureas"], ["7", "Análogos GLP-1"], ["8", "Inhibidores DPP-4"], ["9", "Inhibidores SGLT2"], ["5", "Glitazonas"], ["10", "Otro"]];

const LAB_CAMPOS = [
  ["HbA1c (%)", "hba1c", "0.01"], ["Glucosa en ayuno", "glucosa_ayuno", "0.1"], ["Glucosa postprandial", "glucosa_postprandial", "0.1"],
  ["Colesterol total", "colesterol_total", "0.1"], ["HDL (mg/dl)", "hdl", "0.1"], ["LDL (mg/dl)", "ldl", "0.1"],
  ["Triglicéridos", "trigliceridos", "0.1"], ["Creatinina (mg/dl)", "creatinina", "0.001"], ["TFG (ml/min)", "tasa_filtracion", "0.1"],
  ["Microalbuminuria", "microalbuminuria", "0.1"], ["TSH (µUI/ml)", "tsh", "0.001"], ["Péptido C (ng/ml)", "c_peptido", "0.001"],
  ["Anti-GAD (nmol/L)", "anti_gad", "0.01"], ["Anti-IA2 (nmol/L)", "anti_ia2", "0.01"],
];

const hoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const lleno = (v) => v !== undefined && v !== null && String(v).trim() !== "";

const INIT = {
  visita: { peso: "", estatura: "", cintura: "", cadera: "", musculo_kg: "", grasa_kg: "", grasa_pct: "", grasa_visceral: "", perimetro_cefalico: "", pa_sistolica: "", pa_diastolica: "", percentil: "" },
  lab: { fecha_muestra: "", ...Object.fromEntries(LAB_CAMPOS.map(([, n]) => [n, ""])), observaciones: "" },
  trat: { fecha_inicio: "", terapia_id: "", esquema_insulina_id: "", dispositivo_id: "", insulinas: [{ insulina_id: "", dosis_unidades: "", frecuencia: "" }], orales: [{ antidiabetico_id: "", dosis_mg: "", frecuencia: "" }] },
  evalu: { retinopatia_id: "", nefropatia_id: "", neuropatia_id: "", pie_diabetico_id: "", enf_cardiovascular_id: "", observaciones: "" },
  edu: { tema: "", modalidad: "", duracion_min: "", educador: "", observaciones: "" },
};

function Campo({ label, children, ancho }) {
  return (
    <div className="form-group" style={ancho ? { gridColumn: `span ${ancho}` } : undefined}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

const grid = (min = 170) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14 });

function Seccion({ icono: Icono, color, titulo, descripcion, abierta, onToggle, estado, children }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${abierta ? color : "#e2e8f0"}`, borderRadius: 14, marginBottom: 12,
      boxShadow: abierta ? `0 6px 22px ${color}22` : "0 1px 3px rgba(0,0,0,.05)", transition: "box-shadow .2s, border-color .2s", overflow: "hidden",
    }}>
      <button
        type="button" onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}1a`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icono size={19} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{titulo}</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 1 }}>{descripcion}</div>
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 700, borderRadius: 20, padding: "3px 11px", whiteSpace: "nowrap",
          background: estado ? "#dcfce7" : "#f1f5f9", color: estado ? "#15803d" : "#94a3b8",
        }}>
          {estado ? "✓ Con datos" : "Sin datos"}
        </span>
        <motion.span animate={{ rotate: abierta ? 180 : 0 }} style={{ color: "#94a3b8", display: "flex" }}><FiChevronDown size={18} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "4px 18px 20px", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ paddingTop: 16 }}>{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HojaConsulta({ paciente, pacienteId, cats }) {
  const [fecha, setFecha] = useState(hoy());
  const [abiertas, setAbiertas] = useState({});
  const [f, setF] = useState(INIT);
  const [otraFechaLab, setOtraFechaLab] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [ultima, setUltima] = useState(null);
  const [vigente, setVigente] = useState(null);

  useEffect(() => {
    getConsultas(pacienteId).then((r) => setUltima(r.data?.[0] || null)).catch(() => {});
    getTratamiento(pacienteId).then((r) => {
      const t = r.data?.tratamientos?.[0];
      if (!t) return setVigente(null);
      const ins = (r.data.insulinas || []).filter((i) => i.tratamiento_id === t.id).map((i) => i.insulina);
      const ora = (r.data.orales || []).filter((o) => o.activo).map((o) => o.antidiabetico);
      setVigente({ t, ins, ora });
    }).catch(() => {});
  }, [pacienteId]);

  const set = (sec, campo, valor) => setF((p) => ({ ...p, [sec]: { ...p[sec], [campo]: valor } }));
  const alternar = (k) => setAbiertas((a) => ({ ...a, [k]: !a[k] }));

  function cambiarVisita(campo, valor) {
    set("visita", campo, valor);
  }
  const v = f.visita;
  // La estatura se captura en cm; en la base se guarda en metros.
  const estCm = parseFloat(v.estatura);
  const imc = useMemo(() => {
    const p = parseFloat(v.peso);
    return p > 0 && estCm > 0 ? (p / ((estCm / 100) ** 2)).toFixed(2) : "";
  }, [v.peso, estCm]);
  const icc = useMemo(() => {
    const a = parseFloat(v.cintura), b = parseFloat(v.cadera);
    return a > 0 && b > 0 ? (a / b).toFixed(2) : "";
  }, [v.cintura, v.cadera]);
  const ica = useMemo(() => {
    const a = parseFloat(v.cintura);
    return a > 0 && estCm > 0 ? (a / estCm).toFixed(3) : "";
  }, [v.cintura, estCm]);

  // ¿Qué secciones traen datos?
  const llenoVisita = ["peso", "estatura", "cintura", "cadera", "musculo_kg", "grasa_kg", "grasa_pct", "grasa_visceral", "perimetro_cefalico", "pa_sistolica", "pa_diastolica"].some((k) => lleno(v[k]));
  const llenoLab = LAB_CAMPOS.some(([, n]) => lleno(f.lab[n])) || lleno(f.lab.observaciones);
  const tr = f.trat;
  const llenoTrat = ["terapia_id", "esquema_insulina_id", "dispositivo_id"].some((k) => lleno(tr[k])) ||
    tr.insulinas.some((i) => lleno(i.insulina_id)) || tr.orales.some((o) => lleno(o.antidiabetico_id));
  const llenoEval = ["retinopatia_id", "nefropatia_id", "neuropatia_id", "pie_diabetico_id", "enf_cardiovascular_id", "observaciones"].some((k) => lleno(f.evalu[k]));
  const llenoEdu = lleno(f.edu.tema);
  const totalConDatos = [llenoVisita, llenoLab, llenoTrat, llenoEval, llenoEdu].filter(Boolean).length;

  async function guardar() {
    setError("");
    if (!fecha) return setError("La fecha de la consulta es obligatoria");
    if (!llenoVisita && totalConDatos === 0) return setError("Captura al menos una sección antes de guardar");
    if (!llenoEdu && lleno(f.edu.observaciones)) return setError("En Educación indica el tema de la sesión");
    setGuardando(true);
    try {
      const payload = {
        fecha_consulta: fecha,
        visita: { ...f.visita, estatura: estCm > 0 ? (estCm / 100).toFixed(3) : "", imc, indice_cc: icc, ica },
        laboratorio: llenoLab ? { ...f.lab, fecha_muestra: otraFechaLab ? f.lab.fecha_muestra : "" } : null,
        tratamiento: llenoTrat ? f.trat : null,
        evaluacion: llenoEval ? f.evalu : null,
        educacion: llenoEdu ? f.edu : null,
      };
      const { data } = await createHojaConsulta(pacienteId, payload);
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar la consulta");
    } finally {
      setGuardando(false);
    }
  }

  function nuevaConsulta() {
    setF(INIT); setAbiertas({}); setOtraFechaLab(false); setResultado(null); setFecha(hoy()); setError("");
    getConsultas(pacienteId).then((r) => setUltima(r.data?.[0] || null)).catch(() => {});
  }

  const NOMBRES = { visita: "Visita", laboratorio: "Laboratorio", tratamiento: "Tratamiento", evaluacion: "Complicaciones", educacion: "Educación" };

  if (resultado) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: "30px auto", textAlign: "center", padding: 34 }}>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18 }}
          style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
        >
          <FiCheck size={32} />
        </motion.div>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.2rem", color: "#0f172a" }}>Consulta registrada</h2>
        <p style={{ color: C.slate, fontSize: 14, margin: "0 0 14px" }}>
          Se guardó la consulta del <strong>{fecha}</strong> con:
        </p>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
          {resultado.guardado.map((k) => (
            <span key={k} style={{ background: "#eef2ff", color: "#4338ca", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{NOMBRES[k] || k}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to={`/renaced/pacientes/${pacienteId}`} className="btn btn-primary">Ver expediente</Link>
          <button className="btn btn-secondary" onClick={nuevaConsulta}>Registrar otra consulta</button>
        </div>
      </div>
    );
  }

  const imcAnterior = ultima?.imc;

  return (
    <div>
      {/* Barra fija: fecha + guardar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 15, background: "rgba(241,245,249,.94)", backdropFilter: "blur(6px)",
        padding: "10px 0 12px", marginBottom: 6, display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap",
      }}>
        <div style={{ minWidth: 190 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            <FiCalendar size={13} /> Fecha de la consulta
          </label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: "100%", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, fontWeight: 600 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160, fontSize: 12.5, color: C.slate }}>
          {ultima ? <>Última consulta: <strong>{String(ultima.fecha_consulta).slice(0, 10)}</strong>{imcAnterior ? ` · IMC ${imcAnterior}` : ""}</> : "Sin consultas previas"}
          <div>Abre una sección para capturar; las que queden vacías no se guardan.</div>
        </div>
        <button className="btn btn-primary" disabled={guardando} onClick={guardar} style={{ padding: "10px 24px", fontWeight: 700 }}>
          {guardando ? "Guardando…" : `Guardar consulta${totalConDatos ? ` (${totalConDatos})` : ""}`}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: "4px solid #ef4444", color: "#b91c1c", padding: "10px 14px", marginBottom: 12, fontSize: 14 }}>{error}</div>
      )}

      {/* 1 · Visita */}
      <Seccion icono={FiActivity} color="#6366f1" titulo="Visita" descripcion="Medidas corporales y presión arterial" abierta={!!abiertas.visita} onToggle={() => alternar("visita")} estado={llenoVisita}>
        <div style={subt}>Medidas</div>
        <div style={grid(160)}>
          <Campo label="Peso (kg)"><input type="number" step="0.01" value={v.peso} onChange={(e) => cambiarVisita("peso", e.target.value)} /></Campo>
          <Campo label="Estatura (cm)"><input type="number" step="0.1" value={v.estatura} onChange={(e) => cambiarVisita("estatura", e.target.value)} placeholder={ultima?.estatura ? `Últ.: ${Math.round(ultima.estatura * 100)}` : ""} /></Campo>
          <Campo label={<>IMC <span style={auto}>(auto)</span></>}><input value={imc} readOnly style={soloLectura} /></Campo>
          <Campo label="Cintura (cm)"><input type="number" step="0.1" value={v.cintura} onChange={(e) => cambiarVisita("cintura", e.target.value)} /></Campo>
          <Campo label="Cadera (cm)"><input type="number" step="0.1" value={v.cadera} onChange={(e) => cambiarVisita("cadera", e.target.value)} /></Campo>
          <Campo label={<>ICA <span style={auto}>(cintura/estatura)</span></>}><input value={ica} readOnly style={soloLectura} /></Campo>
          <Campo label={<>ICC <span style={auto}>(cintura/cadera)</span></>}><input value={icc} readOnly style={soloLectura} /></Campo>
          <Campo label="Músculo (kg)"><input type="number" step="0.01" value={v.musculo_kg} onChange={(e) => cambiarVisita("musculo_kg", e.target.value)} /></Campo>
          <Campo label="Grasa (kg)"><input type="number" step="0.01" value={v.grasa_kg} onChange={(e) => cambiarVisita("grasa_kg", e.target.value)} /></Campo>
          <Campo label="Grasa (%)"><input type="number" step="0.01" value={v.grasa_pct} onChange={(e) => cambiarVisita("grasa_pct", e.target.value)} /></Campo>
          <Campo label="Grasa visceral"><input type="number" step="0.01" value={v.grasa_visceral} onChange={(e) => cambiarVisita("grasa_visceral", e.target.value)} /></Campo>
          <Campo label="Perímetro cefálico (cm)"><input type="number" step="0.1" value={v.perimetro_cefalico} onChange={(e) => cambiarVisita("perimetro_cefalico", e.target.value)} /></Campo>
        </div>

        <div style={{ ...subt, marginTop: 18 }}>Signos</div>
        <div style={grid(160)}>
          {paciente?.edad != null && paciente.edad < 20 && (
            <Campo label="Percentil"><input type="text" value={v.percentil} onChange={(e) => cambiarVisita("percentil", e.target.value)} placeholder="ej. p50" /></Campo>
          )}
          <Campo label="PA sistólica (mmHg)"><input type="number" value={v.pa_sistolica} onChange={(e) => cambiarVisita("pa_sistolica", e.target.value)} /></Campo>
          <Campo label="PA diastólica (mmHg)"><input type="number" value={v.pa_diastolica} onChange={(e) => cambiarVisita("pa_diastolica", e.target.value)} /></Campo>
        </div>
      </Seccion>

      {/* 2 · Laboratorio */}
      <Seccion icono={FiDroplet} color="#0ea5e9" titulo="Laboratorio" descripcion="HbA1c, glucosa, lípidos, función renal y otros" abierta={!!abiertas.lab} onToggle={() => alternar("lab")} estado={llenoLab}>
        <div style={grid(180)}>
          {LAB_CAMPOS.map(([label, name, step]) => (
            <Campo key={name} label={label}><input type="number" step={step} value={f.lab[name]} onChange={(e) => set("lab", name, e.target.value)} /></Campo>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {otraFechaLab ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Campo label="Fecha en que se tomó la muestra">
                <input type="date" value={f.lab.fecha_muestra} onChange={(e) => set("lab", "fecha_muestra", e.target.value)} />
              </Campo>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 20 }} onClick={() => { setOtraFechaLab(false); set("lab", "fecha_muestra", ""); }}>Usar la fecha de la consulta</button>
            </div>
          ) : (
            <button type="button" onClick={() => setOtraFechaLab(true)} style={{ background: "none", border: "none", color: C.violet, fontSize: 12.5, cursor: "pointer", padding: 0, fontWeight: 600 }}>
              La muestra se tomó otro día…
            </button>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <Campo label="Observaciones"><textarea rows={2} value={f.lab.observaciones} onChange={(e) => set("lab", "observaciones", e.target.value)} style={{ resize: "vertical" }} /></Campo>
        </div>
      </Seccion>

      {/* 3 · Tratamiento */}
      <Seccion icono={FiHeart} color="#ec4899" titulo="Tratamiento" descripcion="Solo si inicia o cambia el tratamiento" abierta={!!abiertas.trat} onToggle={() => alternar("trat")} estado={llenoTrat}>
        {vigente && (
          <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, color: "#9d174d", marginBottom: 14 }}>
            <strong>Registrado actualmente:</strong>{" "}
            {[vigente.t.terapia, vigente.t.esquema_insulina, vigente.t.dispositivo, ...vigente.ins, ...vigente.ora].filter(Boolean).join(" · ") || "sin detalle"}
            {vigente.t.fecha_inicio ? ` (desde ${String(vigente.t.fecha_inicio).slice(0, 10)})` : ""}.
            {" "}Captura aquí solo si hay un cambio.
          </div>
        )}
        <div style={grid(200)}>
          <Campo label="Inicio del tratamiento">
            <input type="date" value={tr.fecha_inicio || fecha} onChange={(e) => set("trat", "fecha_inicio", e.target.value)} />
          </Campo>
          <Campo label="Terapia">
            <select value={tr.terapia_id} onChange={(e) => set("trat", "terapia_id", e.target.value)}>
              <option value="">— Seleccionar —</option>{TERAPIAS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Esquema de insulina">
            <select value={tr.esquema_insulina_id} onChange={(e) => set("trat", "esquema_insulina_id", e.target.value)}>
              <option value="">— Seleccionar —</option>{ESQUEMAS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Dispositivo">
            <select value={tr.dispositivo_id} onChange={(e) => set("trat", "dispositivo_id", e.target.value)}>
              <option value="">— Seleccionar —</option>{DISPOSITIVOS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Campo>
        </div>

        <div style={{ ...subt, marginTop: 18 }}>Insulinas</div>
        {tr.insulinas.map((i, idx) => (
          <div key={idx} style={{ ...grid(160), alignItems: "end", marginBottom: 8 }}>
            <Campo label="Insulina">
              <select value={i.insulina_id} onChange={(e) => set("trat", "insulinas", tr.insulinas.map((x, k) => (k === idx ? { ...x, insulina_id: e.target.value } : x)))}>
                <option value="">— Ninguna —</option>{INSULINAS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </Campo>
            <Campo label="Dosis (U)"><input type="number" step="0.01" value={i.dosis_unidades} onChange={(e) => set("trat", "insulinas", tr.insulinas.map((x, k) => (k === idx ? { ...x, dosis_unidades: e.target.value } : x)))} /></Campo>
            <Campo label="Frecuencia"><input type="text" value={i.frecuencia} onChange={(e) => set("trat", "insulinas", tr.insulinas.map((x, k) => (k === idx ? { ...x, frecuencia: e.target.value } : x)))} placeholder="ej. antes de cada comida" /></Campo>
            {tr.insulinas.length > 1 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("trat", "insulinas", tr.insulinas.filter((_, k) => k !== idx))} title="Quitar"><FiX /></button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("trat", "insulinas", [...tr.insulinas, { insulina_id: "", dosis_unidades: "", frecuencia: "" }])}><FiPlus /> Otra insulina</button>

        <div style={{ ...subt, marginTop: 18 }}>Antidiabéticos orales</div>
        {tr.orales.map((o, idx) => (
          <div key={idx} style={{ ...grid(160), alignItems: "end", marginBottom: 8 }}>
            <Campo label="Medicamento">
              <select value={o.antidiabetico_id} onChange={(e) => set("trat", "orales", tr.orales.map((x, k) => (k === idx ? { ...x, antidiabetico_id: e.target.value } : x)))}>
                <option value="">— Ninguno —</option>{ORALES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </Campo>
            <Campo label="Dosis (mg)"><input type="number" step="0.01" value={o.dosis_mg} onChange={(e) => set("trat", "orales", tr.orales.map((x, k) => (k === idx ? { ...x, dosis_mg: e.target.value } : x)))} /></Campo>
            <Campo label="Frecuencia"><input type="text" value={o.frecuencia} onChange={(e) => set("trat", "orales", tr.orales.map((x, k) => (k === idx ? { ...x, frecuencia: e.target.value } : x)))} placeholder="ej. 1 vez al día con desayuno" /></Campo>
            {tr.orales.length > 1 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("trat", "orales", tr.orales.filter((_, k) => k !== idx))} title="Quitar"><FiX /></button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("trat", "orales", [...tr.orales, { antidiabetico_id: "", dosis_mg: "", frecuencia: "" }])}><FiPlus /> Otro medicamento</button>
      </Seccion>

      {/* 4 · Complicaciones */}
      <Seccion icono={FiShield} color="#f59e0b" titulo="Complicaciones" descripcion="Retinopatía, nefropatía, neuropatía, pie diabético y cardiovascular" abierta={!!abiertas.evalu} onToggle={() => alternar("evalu")} estado={llenoEval}>
        <div style={grid(200)}>
          {[["Retinopatía", "retinopatia_id", cats.retinopatia], ["Nefropatía", "nefropatia_id", cats.nefropatia], ["Neuropatía", "neuropatia_id", cats.neuropatia], ["Pie diabético", "pie_diabetico_id", cats.pie_diabetico], ["Enf. cardiovascular", "enf_cardiovascular_id", cats.cardiovascular]].map(([label, campo, opciones]) => (
            <Campo key={campo} label={label}>
              <select value={f.evalu[campo]} onChange={(e) => set("evalu", campo, e.target.value)}>
                <option value="">— Sin registro —</option>
                {(opciones || []).map((o) => <option key={o.id} value={o.id}>{o.descripcion}</option>)}
              </select>
            </Campo>
          ))}
          <Campo label="Observaciones" ancho={2}><textarea rows={2} value={f.evalu.observaciones} onChange={(e) => set("evalu", "observaciones", e.target.value)} style={{ resize: "vertical" }} /></Campo>
        </div>
      </Seccion>

      {/* 5 · Educación */}
      <Seccion icono={FiBookOpen} color="#10b981" titulo="Educación" descripcion="Sesión educativa en diabetes" abierta={!!abiertas.edu} onToggle={() => alternar("edu")} estado={llenoEdu}>
        <div style={grid(200)}>
          <Campo label="Tema" ancho={2}><input type="text" value={f.edu.tema} onChange={(e) => set("edu", "tema", e.target.value)} placeholder="ej. Conteo de carbohidratos, ajuste de dosis…" /></Campo>
          <Campo label="Modalidad">
            <select value={f.edu.modalidad} onChange={(e) => set("edu", "modalidad", e.target.value)}>
              <option value="">Seleccionar</option>{["Individual", "Grupal", "Virtual", "Taller"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="Duración (min)"><input type="number" value={f.edu.duracion_min} onChange={(e) => set("edu", "duracion_min", e.target.value)} /></Campo>
          <Campo label="Educador"><input type="text" value={f.edu.educador} onChange={(e) => set("edu", "educador", e.target.value)} /></Campo>
          <Campo label="Observaciones" ancho={2}><textarea rows={2} value={f.edu.observaciones} onChange={(e) => set("edu", "observaciones", e.target.value)} style={{ resize: "vertical" }} /></Campo>
        </div>
      </Seccion>
    </div>
  );
}

const auto = { fontSize: 11, color: "#94a3b8", fontWeight: 400 };
const soloLectura = { background: "#f8fafc", color: "#64748b" };
const subt = { fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px", paddingBottom: 6, borderBottom: "1px solid #f1f5f9" };
