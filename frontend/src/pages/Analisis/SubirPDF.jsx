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
const PASO_MS    = 500; // ms entre cada paso
const VERDE_HOLD = 1000; // ms mostrando todos en verde antes de cerrar
const TIEMPO_MIN = PASOS_ANALISIS.length * PASO_MS + VERDE_HOLD; // total garantizado

function AnalizandoOverlay({ visible }) {
  const [pasoActual, setPasoActual] = useState(0);

  useEffect(() => {
    if (!visible) { setPasoActual(0); return; }
    setPasoActual(0);
    const intervalos = [
      // Avanzar cada paso
      ...PASOS_ANALISIS.map((_, i) =>
        setTimeout(() => setPasoActual(i), i * PASO_MS)
      ),
      // Poner todos en verde (pasoActual > último índice)
      setTimeout(() => setPasoActual(PASOS_ANALISIS.length), PASOS_ANALISIS.length * PASO_MS),
    ];
    return () => intervalos.forEach(clearTimeout);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10, 15, 30, 0.82)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              border: "1px solid rgba(99,179,237,0.25)",
              borderRadius: 20,
              padding: "44px 52px",
              maxWidth: 440,
              width: "90%",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,179,237,0.1)",
              textAlign: "center",
            }}
          >
            {/* Spinner SVG animado */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
                <circle cx="34" cy="34" r="28" stroke="rgba(99,179,237,0.15)" strokeWidth="5" />
                <motion.circle
                  cx="34" cy="34" r="28"
                  stroke="url(#grad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="175.93"
                  strokeDashoffset="132"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "34px 34px" }}
                />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="68" y2="68" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#63b3ed" />
                    <stop offset="1" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                {/* Ícono PDF al centro */}
                <text x="34" y="39" textAnchor="middle" fontSize="16" fill="#63b3ed" fontWeight="bold">PDF</text>
              </svg>
            </div>

            <motion.h2
              style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.3px" }}
            >
              Analizando reporte
            </motion.h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 32 }}>
              Extracción automática de datos Syai X1
            </p>

            {/* Pasos */}
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
              {PASOS_ANALISIS.map((paso, i) => {
                const completado = i < pasoActual;
                const activo     = i === pasoActual;
                return (
                  <motion.div
                    key={paso.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i <= pasoActual ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: completado ? "linear-gradient(135deg,#22c55e,#16a34a)"
                                : activo     ? "linear-gradient(135deg,#63b3ed,#7c3aed)"
                                :              "rgba(255,255,255,0.07)",
                      border: activo ? "none" : "1px solid rgba(255,255,255,0.1)",
                      transition: "background 0.4s",
                    }}>
                      {completado
                        ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                        : activo
                          ? <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                              style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}
                            />
                          : <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                      }
                    </div>
                    <span style={{
                      fontSize: 13,
                      color: completado ? "#86efac" : activo ? "#e2e8f0" : "#475569",
                      fontWeight: activo ? 600 : 400,
                      transition: "color 0.3s",
                    }}>
                      {paso.texto}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Barra de progreso */}
            <div style={{ marginTop: 28, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${((pasoActual + 1) / PASOS_ANALISIS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ height: "100%", background: "linear-gradient(90deg,#63b3ed,#7c3aed)", borderRadius: 99 }}
              />
            </div>
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
        fecha:                new Date().toISOString().split("T")[0],
        fecha_colocacion:     "",
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
    try {
      await api.post("/pdf/confirmar", form);
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
            <h1 style={{ margin: 0 }}>Subir Reporte PDF · Syai X1</h1>
            <p className="page-subtitle">Carga el PDF generado por el monitor Syai X1 para extracción automática de datos</p>
          </div>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {etapa === "subir" && (
        <div className="upload-container">
          <div className="ai-card-wrapper">
            <div className="ai-spin-border" />
            <div className="card">

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
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <rect width="48" height="48" rx="12" fill="#dcfce7" />
                                <path d="M14 24l7 7 13-13" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.div>
                            <p className="drop-filename" style={{ marginTop: 10 }}>{archivo.name}</p>
                            <p className="drop-hint">Clic para cambiar</p>
                          </>
                        ) : (
                          <>
                            <AnimatePresence>
                              {hoveringZone && (
                                <motion.div
                                  key="scan-overlay"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  style={{
                                    position: "absolute", inset: 0,
                                    borderRadius: "inherit",
                                    overflow: "hidden",
                                    pointerEvents: "none",
                                    zIndex: 0,
                                  }}
                                >
                                  <motion.div
                                    animate={{ y: ["-10%", "110%"] }}
                                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
                                    style={{
                                      position: "absolute",
                                      left: 0, right: 0,
                                      height: "28%",
                                      background: "linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.07) 30%, rgba(124,58,237,0.14) 50%, rgba(96,165,250,0.07) 70%, transparent 100%)",
                                    }}
                                  />
                                  <motion.div
                                    animate={{ opacity: [0, 0.6, 0] }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.1 }}
                                    style={{
                                      position: "absolute", inset: 0,
                                      background: "radial-gradient(ellipse at 20% 50%, rgba(96,165,250,0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.1) 0%, transparent 60%)",
                                    }}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <motion.span
                              className="drop-icon"
                              animate={{
                                y: [0, -8, 0],
                                filter: [
                                  "drop-shadow(0 0 0px #60a5fa)",
                                  "drop-shadow(0 0 18px #7c3aed) drop-shadow(0 0 32px #60a5fa)",
                                  "drop-shadow(0 0 0px #60a5fa)",
                                ],
                              }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                              style={{ display: "inline-block", position: "relative", zIndex: 1 }}
                            >
                              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#60a5fa" />
                                    <stop offset="1" stopColor="#7c3aed" />
                                  </linearGradient>
                                  <linearGradient id="uploadGrad2" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#93c5fd" />
                                    <stop offset="1" stopColor="#a78bfa" />
                                  </linearGradient>
                                </defs>
                                <rect width="56" height="56" rx="14" fill="url(#uploadGrad)" opacity="0.15" />
                                <path
                                  d="M38.5 34c2.485 0 4.5-2.015 4.5-4.5 0-2.3-1.73-4.2-3.977-4.462A7.5 7.5 0 0 0 21.5 26.5c0 .17.007.338.02.505A5.5 5.5 0 0 0 17.5 32.5 5.5 5.5 0 0 0 23 38h15.5"
                                  stroke="url(#uploadGrad)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                                <motion.g
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <path d="M28 44V32" stroke="url(#uploadGrad2)" strokeWidth="2.2" strokeLinecap="round" />
                                  <path d="M23 37l5-5 5 5" stroke="url(#uploadGrad2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </motion.g>
                              </svg>
                            </motion.span>
                            <p className="drop-text" style={{ position: "relative", zIndex: 1 }}>Arrastra el PDF aquí o haz clic para seleccionar</p>
                            <p className="drop-hint" style={{ position: "relative", zIndex: 1 }}>Reporte generado por el monitor Syai X1 · Max 20 MB</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!pacienteId && (
                  <div className="drop-zone-locked">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect width="28" height="28" rx="8" fill="#f1f5f9" />
                      <path d="M10 13v-2a4 4 0 0 1 8 0v2" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round"/>
                      <rect x="8" y="13" width="12" height="8" rx="2.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2"/>
                      <circle cx="14" cy="17" r="1.2" fill="#94a3b8"/>
                    </svg>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: "8px 0 0" }}>Selecciona primero un paciente</p>
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
                  <label>Fecha colocación MCG</label>
                  <input type="date" name="fecha_colocacion" value={form.fecha_colocacion} onChange={cambiarForm} />
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
                <div className="form-group">
                  <label>Se modificó dosis</label>
                  <input type="checkbox" name="se_modifico_dosis" checked={!!form.se_modifico_dosis} onChange={cambiarForm} style={{ width: "auto" }} />
                </div>
                <div className="form-group">
                  <label>Dosis modificada</label>
                  <input name="dosis_modificada" value={form.dosis_modificada} onChange={cambiarForm} placeholder="Nueva dosis indicada" />
                </div>
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
