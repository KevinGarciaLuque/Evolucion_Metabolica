import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import RenacedLayout from "../../components/RenacedLayout";
import {
  getPacientes, getPaciente, subirEscaneoPDF, confirmarEscaneo,
} from "../../api/renacedApi";

const C = { violet: "#6366f1", green: "#22c55e", amber: "#f59e0b", red: "#ef4444", slate: "#64748b" };

const nombreCompleto = (p) =>
  [p.nombre, p.ap_pat, p.ap_mat].filter(Boolean).join(" ");

const CLASIF = {
  OPTIMO:      { label: "Óptimo",      color: C.green },
  MODERADO:    { label: "Moderado",    color: C.amber },
  ALTO_RIESGO: { label: "Alto riesgo", color: C.red },
};

// Campos revisables [name, label, sufijo]
const CAMPOS = [
  ["fecha_inicio", "Inicio del período", ""],
  ["fecha_fin", "Fin del período", ""],
  ["periodo_dias", "Días del período", " días"],
  ["tiempo_activo", "Tiempo sensor activo", " %"],
  ["glucosa_promedio", "Glucosa promedio", " mg/dL"],
  ["gmi", "GMI", " %"],
  ["cv", "Coef. variación (CV)", " %"],
  ["tir", "Tiempo en rango (70–180)", " %"],
  ["tar", "Tiempo arriba (>180)", " %"],
  ["tar_alto", "Alto (181–250)", " %"],
  ["tar_muy_alto", "Muy alto (>250)", " %"],
  ["tbr", "Tiempo abajo (<70)", " %"],
  ["tbr_bajo", "Bajo (54–69)", " %"],
  ["tbr_muy_bajo", "Muy bajo (<54)", " %"],
  ["gri", "GRI", ""],
  ["escaneos_dia", "Escaneos / día", ""],
  ["eventos_hipoglucemia", "Eventos de hipoglucemia", ""],
  ["duracion_hipoglucemia", "Duración prom. hipoglucemia", " min"],
];

const hoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

export default function RenacedEscanearPDF() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preId = params.get("paciente");

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [dropdown, setDropdown] = useState(false);
  const [paciente, setPaciente] = useState(null);

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
    if (f?.type === "application/pdf") setArchivo(f);
    else setError("Solo se permiten archivos PDF");
  }

  async function analizar() {
    if (!paciente) return setError("Selecciona un paciente");
    if (!archivo) return setError("Adjunta el PDF del reporte");
    setError("");
    setSubiendo(true);
    try {
      const { data } = await subirEscaneoPDF(paciente.id, archivo);
      setDatos(data);
      const d = data.datos;
      setForm({
        paciente_id: paciente.id,
        fecha: hoy(),
        monitor: d.monitor ?? "",
        periodo_tipo: d.periodo_tipo ?? "",
        archivo_pdf: data.archivo,
        texto_extraido: d.textoExtraido ?? "",
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
      setError(err.response?.data?.error || "No se pudo guardar el escaneo");
    } finally {
      setGuardando(false);
    }
  }

  const clasif = datos?.datos?.clasificacion ? CLASIF[datos.datos.clasificacion] : null;

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
          <h2 style={{ margin: "0 0 6px", fontSize: "1.2rem", color: "#0f172a" }}>Escaneo guardado</h2>
          <p style={{ color: C.slate, fontSize: 14, margin: "0 0 24px" }}>
            El reporte se registró en el historial de <strong>{nombreCompleto(paciente)}</strong>.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => navigate(`/renaced/pacientes/${paciente.id}`)}>
              Ver paciente
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEtapa("subir"); setArchivo(null); setForm(null); setDatos(null);
                if (!preId) { setPaciente(null); setBusqueda(""); }
              }}
            >
              Escanear otro PDF
            </button>
          </div>
        </div>
      </RenacedLayout>
    );
  }

  return (
    <RenacedLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Link to={preId ? `/renaced/pacientes/${preId}` : "/renaced/dashboard"} className="btn btn-secondary btn-sm" title="Volver">
          <FiArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
            Escanear reporte PDF
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Extracción automática de métricas de monitoreo continuo de glucosa · FreeStyle Libre (AGP)
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: `4px solid ${C.red}`, color: "#b91c1c", padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* ── Paso 1 · Paciente ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: C.violet }}>1 · Paciente</h3>
        {paciente ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{nombreCompleto(paciente)}</div>
              <div style={{ fontSize: 12, color: C.slate }}>
                {paciente.folio_renaced ? `Folio ${paciente.folio_renaced}` : null}
                {paciente.curp ? `  ·  CURP ${paciente.curp}` : null}
              </div>
            </div>
            {!preId && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setPaciente(null); setBusqueda(""); }}>
                Cambiar
              </button>
            )}
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o CURP…"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setDropdown(true); }}
              onFocus={() => setDropdown(true)}
              onBlur={() => setTimeout(() => setDropdown(false), 180)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
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

      {/* ── Paso 2 · PDF ───────────────────────────────────────────────────── */}
      {etapa === "subir" && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: C.violet }}>2 · Archivo PDF</h3>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastrado(true); }}
            onDragLeave={() => setArrastrado(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${arrastrado ? C.violet : "#cbd5e1"}`,
              borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer",
              background: arrastrado ? "#f5f3ff" : archivo ? "#f0fdf4" : "#f8fafc",
              transition: "all .15s",
            }}
          >
            <input ref={inputRef} type="file" accept="application/pdf" hidden
              onChange={(e) => e.target.files[0] && setArchivo(e.target.files[0])} />
            {archivo ? (
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{archivo.name}</div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>
                  {(archivo.size / 1024).toFixed(0)} KB · clic para cambiar
                </div>
              </div>
            ) : (
              <div style={{ color: C.slate }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#334155" }}>Arrastra el PDF aquí o haz clic</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Reporte AGP de FreeStyle Libre · máx. 20 MB</div>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: 16, width: "100%" }}
            disabled={!paciente || !archivo || subiendo}
            onClick={analizar}
          >
            {subiendo ? "Analizando PDF…" : "Analizar PDF"}
          </button>
        </div>
      )}

      {/* ── Paso 3 · Revisar ───────────────────────────────────────────────── */}
      {etapa === "revisar" && form && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", color: C.violet }}>3 · Revisar y confirmar</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.slate }}>{form.monitor}</span>
              {clasif && (
                <span style={{ background: `${clasif.color}1a`, color: clasif.color, borderRadius: 20, padding: "3px 12px", fontWeight: 700, fontSize: 12 }}>
                  {clasif.label}
                </span>
              )}
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: C.slate, margin: "0 0 16px" }}>
            Los valores se extrajeron automáticamente. Corrige lo que haga falta antes de guardar.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>Fecha de captura</label>
              <input type="date" value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={inp} />
            </div>
            {CAMPOS.map(([name, label, suf]) => {
              const esFecha = name.startsWith("fecha_");
              return (
                <div key={name}>
                  <label style={lbl}>{label}{suf && !esFecha ? ` (${suf.trim()})` : ""}</label>
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

          <div style={{ marginTop: 12 }}>
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
              {guardando ? "Guardando…" : "Guardar escaneo"}
            </button>
            <button className="btn btn-secondary" disabled={guardando}
              onClick={() => { setEtapa("subir"); setForm(null); setDatos(null); }}>
              Volver
            </button>
          </div>
        </div>
      )}
    </RenacedLayout>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 14, boxSizing: "border-box" };
