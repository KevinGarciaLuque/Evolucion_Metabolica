import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiUploadCloud, FiFileText, FiCheck, FiSearch, FiUser, FiX } from "react-icons/fi";
import RenacedLayout from "../components/RenacedLayout";
import AnalizandoOverlay, { TIEMPO_MIN } from "../../../../shared/components/AnalizandoOverlay";
import {
  getPacientes, getPaciente, subirEscaneoPDF, confirmarEscaneo, getMonitoresEscaneo,
} from "../api/renacedApi";

const C = { violet: "#6366f1", green: "#22c55e", amber: "#f59e0b", red: "#ef4444", slate: "#64748b" };

const nombreCompleto = (p) =>
  [p.nombre, p.ap_pat, p.ap_mat].filter(Boolean).join(" ");

const CLASIF = {
  OPTIMO:      { label: "Óptimo",      color: C.green },
  MODERADO:    { label: "Moderado",    color: C.amber },
  ALTO_RIESGO: { label: "Alto riesgo", color: C.red },
};

// Campos revisables agrupados por sección: [name, label, sufijo]
const SECCIONES = [
  ["Período del reporte", [
    ["fecha_inicio", "Inicio", ""],
    ["fecha_fin", "Fin", ""],
    ["periodo_dias", "Días del período", "días"],
    ["tiempo_activo", "Tiempo sensor activo", "%"],
    ["escaneos_dia", "Escaneos / día", ""],
  ]],
  ["Glucosa", [
    ["glucosa_promedio", "Glucosa promedio", "mg/dL"],
    ["gmi", "GMI", "%"],
    ["cv", "Coef. variación (CV)", "%"],
    ["desv_std", "Desviación estándar", "mg/dL"],
    ["gri", "GRI", ""],
  ]],
  ["Tiempo en rangos", [
    ["tir", "En rango (70–180)", "%"],
    ["tar", "Arriba (>180)", "%"],
    ["tar_alto", "Alto (181–250)", "%"],
    ["tar_muy_alto", "Muy alto (>250)", "%"],
    ["tbr", "Abajo (<70)", "%"],
    ["tbr_bajo", "Bajo (54–69)", "%"],
    ["tbr_muy_bajo", "Muy bajo (<54)", "%"],
  ]],
  ["Hipoglucemia", [
    ["eventos_hipoglucemia", "Eventos", ""],
    ["duracion_hipoglucemia", "Duración promedio", "min"],
  ]],
];
const CAMPOS = SECCIONES.flatMap(([, campos]) => campos);

const MONITORES_SOPORTADOS = ["FreeStyle Libre", "Dexcom Clarity", "Medtronic CareLink", "Tandem t:slim", "Tidepool"];

const hoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const num = (v) => (v === "" || v == null ? null : parseFloat(v));

// ── Piezas visuales ──────────────────────────────────────────────────────────
function Pasos({ actual }) {
  const pasos = ["Paciente y reporte", "Revisión", "Guardado"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {pasos.map((p, i) => {
        const hecho = i < actual, activo = i === actual;
        return (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800,
              background: hecho ? C.green : activo ? C.violet : "#e2e8f0",
              color: hecho || activo ? "#fff" : C.slate,
            }}>
              {hecho ? <FiCheck size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: activo ? 700 : 500, color: activo ? "#0f172a" : C.slate }}>{p}</span>
            {i < pasos.length - 1 && <div style={{ width: 36, height: 2, background: hecho ? C.green : "#e2e8f0", borderRadius: 2 }} />}
          </div>
        );
      })}
    </div>
  );
}

function Metrica({ label, valor, suf, color }) {
  return (
    <div style={{ flex: "1 1 120px", background: "#fff", border: "1px solid #e2e8f0", borderTop: `3px solid ${color}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
        {valor !== "" && valor != null ? valor : "—"}
        {valor !== "" && valor != null && <span style={{ fontSize: 12, fontWeight: 600, color: C.slate }}> {suf}</span>}
      </div>
    </div>
  );
}

function BarraRangos({ tir, tar, tbr }) {
  const a = Math.max(num(tar) || 0, 0), r = Math.max(num(tir) || 0, 0), b = Math.max(num(tbr) || 0, 0);
  const total = a + r + b || 1;
  const seg = (v, color) => ({ width: `${(v / total) * 100}%`, background: color, transition: "width .3s" });
  return (
    <div>
      <div style={{ display: "flex", height: 12, borderRadius: 8, overflow: "hidden", background: "#e2e8f0" }}>
        <div style={seg(a, C.amber)} title={`Arriba ${a}%`} />
        <div style={seg(r, C.green)} title={`En rango ${r}%`} />
        <div style={seg(b, C.red)} title={`Abajo ${b}%`} />
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11.5, color: C.slate, flexWrap: "wrap" }}>
        <span><i style={{ ...punto, background: C.amber }} /> Arriba {a}%</span>
        <span><i style={{ ...punto, background: C.green }} /> En rango {r}%</span>
        <span><i style={{ ...punto, background: C.red }} /> Abajo {b}%</span>
      </div>
    </div>
  );
}

export default function RenacedEscanearPDF() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preId = params.get("paciente");

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [dropdown, setDropdown] = useState(false);
  const [paciente, setPaciente] = useState(null);

  const [monitores, setMonitores] = useState([]);
  const [tipo, setTipo] = useState(""); // "" = detectar automático
  const [archivo, setArchivo] = useState(null);
  const [arrastrado, setArrastrado] = useState(false);
  const [etapa, setEtapa] = useState("subir"); // subir | revisar | guardado
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef();

  // Preseleccionar paciente por query param
  useEffect(() => {
    if (!preId) return;
    getPaciente(preId)
      .then((r) => setPaciente(r.data))
      .catch(() => {});
  }, [preId]);

  useEffect(() => {
    getMonitoresEscaneo().then((r) => setMonitores(r.data)).catch(() => {});
  }, []);

  // Buscar pacientes
  useEffect(() => {
    if (paciente || busqueda.trim().length < 2) { setResultados([]); return; }
    const t = setTimeout(() => {
      getPacientes({ busqueda: busqueda.trim(), limit: 15 })
        .then((r) => setResultados(r.data.data || []))
        .catch(() => setResultados([]));
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda, paciente]);

  function onDrop(e) {
    e.preventDefault();
    setArrastrado(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") { setArchivo(f); setError(""); }
    else setError("Solo se permiten archivos PDF");
  }

  async function analizar() {
    if (!paciente) return setError("Selecciona un paciente");
    if (!archivo) return setError("Adjunta el PDF del reporte");
    setError("");
    setSubiendo(true);
    try {
      const [{ data }] = await Promise.all([
        subirEscaneoPDF(paciente.id, archivo, tipo),
        new Promise((r) => setTimeout(r, TIEMPO_MIN)),
      ]);
      setDatos(data);
      const d = data.datos;
      setForm({
        paciente_id: paciente.id,
        fecha: hoy(),
        monitor: d.monitor ?? "",
        periodo_tipo: d.periodo_tipo ?? "",
        archivo_pdf: data.archivo,
        texto_extraido: d.textoExtraido ?? "",
        extras: d.extras ?? [],
        comentarios: "",
        ...Object.fromEntries(CAMPOS.map(([k]) => [k, d[k] ?? ""])),
      });
      setEtapa("revisar");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo procesar el PDF");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      await confirmarEscaneo(form);
      setEtapa("guardado");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el reporte");
    } finally {
      setGuardando(false);
    }
  }

  const tipoNombre = monitores.find((m) => m.clave === tipo)?.nombre ?? "detección automática";
  const clasif = datos?.datos?.clasificacion ? CLASIF[datos.datos.clasificacion] : null;
  const pasoActual = etapa === "subir" ? 0 : etapa === "revisar" ? 1 : 2;

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (etapa === "guardado") {
    return (
      <RenacedLayout>
        <div className="card" style={{ maxWidth: 520, margin: "40px auto", textAlign: "center", padding: 36 }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 18px",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l5 5 11-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <h2 style={{ margin: "0 0 6px", fontSize: "1.2rem", color: "#0f172a" }}>Reporte importado</h2>
          <p style={{ color: C.slate, fontSize: 14, margin: "0 0 24px" }}>
            El reporte de <strong>{form?.monitor}</strong> se registró en el historial de <strong>{nombreCompleto(paciente)}</strong>.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => navigate(`/renaced/pacientes/${paciente.id}`)}>
              Ver paciente
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEtapa("subir"); setArchivo(null); setForm(null); setDatos(null); setTipo("");
                if (!preId) { setPaciente(null); setBusqueda(""); }
              }}
            >
              Importar otro reporte
            </button>
          </div>
        </div>
      </RenacedLayout>
    );
  }

  return (
    <RenacedLayout>
      <AnalizandoOverlay visible={subiendo} subtitulo={`Lectura automática · ${tipoNombre}`} />

      {/* ── Encabezado ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link to={preId ? `/renaced/pacientes/${preId}` : "/renaced/dashboard"} className="btn btn-secondary btn-sm" title="Volver">
          <FiArrowLeft size={16} />
        </Link>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
              Importar reporte MCG{" "}
              <span style={{ background: "linear-gradient(90deg,#3b82f6,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                · Monitoreo continuo
              </span>
            </h1>
            <motion.div
              animate={{ boxShadow: ["0 0 0px rgba(124,58,237,0)", "0 0 14px rgba(124,58,237,0.5)", "0 0 0px rgba(124,58,237,0)"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 20,
                background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(96,165,250,0.1))",
                border: "1px solid rgba(124,58,237,0.3)", fontSize: 10, fontWeight: 800, color: "#7c3aed", letterSpacing: "0.8px",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 0l.9 2.1L7 3 5.1 4 4 7l-.9-2.1L1 4l1.9-1L4 0z" fill="#7c3aed" /></svg>
              AUTO
            </motion.div>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Extrae automáticamente TIR · TAR · TBR · GMI · CV desde el PDF de FreeStyle Libre, Dexcom, CareLink, Tandem o Tidepool
          </p>
        </div>
      </div>

      {etapa !== "subir" && <Pasos actual={pasoActual} />}

      {error && (
        <div className="card" style={{ borderLeft: `4px solid ${C.red}`, color: "#b91c1c", padding: "12px 16px", marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c" }}><FiX /></button>
        </div>
      )}

      {/* ── Etapa 1 · Paciente y reporte ─────────────────────────────────────── */}
      {etapa === "subir" && (
        <div className="upload-container" style={{ maxWidth: 720 }}>
          <div className="ai-card-wrapper">
            <div className="ai-spin-border" />
            <div className="card">

              {/* Banner */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "5px solid #f0f4ff" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 9px 14px rgba(124,58,237,0.38)", flexShrink: 0,
                }}>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <path d="M8.5 1.5l1.6 3.8L14 7l-3.9 1.7L8.5 14l-1.6-5.3L3 7l3.9-1.7z" stroke="#fff" strokeWidth="1.35" strokeLinejoin="round" fill="rgba(255,255,255,0.28)" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>Lectura automática de reportes</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.3 }}>Reconoce el tipo de monitor por sí solo</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <motion.span
                    animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }}
                  />
                  <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Sistema activo</span>
                </div>
              </div>

              {/* Métricas que extrae */}
              <div style={{ marginBottom: 22 }}>
                <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  Extrae automáticamente
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "TIR", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                    { label: "TAR", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                    { label: "TBR", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                    { label: "GMI", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
                    { label: "CV", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                    { label: "Glucosa prom.", color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
                    { label: "Insulina diaria", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
                  ].map((c) => (
                    <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Paso 1 · Paciente */}
              <div className="step-row">
                <div className={`step-badge ${paciente ? "step-done" : "step-active"}`}>
                  {paciente
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <span>1</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="step-label">
                    Seleccionar paciente
                    {paciente && (
                      <>
                        <span className="step-check-pill">✓ {nombreCompleto(paciente)}</span>
                        {!preId && (
                          <button
                            onClick={() => { setPaciente(null); setBusqueda(""); }}
                            style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "2px 10px", fontSize: 12, color: "#94a3b8", cursor: "pointer", fontWeight: 500 }}
                          >
                            Cambiar
                          </button>
                        )}
                      </>
                    )}
                  </p>
                  {!paciente && (
                    <div style={{ position: "relative" }}>
                      <FiSearch size={15} style={{ position: "absolute", left: 12, top: 13, color: "#94a3b8" }} />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o CURP…"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setDropdown(true); }}
                        onFocus={() => setDropdown(true)}
                        onBlur={() => setTimeout(() => setDropdown(false), 180)}
                        style={{ ...inp, padding: "10px 12px 10px 36px" }}
                      />
                      <AnimatePresence>
                        {dropdown && resultados.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            style={{
                              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                              listStyle: "none", margin: "4px 0 0", padding: 0, background: "#fff",
                              border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 260, overflowY: "auto",
                              boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                            }}
                          >
                            {resultados.map((p) => (
                              <li
                                key={p.id}
                                onMouseDown={() => { setPaciente(p); setDropdown(false); setBusqueda(""); }}
                                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                              >
                                <span style={{ fontWeight: 600 }}>{nombreCompleto(p)}</span>
                                {p.curp && <span style={{ color: C.slate, fontSize: 12, marginLeft: 8 }}>{p.curp}</span>}
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 18 }} />

              {/* Paso 2 · Tipo de reporte */}
              <div className="step-row">
                <div className="step-badge step-active"><span>2</span></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="step-label">Tipo de reporte <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>(opcional)</span></p>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inp}>
                    <option value="">Detectar automáticamente</option>
                    {monitores.map((m) => <option key={m.clave} value={m.clave}>{m.nombre}</option>)}
                  </select>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>
                    Déjalo en automático; elige uno solo si el sistema no reconoce el PDF.
                  </div>
                </div>
              </div>

              <div style={{ height: 18 }} />

              {/* Paso 3 · Archivo */}
              <div className="step-row">
                <div className={`step-badge ${archivo ? "step-done" : paciente ? "step-active" : "step-locked"}`}>
                  {archivo
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <span>3</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className={`step-label ${paciente ? "" : "step-label-locked"}`}>Adjuntar el PDF</p>

                  {!paciente ? (
                    <div className="drop-zone-locked">
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7 9.5v-2a3 3 0 0 1 6 0v2" stroke="rgba(99,179,237,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                          <rect x="5" y="9.5" width="10" height="7" rx="2" fill="rgba(99,179,237,0.07)" stroke="rgba(99,179,237,0.25)" strokeWidth="1.2" />
                          <circle cx="10" cy="13" r="1" fill="rgba(99,179,237,0.5)" />
                        </svg>
                      </div>
                      <p style={{ color: "rgba(99,179,237,0.65)", fontSize: 13, margin: "10px 0 3px", fontWeight: 600 }}>Selecciona primero un paciente</p>
                      <p style={{ color: "rgba(99,179,237,0.3)", fontSize: 11, margin: 0 }}>Completa el paso 1 para continuar</p>
                    </div>
                  ) : (
                    <div
                      className={`drop-zone ${arrastrado ? "arrastrado" : ""} ${archivo ? "con-archivo" : ""}`}
                      onClick={() => inputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setArrastrado(true); }}
                      onDragLeave={() => setArrastrado(false)}
                      onDrop={onDrop}
                    >
                      <input ref={inputRef} type="file" accept="application/pdf" hidden
                        onChange={(e) => { if (e.target.files[0]) { setArchivo(e.target.files[0]); setError(""); } }} />
                      {archivo ? (
                        <div style={{ position: "relative", zIndex: 2 }}>
                          <div style={{ width: 54, height: 54, borderRadius: 14, margin: "0 auto 12px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <FiFileText size={24} />
                          </div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{archivo.name}</p>
                          <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#64748b" }}>
                            {archivo.size < 1048576 ? (archivo.size / 1024).toFixed(1) + " KB" : (archivo.size / 1048576).toFixed(1) + " MB"} · PDF
                          </p>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.32)" }}>
                            <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                            Listo para analizar
                          </span>
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>Clic para cambiar archivo</p>
                        </div>
                      ) : (
                        <>
                          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} viewBox="0 0 300 170" preserveAspectRatio="none">
                            {Array.from({ length: 9 }, (_, xi) =>
                              Array.from({ length: 6 }, (_, yi) => (
                                <circle key={`${xi}-${yi}`} cx={xi * 35 + 17} cy={yi * 28 + 14} r="0.75" fill="rgba(99,179,237,0.38)" />
                              ))
                            ).flat()}
                          </svg>
                          <motion.div
                            animate={{ top: ["10%", "90%", "10%"] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
                            style={{
                              position: "absolute", left: "6%", right: "6%", height: 1.5,
                              background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.75), rgba(124,58,237,0.75), transparent)",
                              borderRadius: 2, boxShadow: "0 0 10px rgba(96,165,250,0.5)", pointerEvents: "none", zIndex: 1,
                            }}
                          />
                          <div style={{ position: "relative", zIndex: 2 }}>
                            <div style={{ width: 54, height: 54, borderRadius: 14, margin: "0 auto 14px", background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.25)", color: "#63b3ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <FiUploadCloud size={26} />
                            </div>
                            <motion.div
                              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 11px", borderRadius: 20, marginBottom: 10, background: "rgba(96,165,250,0.09)", border: "1px solid rgba(96,165,250,0.22)", fontSize: 10, color: "#63b3ed", fontWeight: 700, letterSpacing: "0.8px" }}
                            >
                              <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
                              LISTO PARA IMPORTAR
                            </motion.div>
                            <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, margin: "0 0 5px" }}>Arrastra el PDF aquí o haz clic</p>
                            <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>Reporte del monitor de glucosa · Máx. 20 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 8 }}>
                {archivo && (
                  <button className="btn btn-outline" onClick={() => setArchivo(null)}>Cancelar</button>
                )}
                <motion.button
                  onClick={analizar}
                  disabled={subiendo || !archivo || !paciente}
                  whileHover={!subiendo && archivo && paciente ? { scale: 1.03, boxShadow: "0 0 28px rgba(124,58,237,0.55), 0 0 60px rgba(96,165,250,0.25)" } : {}}
                  whileTap={!subiendo && archivo && paciente ? { scale: 0.97 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{
                    position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 28px", borderRadius: 12, border: "none", color: "#fff", fontWeight: 600, fontSize: 14,
                    cursor: subiendo || !archivo || !paciente ? "not-allowed" : "pointer",
                    background: subiendo || !archivo || !paciente
                      ? "linear-gradient(135deg, #94a3b8, #64748b)"
                      : "linear-gradient(135deg, #3b82f6 0%, #7c3aed 60%, #6d28d9 100%)",
                    boxShadow: subiendo || !archivo || !paciente ? "none" : "0 4px 20px rgba(124,58,237,0.35)",
                  }}
                >
                  {!subiendo && archivo && paciente && (
                    <motion.span
                      animate={{ x: ["-120%", "220%"] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                      style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", transform: "skewX(-15deg)", pointerEvents: "none" }}
                    />
                  )}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1l1.5 3.5L13 6l-2.5 2.5.6 3.5L8 10.5 4.9 12l.6-3.5L3 6l3.5-1.5L8 1z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(255,255,255,0.25)" />
                  </svg>
                  <span>{subiendo ? "Analizando..." : "Analizar reporte"}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Etapa 2 · Revisión ───────────────────────────────────────────────── */}
      {etapa === "revisar" && form && (
        <>
          <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...iconoDrop, margin: 0, width: 40, height: 40, background: "#eef2ff", color: C.violet }}><FiUser size={18} /></div>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{nombreCompleto(paciente)}</div>
                <div style={{ fontSize: 12, color: C.slate }}>
                  {form.monitor}{datos?.datos?.dispositivo ? ` · ${datos.datos.dispositivo}` : ""}
                </div>
              </div>
            </div>
            {clasif && (
              <span style={{ background: `${clasif.color}1a`, color: clasif.color, borderRadius: 20, padding: "5px 16px", fontWeight: 800, fontSize: 13 }}>
                {clasif.label}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Metrica label="En rango" valor={form.tir} suf="%" color={C.green} />
            <Metrica label="Arriba" valor={form.tar} suf="%" color={C.amber} />
            <Metrica label="Abajo" valor={form.tbr} suf="%" color={C.red} />
            <Metrica label="Promedio" valor={form.glucosa_promedio} suf="mg/dL" color={C.violet} />
            <Metrica label="GMI" valor={form.gmi} suf="%" color={C.violet} />
            <Metrica label="CV" valor={form.cv} suf="%" color={C.violet} />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <BarraRangos tir={form.tir} tar={form.tar} tbr={form.tbr} />
          </div>

          <div className="card">
            <h3 style={{ ...tituloCard, marginBottom: 4 }}>Revisar y confirmar</h3>
            <p style={{ fontSize: 12.5, color: C.slate, margin: "0 0 16px" }}>
              Los valores se extrajeron automáticamente del PDF. Corrige lo que haga falta antes de guardar.
            </p>

            <div style={{ maxWidth: 220, marginBottom: 18 }}>
              <label style={lbl}>Fecha de captura</label>
              <input type="date" value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={inp} />
            </div>

            {SECCIONES.map(([titulo, campos]) => (
              <div key={titulo} style={{ marginBottom: 18 }}>
                <div style={subtitulo}>{titulo}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                  {campos.map(([name, label, suf]) => {
                    const esFecha = name.startsWith("fecha_");
                    return (
                      <div key={name}>
                        <label style={lbl}>{label}{suf ? ` (${suf})` : ""}</label>
                        <input
                          type={esFecha ? "date" : "text"}
                          value={form[name] ?? ""}
                          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                          style={inp}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {form.extras?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={subtitulo}>Datos propios de {form.monitor}</div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "6px 16px", fontSize: 13 }}>
                  {form.extras.map((e) => (
                    <div key={e.label}><span style={{ color: C.slate }}>{e.label}: </span><strong>{e.valor}</strong></div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={lbl}>Comentarios</label>
              <textarea
                rows={3}
                value={form.comentarios}
                onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                style={{ ...inp, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={guardando} onClick={guardar}>
                {guardando ? "Guardando…" : "Guardar reporte"}
              </button>
              <button className="btn btn-secondary" disabled={guardando}
                onClick={() => { setEtapa("subir"); setForm(null); setDatos(null); }}>
                Volver
              </button>
            </div>
          </div>
        </>
      )}
    </RenacedLayout>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 14, boxSizing: "border-box" };
const tituloCard = { margin: "0 0 12px", fontSize: "0.9rem", color: C.violet, display: "flex", alignItems: "center", gap: 7 };
const subtitulo = { fontSize: 12, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px", paddingBottom: 6, borderBottom: "1px solid #f1f5f9" };
const iconoDrop = { width: 56, height: 56, borderRadius: 16, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" };
const punto = { display: "inline-block", width: 9, height: 9, borderRadius: "50%", marginRight: 5 };
