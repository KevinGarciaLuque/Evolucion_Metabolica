import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import SemaforoISPAD from "../../components/SemaforoISPAD";
import { clasificarISPAD } from "../../utils/ispad";

const PASOS_ANALISIS = [
  { id: 1, texto: "Subiendo archivo al servidor..." },
  { id: 2, texto: "Leyendo contenido del PDF..." },
  { id: 3, texto: "Extrayendo valores de glucosa..." },
  { id: 4, texto: "Calculando métricas ISPAD..." },
  { id: 5, texto: "Preparando resultados..." },
];
const PASO_MS    = 800;
const VERDE_HOLD = 1000;
const TIEMPO_MIN = PASOS_ANALISIS.length * PASO_MS + VERDE_HOLD;

// Nodos y aristas de la red neuronal decorativa
const N_POS   = [[10,12],[90,10],[50,6],[4,55],[96,48],[18,90],[82,85],[50,96],[33,42],[67,38]];
const N_EDGES = [[0,2],[2,1],[0,3],[1,4],[3,5],[4,6],[5,7],[6,7],[2,8],[8,9],[9,4],[8,3],[9,6]];

// Frases que el modelo "lee" en tiempo real
const SCAN_TOKENS = [
  "glucosa_promedio: 154 mg/dL",
  "tiempo_en_rango: 68.4%  ←  detectado",
  "TAR: 30.1%  ←  calculado",
  "GMI: estimando curva...",
  "CV: 38.2%  ←  validado",
  "GRI: procesando índice...",
  "métricas ISPAD: ✓  listo",
];

function AnalizandoOverlay({ visible }) {
  const [pasoActual, setPasoActual] = useState(0);
  const [tokenIdx,   setTokenIdx]   = useState(0);

  useEffect(() => {
    if (!visible) { setPasoActual(0); setTokenIdx(0); return; }
    setPasoActual(0);
    const intervalos = [
      ...PASOS_ANALISIS.map((_, i) =>
        setTimeout(() => setPasoActual(i), i * PASO_MS)
      ),
      setTimeout(() => setPasoActual(PASOS_ANALISIS.length), PASOS_ANALISIS.length * PASO_MS),
    ];
    const tokenTimer = setInterval(() => setTokenIdx(i => (i + 1) % SCAN_TOKENS.length), 1100);
    return () => { intervalos.forEach(clearTimeout); clearInterval(tokenTimer); };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(4, 6, 18, 0.92)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* ── Red neuronal de fondo ── */}
          <svg
            width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {N_EDGES.map(([a, b], i) => (
              <motion.path
                key={i}
                d={`M${N_POS[a][0]},${N_POS[a][1]} L${N_POS[b][0]},${N_POS[b][1]}`}
                stroke="rgba(99,179,237,0.18)"
                strokeWidth="0.22"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 3 + (i % 3) * 0.6, delay: i * 0.28, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
              />
            ))}
            {N_POS.map(([x, y], i) => (
              <motion.circle
                key={i} cx={x} cy={y} r="0.7"
                fill={i % 2 === 0 ? "rgba(124,58,237,0.55)" : "rgba(96,165,250,0.55)"}
                animate={{ opacity: [0.3, 1, 0.3], r: [0.5, 1.1, 0.5] }}
                transition={{ duration: 2 + (i % 4) * 0.45, delay: i * 0.22, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </svg>

          {/* ── Card principal ── */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 32 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{
              position: "relative",
              background: "linear-gradient(150deg, #06091a 0%, #0e1629 55%, #111b38 100%)",
              border: "1px solid rgba(99,179,237,0.18)",
              borderRadius: 26,
              padding: "40px 48px 36px",
              maxWidth: 460,
              width: "90%",
              boxShadow: "0 40px 110px rgba(0,0,0,0.75), 0 0 0 1px rgba(124,58,237,0.12), 0 0 80px rgba(124,58,237,0.06)",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            {/* Destellos de esquina */}
            <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, background: "radial-gradient(circle, rgba(124,58,237,0.11) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -50, left: -50, width: 180, height: 180, background: "radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />

            {/* Badge "MODELO IA" */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "4px 14px", borderRadius: 20, marginBottom: 26,
                background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(96,165,250,0.13))",
                border: "1px solid rgba(124,58,237,0.32)",
                fontSize: 10, fontWeight: 800, color: "#a78bfa",
                letterSpacing: "1.6px", textTransform: "uppercase",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block", boxShadow: "0 0 8px #7c3aed" }}
              />
              Modelo IA · Neural
            </motion.div>

            {/* ── Ícono: chip de IA con anillos y escáner ── */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ position: "relative", width: 100, height: 100 }}>
                {/* Anillos de pulso */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                  style={{ position: "absolute", inset: -16, borderRadius: "50%", border: "1px solid rgba(124,58,237,0.38)" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.38, 0, 0.38] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                  style={{ position: "absolute", inset: -7, borderRadius: "50%", border: "1px solid rgba(96,165,250,0.28)" }}
                />
                {/* Anillo giratorio con gradiente */}
                <svg width="100" height="100" viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
                  <defs>
                    <linearGradient id="chipRingGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#63b3ed" /><stop offset="0.5" stopColor="#7c3aed" /><stop offset="1" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="44" stroke="rgba(99,179,237,0.09)" strokeWidth="6" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="44"
                    stroke="url(#chipRingGrad)"
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray="276.5" strokeDashoffset="207"
                    fill="none"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "50px 50px" }}
                  />
                </svg>
                {/* Círculo interior con chip SVG */}
                <div style={{
                  position: "absolute", inset: 14, borderRadius: "50%",
                  background: "linear-gradient(145deg, #080d1e 0%, #141c3a 100%)",
                  border: "1px solid rgba(99,179,237,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {/* Línea de escáner */}
                  <motion.div
                    animate={{ top: ["10%", "88%", "10%"] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute", left: "6%", right: "6%", height: 1.5,
                      background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.85), rgba(124,58,237,0.85), transparent)",
                      borderRadius: 2, boxShadow: "0 0 10px rgba(96,165,250,0.65)",
                    }}
                  />
                  {/* Chip SVG */}
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <defs>
                      <linearGradient id="icGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#63b3ed"/><stop offset="1" stopColor="#a78bfa"/>
                      </linearGradient>
                    </defs>
                    <rect x="10" y="10" width="14" height="14" rx="2.5" stroke="url(#icGrad)" strokeWidth="1.3" fill="rgba(99,179,237,0.09)"/>
                    <line x1="10" y1="13.5" x2="6"  y2="13.5" stroke="#63b3ed" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="10" y1="17"   x2="6"  y2="17"   stroke="#63b3ed" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="10" y1="20.5" x2="6"  y2="20.5" stroke="#63b3ed" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="24" y1="13.5" x2="28" y2="13.5" stroke="#63b3ed" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="24" y1="17"   x2="28" y2="17"   stroke="#63b3ed" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="24" y1="20.5" x2="28" y2="20.5" stroke="#63b3ed" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="13.5" y1="10" x2="13.5" y2="6"  stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="17"   y1="10" x2="17"   y2="6"  stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="20.5" y1="10" x2="20.5" y2="6"  stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="13.5" y1="24" x2="13.5" y2="28" stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="17"   y1="24" x2="17"   y2="28" stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round"/>
                    <line x1="20.5" y1="24" x2="20.5" y2="28" stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round"/>
                    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="rgba(124,58,237,0.18)" stroke="url(#icGrad)" strokeWidth="1"/>
                    <circle cx="17" cy="17" r="2.2" fill="url(#icGrad)"/>
                  </svg>
                </div>
              </div>
            </div>

            <motion.h2 style={{ color: "#f1f5f9", fontSize: 21, fontWeight: 700, marginBottom: 5, letterSpacing: "-0.4px" }}>
              Analizando reporte
            </motion.h2>
            <p style={{ color: "#4e6080", fontSize: 12.5, marginBottom: 24 }}>
              Extracción automática de datos Syai X1
            </p>

            {/* ── Terminal de tokens en tiempo real ── */}
            <div style={{
              marginBottom: 26,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(96,165,250,0.12)",
              borderRadius: 10,
              padding: "9px 14px",
              display: "flex", alignItems: "center", gap: 10, minHeight: 38,
            }}>
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.75, repeat: Infinity }}
                style={{ color: "#22c55e", fontSize: 10, fontWeight: 700, flexShrink: 0 }}
              >▶</motion.span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={tokenIdx}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.22 }}
                  style={{ color: "#38bdf8", fontSize: 11.5, fontFamily: "'Courier New', monospace", textAlign: "left" }}
                >
                  {SCAN_TOKENS[tokenIdx]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* ── Pasos ── */}
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
              {PASOS_ANALISIS.map((paso, i) => {
                const completado = i < pasoActual;
                const activo     = i === pasoActual;
                return (
                  <motion.div
                    key={paso.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i <= pasoActual ? 1 : 0.25, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: completado ? "linear-gradient(135deg,#22c55e,#16a34a)"
                                : activo     ? "linear-gradient(135deg,#63b3ed,#7c3aed)"
                                :              "rgba(255,255,255,0.05)",
                      border: (completado || activo) ? "none" : "1px solid rgba(255,255,255,0.07)",
                      boxShadow: activo ? "0 0 14px rgba(124,58,237,0.55)" : completado ? "0 0 8px rgba(34,197,94,0.4)" : "none",
                      transition: "all 0.4s",
                    }}>
                      {completado
                        ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                        : activo
                          ? <motion.div
                              animate={{ scale: [1, 1.4, 1] }}
                              transition={{ duration: 0.7, repeat: Infinity }}
                              style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}
                            />
                          : <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />
                      }
                    </div>
                    <span style={{
                      flex: 1,
                      fontSize: 13,
                      color: completado ? "#86efac" : activo ? "#e2e8f0" : "#2d3f55",
                      fontWeight: activo ? 600 : completado ? 500 : 400,
                      transition: "color 0.3s",
                    }}>
                      {paso.texto}
                    </span>
                    {activo && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.65, repeat: Infinity }}
                        style={{ color: "#63b3ed", fontSize: 11, fontFamily: "monospace", flexShrink: 0 }}
                      >···</motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ── Barra de progreso ── */}
            <div style={{ marginTop: 26, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${Math.min(((pasoActual + 1) / PASOS_ANALISIS.length) * 100, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #63b3ed, #7c3aed, #38bdf8)",
                  borderRadius: 99,
                  boxShadow: "0 0 14px rgba(99,102,241,0.55)",
                }}
              />
            </div>
            <p style={{ marginTop: 8, color: "#2d3f55", fontSize: 10.5, textAlign: "right", fontFamily: "monospace" }}>
              {Math.min(Math.round(((pasoActual + 1) / PASOS_ANALISIS.length) * 100), 100)}% completado
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function SubirPDF() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const pacientePreseleccionado = params.get("paciente");

  const [pacientes, setPacientes]   = useState([]);
  const [pacienteId, setPacienteId] = useState(pacientePreseleccionado || "");
  const [archivo, setArchivo]       = useState(null);
  const [arrastrado, setArrastrado] = useState(false);
  const [datos, setDatos]           = useState(null);
  const [form, setForm]             = useState(null);
  const [etapa, setEtapa]           = useState("subir"); // subir | revisar | guardado
  const [error, setError]           = useState("");
  const [subiendo, setSubiendo]     = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const [filtroPaciente, setFiltroPaciente] = useState("");
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [hoveringZone, setHoveringZone]       = useState(false);
  const inputRef = useRef();
  const busquedaRef = useRef();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get("/pacientes").then((r) => {
      setPacientes(r.data);
      // Si hay paciente preseleccionado desde la URL, buscar y llenar el nombre
      if (pacientePreseleccionado) {
        const encontrado = r.data.find(p => String(p.id) === String(pacientePreseleccionado));
        if (encontrado) setPacienteNombre(encontrado.nombre);
      }
    });
  }, []);

  function onDragOver(e)  { e.preventDefault(); setArrastrado(true); }
  function onDragLeave()  { setArrastrado(false); }
  function onDrop(e) {
    e.preventDefault();
    setArrastrado(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setArchivo(f);
    else setError("Solo se permiten archivos PDF");
  }

  async function subirPDF() {
    if (!pacienteId) return setError("Selecciona un paciente primero");
    if (!archivo)    return setError("Adjunta un archivo PDF");

    setError("");
    setSubiendo(true);
    const fd = new FormData();
    fd.append("pdf", archivo);

    const tiempoMinimo = new Promise((r) => setTimeout(r, TIEMPO_MIN));

    try {
      const [{ data }] = await Promise.all([
        api.post(`/pdf/upload/${pacienteId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
        tiempoMinimo,
      ]);
      setDatos(data);
      const d = data.datos;
      setForm({
        paciente_id:          pacienteId,
        fecha:                (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })(),
        fecha_colocacion:     "",
        fecha_inicio_mcg:     d.fechaInicioMCG ?? "",
        fecha_fin_mcg:        d.fechaFinMCG    ?? "",
        tir:                  d.tir   ?? "",
        tar:                  d.tar   ?? "",
        tar_muy_alto:         d.tarMuyAlto   ?? "",
        tar_alto:             d.tarAlto      ?? "",
        tbr:                  d.tbr   ?? "",
        tbr_bajo:             d.tbrBajo      ?? "",
        tbr_muy_bajo:         d.tbrMuyBajo   ?? "",
        gmi:                  d.gmi   ?? "",
        cv:                   d.cv    ?? "",
        tiempo_activo:        d.tiempoActivo     ?? "",
        glucosa_promedio:     d.glucosaPromedio  ?? "",
        gri:                  d.gri  ?? "",
        eventos_hipoglucemia: d.eventosHipoglucemia ?? "",
        duracion_hipoglucemia: d.duracionHipoglucemia ?? "",
        dosis_insulina_post:  "",
        se_modifico_dosis:    false,
        dosis_modificada:     "",
        hba1c_post_mcg:       "",
        limitacion_internet:  false,
        limitacion_alergias:  false,
        limitacion_economica: false,
        calidad_vida:         "",
        comentarios:          "",
        archivo_pdf:          data.archivo,
      });
      setEtapa("revisar");
    } catch (err) {
      await tiempoMinimo;
      setError(err.response?.data?.error || "Error al procesar el PDF");
    } finally {
      setSubiendo(false);
    }
  }

  function cambiarForm(e) {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function confirmar() {
    setGuardando(true);
    const inicio = form.fecha_inicio_mcg;
    const formFinal = {
      ...form,
      fecha_colocacion: inicio ? (inicio.includes("T") ? inicio.split("T")[0] : inicio.split(" ")[0]) : form.fecha_colocacion,
    };
    try {
      await api.post("/pdf/confirmar", formFinal);
      setEtapa("guardado");
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar análisis");
    } finally {
      setGuardando(false);
    }
  }

  const clasificacion = form
    ? clasificarISPAD(Number(form.tir), Number(form.tar), Number(form.tbr), form.gmi ? Number(form.gmi) : null)
    : null;

  // ── Paso final ───────────────────────────────────────────────────────────────
  if (etapa === "guardado") {
    return (
      <Layout>
        <div className="exito-container">
          {/* Fondo de partículas decorativas */}
          <div className="exito-bg">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="exito-orb"
                style={{
                  left: `${[10,25,55,70,85,40][i]}%`,
                  top: `${[20,70,15,65,30,80][i]}%`,
                  width: [120,80,160,100,140,90][i],
                  height: [120,80,160,100,140,90][i],
                  background: i % 2 === 0
                    ? "radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
              />
            ))}
          </div>

          <motion.div
            className="exito-card"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            {/* Ícono animado */}
            <div className="exito-icon-wrap">
              <motion.div
                className="exito-ring exito-ring-1"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="exito-ring exito-ring-2"
                animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
              />
              <motion.div
                className="exito-check-circle"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <motion.path
                    d="M8 18l7 7 13-13"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            </div>

            {/* Texto */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h2 className="exito-titulo">¡Análisis guardado exitosamente!</h2>
              <p className="exito-subtitulo">
                Los datos del reporte Syai X1 han sido registrados<br />en el historial de <strong>{pacienteNombre}</strong>
              </p>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              style={{ height: 1, background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)", margin: "8px 0 24px" }}
            />

            {/* Botones */}
            <motion.div
              className="exito-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 28px rgba(124,58,237,0.5)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/pacientes/${pacienteId}`)}
                className="exito-btn-primary"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="5.5" r="2.5" stroke="#fff" strokeWidth="1.5"/>
                  <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Ver paciente
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setEtapa("subir"); setArchivo(null); setForm(null); setPacienteId(pacientePreseleccionado || ""); setPacienteNombre(""); }}
                className="exito-btn-outline"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M8 2v7M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10v3h10v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Subir otro PDF
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/dashboard")}
                className="exito-btn-ghost"
              >
                Dashboard
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AnalizandoOverlay visible={subiendo} />
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            to={pacientePreseleccionado ? `/pacientes/${pacientePreseleccionado}` : "/pacientes"}
            className="back-btn"
            title="Volver"
          >
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ margin: 0 }}>
                Analizar Reporte PDF{" "}
                <span style={{ background: "linear-gradient(90deg,#3b82f6,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  · Syai X1
                </span>
              </h1>
              <motion.div
                animate={{ boxShadow: ["0 0 0px rgba(124,58,237,0)", "0 0 14px rgba(124,58,237,0.5)", "0 0 0px rgba(124,58,237,0)"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 11px", borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(96,165,250,0.1))",
                  border: "1px solid rgba(124,58,237,0.3)",
                  fontSize: 10, fontWeight: 800, color: "#7c3aed",
                  letterSpacing: "0.8px", flexShrink: 0,
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M4 0l.9 2.1L7 3 5.1 4 4 7l-.9-2.1L1 4l1.9-1L4 0z" fill="#7c3aed"/>
                </svg>
                IA
              </motion.div>
            </div>
            <p className="page-subtitle">
              Extrae automáticamente TIR · TAR · GMI · CV · GRI desde el reporte PDF del monitor Syai X1
            </p>
          </div>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {etapa === "subir" && (
        <div className="upload-container">
          <div className="ai-card-wrapper">
            <div className="ai-spin-border" />
            <div className="card">

            {/* ── Banner IA ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 20, paddingBottom: 16,
              borderBottom: "5px solid #f0f4ff",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 9px 14px rgba(124,58,237,0.38)",
                flexShrink: 0,
              }}>
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <path d="M8.5 1.5l1.6 3.8L14 7l-3.9 1.7L8.5 14l-1.6-5.3L3 7l3.9-1.7z"
                    stroke="#fff" strokeWidth="1.35" strokeLinejoin="round" fill="rgba(255,255,255,0.28)" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
                  Análisis con Inteligencia Artificial
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.3 }}>
                  Modelo entrenado en reportes Syai X1
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }}
                />
                <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Sistema activo</span>
              </div>
            </div>

            {/* ── Métricas que extrae la IA ── */}
            <div style={{ marginBottom: 22 }}>
              <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                Extrae automáticamente
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  { label: "TIR",           color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                  { label: "TAR",           color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                  { label: "TBR",           color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                  { label: "GMI",           color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
                  { label: "CV",            color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                  { label: "GRI",           color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
                  { label: "Glucosa Prom.", color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
                ].map(c => (
                  <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Paso 1: Paciente ── */}
            <div className="step-row">
              <div className={`step-badge ${pacienteId ? "step-done" : "step-active"}`}>
                {pacienteId
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span>1</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p className="step-label">
                  Seleccionar paciente
                  {pacienteId && (
                    <>
                      <span className="step-check-pill">✓ {pacienteNombre}</span>
                      <button
                        onClick={() => { setPacienteId(""); setPacienteNombre(""); setFiltroPaciente(""); setArchivo(null); }}
                        style={{
                          background: "none", border: "1px solid #e2e8f0", borderRadius: 8,
                          padding: "2px 10px", fontSize: 12, color: "#94a3b8",
                          cursor: "pointer", fontWeight: 500, lineHeight: 1.5,
                          transition: "border-color 0.2s, color 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#94a3b8"; }}
                      >
                        Limpiar
                      </button>
                    </>
                  )}
                </p>
                <div className="form-group" style={{ position: "relative", marginBottom: 0 }}>
                  <div style={{ position: "relative" }}>
                    <svg
                      width="15" height="15" viewBox="0 0 15 15" fill="none"
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 2 }}
                    >
                      {pacienteId
                        ? <path d="M2.5 7l3 3 7-7" stroke="#22c55e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        : <><circle cx="6.5" cy="6.5" r="4" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l2.5 2.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></>
                      }
                    </svg>
                    <input
                      ref={busquedaRef}
                      type="text"
                      placeholder="Buscar por nombre o DNI..."
                      value={pacienteNombre || filtroPaciente}
                      autoComplete="off"
                      onChange={(e) => {
                        setFiltroPaciente(e.target.value);
                        setPacienteNombre("");
                        setPacienteId("");
                        setDropdownAbierto(true);
                      }}
                      onFocus={() => setDropdownAbierto(true)}
                      onBlur={() => setTimeout(() => setDropdownAbierto(false), 180)}
                      style={{
                        paddingLeft: 36,
                        borderColor: pacienteId ? "#22c55e" : undefined,
                        background: pacienteId ? "#f0fdf4" : undefined,
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {dropdownAbierto && filtroPaciente && !pacienteId && (() => {
                      const resultados = pacientes.filter((p) => {
                        const q = filtroPaciente.toLowerCase();
                        return (
                          p.nombre.toLowerCase().includes(q) ||
                          (p.dni && String(p.dni).toLowerCase().includes(q))
                        );
                      });
                      return (
                        <motion.ul
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            position: "absolute", top: "100%", left: 0, right: 0,
                            zIndex: 999, margin: 0, padding: 0, listStyle: "none",
                            background: "#fff", border: "1px solid #e2e8f0",
                            borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            maxHeight: 220, overflowY: "auto",
                          }}
                        >
                          {resultados.length === 0 ? (
                            <li style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 13 }}>Sin resultados</li>
                          ) : resultados.map((p) => (
                            <li
                              key={p.id}
                              onMouseDown={() => {
                                setPacienteId(p.id);
                                setPacienteNombre(p.nombre);
                                setFiltroPaciente("");
                                setDropdownAbierto(false);
                              }}
                              style={{
                                padding: "10px 14px", cursor: "pointer",
                                borderBottom: "1px solid #f1f5f9",
                                fontSize: 14,
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f0f9ff"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                            >
                              <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                              {p.dni && <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>DNI: {p.dni}</span>}
                              <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8 }}>{p.edad} años</span>
                            </li>
                          ))}
                        </motion.ul>
                      );
                    })()}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Conector */}
            <div className="step-connector">
              <div className={`step-connector-line ${pacienteId ? "step-connector-done" : ""}`} />
            </div>

            {/* ── Paso 2: PDF ── */}
            <div className="step-row">
              <div className={`step-badge ${archivo ? "step-done" : pacienteId ? "step-active" : "step-locked"}`}>
                {archivo
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <span>2</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p className={`step-label ${!pacienteId ? "step-label-locked" : ""}`}>
                  Cargar PDF del monitor
                </p>

                <AnimatePresence>
                  {pacienteId && (
                    <motion.div
                      key="drop-step"
                      initial={{ opacity: 0, y: -12, scaleY: 0.95 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      style={{ transformOrigin: "top" }}
                    >
                      <div
                        className={`drop-zone ${arrastrado ? "arrastrado" : ""} ${archivo ? "con-archivo" : ""} ${hoveringZone && !archivo ? "hovering-ai" : ""}`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => inputRef.current.click()}
                        onMouseEnter={() => !archivo && setHoveringZone(true)}
                        onMouseLeave={() => setHoveringZone(false)}
                      >
                        <input
                          ref={inputRef} type="file" accept="application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) => { if (e.target.files[0]) setArchivo(e.target.files[0]); }}
                        />
                        {archivo ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 24 }}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", position: "relative" }}
                          >
                            {/* Grid de puntos */}
                            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} viewBox="0 0 300 170" preserveAspectRatio="none">
                              {Array.from({ length: 9 }, (_, xi) =>
                                Array.from({ length: 6 }, (_, yi) => (
                                  <circle key={`${xi}-${yi}`} cx={xi * 35 + 17} cy={yi * 28 + 14} r="0.75" fill="rgba(34,197,94,0.2)" />
                                ))
                              ).flat()}
                            </svg>

                            {/* Línea de escaneo verde */}
                            <motion.div
                              animate={{ top: ["8%", "92%", "8%"] }}
                              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
                              style={{
                                position: "absolute", left: "5%", right: "5%", height: 1.5,
                                background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.8), rgba(74,222,128,0.9), transparent)",
                                borderRadius: 2, boxShadow: "0 0 12px rgba(34,197,94,0.5)",
                                pointerEvents: "none", zIndex: 1,
                              }}
                            />

                            {/* Partículas verdes */}
                            {[[7,18],[88,12],[10,78],[90,72],[48,7],[22,90],[75,85],[60,4]].map(([x,y], i) => (
                              <motion.div
                                key={i}
                                animate={{ opacity: [0.1, 0.7, 0.1], scale: [0.7, 1.5, 0.7] }}
                                transition={{ duration: 1.6 + i * 0.4, delay: i * 0.28, repeat: Infinity, ease: "easeInOut" }}
                                style={{
                                  position: "absolute", left: `${x}%`, top: `${y}%`,
                                  width: i < 4 ? 2.5 : 1.5, height: i < 4 ? 2.5 : 1.5,
                                  borderRadius: "50%",
                                  background: i % 2 === 0 ? "#4ade80" : "#86efac",
                                  pointerEvents: "none", zIndex: 1,
                                }}
                              />
                            ))}

                            {/* Corchetes verdes */}
                            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                              <motion.path d="M6 18 L6 6 L18 6" stroke="rgba(74,222,128,0.55)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.path d="M82 6 L94 6 L94 18" stroke="rgba(74,222,128,0.55)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
                              <motion.path d="M6 82 L6 94 L18 94" stroke="rgba(74,222,128,0.55)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.0 }} />
                              <motion.path d="M82 94 L94 94 L94 82" stroke="rgba(74,222,128,0.55)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
                            </svg>

                            {/* Ícono PDF con anillo orbital verde */}
                            <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center" }}>
                              <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                                <defs>
                                  <linearGradient id="pdfRingGrad" x1="0" y1="0" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#4ade80"/><stop offset="0.5" stopColor="#22c55e"/><stop offset="1" stopColor="#86efac"/>
                                  </linearGradient>
                                </defs>
                                <circle cx="45" cy="45" r="38" stroke="rgba(34,197,94,0.08)" strokeWidth="1.2" fill="none" strokeDasharray="3 5"/>
                                <motion.circle
                                  cx="45" cy="45" r="38"
                                  stroke="url(#pdfRingGrad)"
                                  strokeWidth="2" strokeLinecap="round"
                                  strokeDasharray="238.8" strokeDashoffset="185"
                                  fill="none"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                  style={{ transformOrigin: "45px 45px" }}
                                />
                              </svg>
                              <div style={{ position: "relative" }}>
                                <motion.div
                                  animate={{ boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 22px rgba(34,197,94,0.45)", "0 0 0px rgba(34,197,94,0)"] }}
                                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                  style={{ width: 58, height: 58, borderRadius: 15, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
                                    <path d="M5 4a2 2 0 0 1 2-2h7.5L20 7.5V22a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z" fill="#ef4444" opacity="0.18" stroke="rgba(239,68,68,0.7)" strokeWidth="1.3"/>
                                    <path d="M14.5 2v5.5H20" stroke="rgba(239,68,68,0.7)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                    <text x="7.5" y="18.5" fontSize="5.5" fill="#f87171" fontWeight="800" fontFamily="sans-serif">PDF</text>
                                  </svg>
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.2 }}
                                  style={{ position: "absolute", bottom: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(34,197,94,0.5)" }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2.2 2.2 3.8-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              </div>
                            </div>

                            {/* Nombre y tamaño */}
                            <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: "#f1f5f9", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{archivo.name}</p>
                              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                                {archivo.size < 1048576 ? (archivo.size / 1024).toFixed(1) + " KB" : (archivo.size / 1048576).toFixed(1) + " MB"} · PDF
                              </p>
                            </div>

                            {/* Badge + hint */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative", zIndex: 2 }}>
                              <motion.span
                                animate={{ boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 14px rgba(34,197,94,0.35)", "0 0 0px rgba(34,197,94,0)"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.32)" }}
                              >
                                <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                                Listo para analizar
                              </motion.span>
                              <p style={{ margin: 0, fontSize: 11, color: "#334155" }}>Clic para cambiar archivo</p>
                            </div>
                          </motion.div>
                        ) : (
                          <>
                            {/* Grid de puntos */}
                            <svg
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
                              viewBox="0 0 300 170" preserveAspectRatio="none"
                            >
                              {Array.from({ length: 9 }, (_, xi) =>
                                Array.from({ length: 6 }, (_, yi) => (
                                  <circle key={`${xi}-${yi}`} cx={xi * 35 + 17} cy={yi * 28 + 14} r="0.75" fill="rgba(99,179,237,0.38)" />
                                ))
                              ).flat()}
                            </svg>

                            {/* Línea de escaneo permanente */}
                            <motion.div
                              animate={{ top: ["10%", "90%", "10%"] }}
                              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
                              style={{
                                position: "absolute", left: "6%", right: "6%", height: 1.5,
                                background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.75), rgba(124,58,237,0.75), transparent)",
                                borderRadius: 2, boxShadow: "0 0 10px rgba(96,165,250,0.5)",
                                pointerEvents: "none", zIndex: 1,
                              }}
                            />

                            {/* Partículas */}
                            {[[7,18],[88,12],[10,78],[90,72],[48,7],[22,90],[75,85],[60,4]].map(([x,y], i) => (
                              <motion.div
                                key={i}
                                animate={{ opacity: [0.15, 0.85, 0.15], scale: [0.7, 1.4, 0.7] }}
                                transition={{ duration: 1.6 + i * 0.4, delay: i * 0.28, repeat: Infinity, ease: "easeInOut" }}
                                style={{
                                  position: "absolute", left: `${x}%`, top: `${y}%`,
                                  width: i < 4 ? 2.5 : 1.5, height: i < 4 ? 2.5 : 1.5,
                                  borderRadius: "50%",
                                  background: i % 2 === 0 ? "#60a5fa" : "#a78bfa",
                                  pointerEvents: "none", zIndex: 1,
                                }}
                              />
                            ))}

                            {/* Corchetes de targeting en las 4 esquinas */}
                            <svg
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
                              viewBox="0 0 100 100" preserveAspectRatio="none"
                            >
                              <motion.path d="M6 18 L6 6 L18 6" stroke="rgba(99,179,237,0.5)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.path d="M82 6 L94 6 L94 18" stroke="rgba(99,179,237,0.5)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />
                              <motion.path d="M6 82 L6 94 L18 94" stroke="rgba(99,179,237,0.5)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} />
                              <motion.path d="M82 94 L94 94 L94 82" stroke="rgba(99,179,237,0.5)" strokeWidth="0.9" fill="none" strokeLinecap="round" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }} />
                            </svg>

                            {/* Ícono central con anillo orbital */}
                            <div style={{ position: "relative", zIndex: 2, display: "inline-flex", justifyContent: "center", marginBottom: 18 }}>
                              <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)" }}>
                                <defs>
                                  <linearGradient id="dzRingGrad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#60a5fa"/><stop offset="0.5" stopColor="#7c3aed"/><stop offset="1" stopColor="#38bdf8"/>
                                  </linearGradient>
                                </defs>
                                <circle cx="44" cy="44" r="38" stroke="rgba(99,179,237,0.09)" strokeWidth="1.2" fill="none" strokeDasharray="3 5"/>
                                <motion.circle
                                  cx="44" cy="44" r="38"
                                  stroke="url(#dzRingGrad)"
                                  strokeWidth="1.5" strokeLinecap="round"
                                  strokeDasharray="238.8" strokeDashoffset="200"
                                  fill="none"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                  style={{ transformOrigin: "44px 44px" }}
                                />
                              </svg>
                              <motion.span
                                className="drop-icon"
                                animate={{
                                  y: [0, -7, 0],
                                  filter: [
                                    "drop-shadow(0 0 0px #60a5fa)",
                                    "drop-shadow(0 0 18px #7c3aed) drop-shadow(0 0 30px #60a5fa)",
                                    "drop-shadow(0 0 0px #60a5fa)",
                                  ],
                                }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                style={{ display: "inline-block", position: "relative", zIndex: 1 }}
                              >
                                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                                  <defs>
                                    <linearGradient id="uploadGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                                      <stop stopColor="#60a5fa" /><stop offset="1" stopColor="#7c3aed" />
                                    </linearGradient>
                                    <linearGradient id="uploadGrad2" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                                      <stop stopColor="#93c5fd" /><stop offset="1" stopColor="#a78bfa" />
                                    </linearGradient>
                                  </defs>
                                  <rect width="56" height="56" rx="14" fill="url(#uploadGrad)" opacity="0.15" />
                                  <path
                                    d="M38.5 34c2.485 0 4.5-2.015 4.5-4.5 0-2.3-1.73-4.2-3.977-4.462A7.5 7.5 0 0 0 21.5 26.5c0 .17.007.338.02.505A5.5 5.5 0 0 0 17.5 32.5 5.5 5.5 0 0 0 23 38h15.5"
                                    stroke="url(#uploadGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
                                  />
                                  <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                                    <path d="M28 44V32" stroke="url(#uploadGrad2)" strokeWidth="2.2" strokeLinecap="round" />
                                    <path d="M23 37l5-5 5 5" stroke="url(#uploadGrad2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                  </motion.g>
                                </svg>
                              </motion.span>
                            </div>

                            {/* Badge + texto */}
                            <div style={{ position: "relative", zIndex: 2 }}>
                              <motion.div
                                animate={{ opacity: [0.6, 1, 0.6] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 6,
                                  padding: "3px 11px", borderRadius: 20, marginBottom: 10,
                                  background: "rgba(96,165,250,0.09)",
                                  border: "1px solid rgba(96,165,250,0.22)",
                                  fontSize: 10, color: "#63b3ed", fontWeight: 700, letterSpacing: "0.8px",
                                }}
                              >
                                <motion.span
                                  animate={{ opacity: [1, 0.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  style={{ width: 5, height: 5, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }}
                                />
                                LISTO PARA ESCANEAR
                              </motion.div>
                              <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, margin: "0 0 5px" }}>
                                Arrastra el PDF aquí o haz clic
                              </p>
                              <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>
                                Reporte generado por el monitor Syai X1 · Max 20 MB
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!pacienteId && (
                  <div className="drop-zone-locked">
                    {[[8,20],[85,14],[12,76],[88,70],[48,7],[22,90]].map(([x,y], i) => (
                      <motion.div key={i} animate={{ opacity: [0.1, 0.55, 0.1] }} transition={{ duration: 1.8 + i * 0.4, delay: i * 0.3, repeat: Infinity }} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 1.5, height: 1.5, borderRadius: "50%", background: i % 2 === 0 ? "#60a5fa" : "#a78bfa", pointerEvents: "none" }} />
                    ))}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.18)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 9.5v-2a3 3 0 0 1 6 0v2" stroke="rgba(99,179,237,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                        <rect x="5" y="9.5" width="10" height="7" rx="2" fill="rgba(99,179,237,0.07)" stroke="rgba(99,179,237,0.25)" strokeWidth="1.2"/>
                        <circle cx="10" cy="13" r="1" fill="rgba(99,179,237,0.5)"/>
                      </svg>
                    </div>
                    <p style={{ color: "rgba(99,179,237,0.65)", fontSize: 13, margin: "10px 0 3px", fontWeight: 600, position: "relative", zIndex: 1 }}>Selecciona primero un paciente</p>
                    <p style={{ color: "rgba(99,179,237,0.3)", fontSize: 11, margin: 0, position: "relative", zIndex: 1 }}>Completa el paso 1 para continuar</p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 8 }}>
              {archivo && (
                <button
                  className="btn btn-outline"
                  onClick={() => setArchivo(null)}
                >
                  Cancelar
                </button>
              )}
              <motion.button
                onClick={subirPDF}
                disabled={subiendo || !archivo || !pacienteId}
                whileHover={!subiendo && archivo && pacienteId ? { scale: 1.03, boxShadow: "0 0 28px rgba(124,58,237,0.55), 0 0 60px rgba(96,165,250,0.25)" } : {}}
                whileTap={!subiendo && archivo && pacienteId ? { scale: 0.97 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 28px",
                  borderRadius: 12,
                  border: "none",
                  cursor: subiendo || !archivo || !pacienteId ? "not-allowed" : "pointer",
                  background: subiendo || !archivo || !pacienteId
                    ? "linear-gradient(135deg, #94a3b8, #64748b)"
                    : "linear-gradient(135deg, #3b82f6 0%, #7c3aed 60%, #6d28d9 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: "0.2px",
                  boxShadow: subiendo || !archivo || !pacienteId
                    ? "none"
                    : "0 4px 20px rgba(124,58,237,0.35)",
                  transition: "background 0.3s, box-shadow 0.3s",
                }}
              >
                {/* Shimmer sweep */}
                {!subiendo && archivo && pacienteId && (
                  <motion.span
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    style={{
                      position: "absolute",
                      top: 0, left: 0,
                      width: "50%", height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                      transform: "skewX(-15deg)",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Ícono */}
                {subiendo ? (
                  <motion.svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </motion.svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1l1.5 3.5L13 6l-2.5 2.5.6 3.5L8 10.5 4.9 12l.6-3.5L3 6l3.5-1.5L8 1z"
                      stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(255,255,255,0.25)" />
                  </svg>
                )}

                <span>{subiendo ? "Analizando..." : "Analizar PDF con IA"}</span>
              </motion.button>
            </div>
          </div>
          </div>
        </div>
      )}

      {etapa === "revisar" && form && (
        <div>
          {/* Botón de regreso en la parte superior */}
          <button
            className="btn btn-outline"
            onClick={() => { setEtapa("subir"); setArchivo(null); setForm(null); setPacienteNombre(""); setPacienteId(pacientePreseleccionado || ""); }}
            style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Volver y subir otro PDF
          </button>

          <div className="revisar-header">
            <div className="card" style={{ flex: 1 }}>
              <h3>📊 Datos Extraídos Automáticamente</h3>
              <p className="text-muted">Revisa y corrige si es necesario antes de guardar</p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha análisis *</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={cambiarForm} required />
                </div>
                <div className="form-group">
                  <label>Inicio MCG</label>
                  <input type="datetime-local" name="fecha_inicio_mcg" value={form.fecha_inicio_mcg ? form.fecha_inicio_mcg.replace(" ", "T").slice(0, 16) : ""} onChange={cambiarForm} />
                </div>
                <div className="form-group">
                  <label>Fin MCG</label>
                  <input type="datetime-local" name="fecha_fin_mcg" value={form.fecha_fin_mcg ? form.fecha_fin_mcg.replace(" ", "T").slice(0, 16) : ""} onChange={cambiarForm} />
                </div>
                <div className="form-group">
                  <label>TIR – Tiempo en Rango (%)</label>
                  <input type="number" step="0.1" name="tir" value={form.tir} onChange={cambiarForm} min={0} max={100} placeholder="68.6" />
                </div>
                <div className="form-group">
                  <label>TAR Muy alto &gt;250 (%)</label>
                  <input type="number" step="0.1" name="tar_muy_alto" value={form.tar_muy_alto} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TAR Alto 181-250 (%)</label>
                  <input type="number" step="0.1" name="tar_alto" value={form.tar_alto} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TAR Total (%)</label>
                  <input type="number" step="0.1" name="tar" value={form.tar} onChange={cambiarForm} min={0} max={100} placeholder="30.4" />
                </div>
                <div className="form-group">
                  <label>TBR Bajo 54-59 (%)</label>
                  <input type="number" step="0.1" name="tbr_bajo" value={form.tbr_bajo} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TBR Muy bajo &lt;54 (%)</label>
                  <input type="number" step="0.1" name="tbr_muy_bajo" value={form.tbr_muy_bajo} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TBR Total (%)</label>
                  <input type="number" step="0.1" name="tbr" value={form.tbr} onChange={cambiarForm} min={0} max={100} placeholder="1.0" />
                </div>
                <div className="form-group">
                  <label>GMI (%)</label>
                  <input type="number" step="0.01" name="gmi" value={form.gmi} onChange={cambiarForm} placeholder="7.0" />
                </div>
                <div className="form-group">
                  <label>CV – Coeficiente de Variación (%)</label>
                  <input type="number" step="0.1" name="cv" value={form.cv} onChange={cambiarForm} placeholder="39" />
                </div>
                <div className="form-group">
                  <label>Tiempo Activo (%)</label>
                  <input type="number" step="0.1" name="tiempo_activo" value={form.tiempo_activo} onChange={cambiarForm} placeholder="93.5" />
                </div>
                <div className="form-group">
                  <label>Glucosa Promedio (mg/dL)</label>
                  <input type="number" step="0.1" name="glucosa_promedio" value={form.glucosa_promedio} onChange={cambiarForm} placeholder="154" />
                </div>
                <div className="form-group">
                  <label>GRI – Índice de Riesgo</label>
                  <input type="number" step="0.1" name="gri" value={form.gri} onChange={cambiarForm} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Eventos hipoglucemia</label>
                  <input type="number" name="eventos_hipoglucemia" value={form.eventos_hipoglucemia} onChange={cambiarForm} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Duración hipoglucemia (min)</label>
                  <input type="number" name="duracion_hipoglucemia" value={form.duracion_hipoglucemia} onChange={cambiarForm} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Dosis de insulina (durante MCG)</label>
                  <input name="dosis_insulina_post" value={form.dosis_insulina_post} onChange={cambiarForm} placeholder="Ej: Lantus 16ui / Lispro 10-10-11" />
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Seguimiento post-MCG</h4>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label
                    htmlFor="se_modifico_dosis_subir"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
                  >
                    <span>¿Se modificó la dosis?</span>
                    <span style={{ position: "relative", display: "inline-block", width: 44, height: 24, flexShrink: 0 }}>
                      <input
                        id="se_modifico_dosis_subir"
                        type="checkbox"
                        name="se_modifico_dosis"
                        checked={!!form.se_modifico_dosis}
                        onChange={cambiarForm}
                        style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                      />
                      <span style={{
                        position: "absolute", inset: 0, borderRadius: 24,
                        background: form.se_modifico_dosis ? "#6366f1" : "#cbd5e1",
                        transition: "background 0.2s",
                      }} />
                      <span style={{
                        position: "absolute", top: 3,
                        left: form.se_modifico_dosis ? 23 : 3,
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </span>
                  </label>
                </div>
                {form.se_modifico_dosis && (
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label>Dosis modificada</label>
                    <input
                      name="dosis_modificada"
                      value={form.dosis_modificada}
                      onChange={cambiarForm}
                      placeholder="Nueva dosis indicada"
                      autoFocus
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>HbA1c post MCG (%)</label>
                  <input type="number" step="0.1" name="hba1c_post_mcg" value={form.hba1c_post_mcg} onChange={cambiarForm} placeholder="7.5" />
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Limitaciones para uso de MCG</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label><input type="checkbox" name="limitacion_internet" checked={!!form.limitacion_internet} onChange={cambiarForm} style={{ width: "auto", marginRight: 6 }} />Internet</label>
                </div>
                <div className="form-group">
                  <label><input type="checkbox" name="limitacion_alergias" checked={!!form.limitacion_alergias} onChange={cambiarForm} style={{ width: "auto", marginRight: 6 }} />Alergias</label>
                </div>
                <div className="form-group">
                  <label><input type="checkbox" name="limitacion_economica" checked={!!form.limitacion_economica} onChange={cambiarForm} style={{ width: "auto", marginRight: 6 }} />Económicas</label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={!form.limitacion_internet && !form.limitacion_alergias && !form.limitacion_economica}
                      onChange={e => { if (e.target.checked) setForm(f => ({ ...f, limitacion_internet: false, limitacion_alergias: false, limitacion_economica: false })); }}
                      style={{ width: "auto", marginRight: 6 }}
                    />Ninguna
                  </label>
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Calidad de vida (valoración del MCG)</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Valoración</label>
                  <select name="calidad_vida" value={form.calidad_vida} onChange={cambiarForm}>
                    <option value="">-- Sin registrar --</option>
                    <option value="Buena">Buena</option>
                    <option value="Mala">Mala</option>
                    <option value="Igual">Igual</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Comentarios</label>
                  <textarea name="comentarios" value={form.comentarios} onChange={cambiarForm} rows={3} placeholder="Observaciones adicionales..." style={{ width: "100%", resize: "vertical" }} />
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-outline" onClick={() => setEtapa("subir")}>← Subir otro PDF</button>
                <button className="btn btn-primary" onClick={confirmar} disabled={guardando}>
                  {guardando ? "Guardando..." : "✔ Confirmar y Guardar"}
                </button>
              </div>
            </div>

            {/* Semáforo en tiempo real */}
            <div className="card revisar-semaforo">
              <h3>Clasificación ISPAD en tiempo real</h3>
              <SemaforoISPAD
                tir={Number(form.tir) || 0}
                tar={Number(form.tar) || 0}
                tbr={Number(form.tbr) || 0}
                gmi={form.gmi ? Number(form.gmi) : null}
                clasificacion={clasificacion}
                tarMuyAlto={form.tar_muy_alto !== "" ? Number(form.tar_muy_alto) : null}
                tarAlto={form.tar_alto !== "" ? Number(form.tar_alto) : null}
                tbrBajo={form.tbr_bajo !== "" ? Number(form.tbr_bajo) : null}
                tbrMuyBajo={form.tbr_muy_bajo !== "" ? Number(form.tbr_muy_bajo) : null}
                tiempoActivo={form.tiempo_activo !== "" ? form.tiempo_activo : null}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
