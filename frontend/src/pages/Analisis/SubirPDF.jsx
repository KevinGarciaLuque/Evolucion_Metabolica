import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const inputRef = useRef();
  const busquedaRef = useRef();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get("/pacientes").then((r) => setPacientes(r.data));
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
          <span className="exito-icon">✅</span>
          <h2>¡Análisis guardado exitosamente!</h2>
          <p>Los datos del reporte Syai X1 han sido registrados en el historial del paciente.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <button className="btn btn-primary"   onClick={() => navigate(`/pacientes/${pacienteId}`)}>Ver paciente</button>
            <button className="btn btn-outline"   onClick={() => { setEtapa("subir"); setArchivo(null); setForm(null); setPacienteId(pacientePreseleccionado || ""); }}>Subir otro PDF</button>
            <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>Ir al Dashboard</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AnalizandoOverlay visible={subiendo} />
      <div className="page-header">
        <div>
          <h1>Subir Reporte PDF · Syai X1</h1>
          <p className="page-subtitle">Carga el PDF generado por el monitor Syai X1 para extracción automática de datos</p>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {etapa === "subir" && (
        <div className="upload-container">
          <div className="card">
            <div className="form-group" style={{ position: "relative" }}>
              <label>Paciente *</label>
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
                    paddingRight: pacienteId ? 36 : 12,
                    borderColor: pacienteId ? "#22c55e" : undefined,
                  }}
                />
                {pacienteId && (
                  <span style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    color: "#22c55e", fontSize: 18, pointerEvents: "none",
                  }}>✓</span>
                )}
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

            <div
              className={`drop-zone ${arrastrado ? "arrastrado" : ""} ${archivo ? "con-archivo" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current.click()}
            >
              <input
                ref={inputRef} type="file" accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files[0]) setArchivo(e.target.files[0]); }}
              />
              {archivo ? (
                <>
                  <span className="drop-icon">📄</span>
                  <p className="drop-filename">{archivo.name}</p>
                  <p className="drop-hint">Clic para cambiar</p>
                </>
              ) : (
                <>
                  <span className="drop-icon">⬆️</span>
                  <p className="drop-text">Arrastra el PDF aquí o haz clic para seleccionar</p>
                  <p className="drop-hint">Reporte generado por el monitor Syai X1 · Max 20 MB</p>
                </>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={subirPDF}
                disabled={subiendo || !archivo || !pacienteId}
              >
                {subiendo ? "⏳ Procesando PDF..." : "🔍 Analizar PDF"}
              </button>
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
