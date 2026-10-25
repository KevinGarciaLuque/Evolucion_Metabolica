import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Pantalla de "Analizando reporte" (animación). Se usa mientras el PDF se sube y se lee.
// Exporta también TIEMPO_MIN: duración mínima para que la animación se vea completa.
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

// Mensajes por defecto de la "terminal" (describen el proceso, no muestran valores)
const TOKENS_DEFECTO = [
  "abriendo documento PDF...",
  "identificando tipo de reporte...",
  "localizando tablas de glucosa...",
  "extrayendo tiempo en rango...",
  "calculando clasificación ISPAD...",
  "validando métricas  ✓  listo",
];

export default function AnalizandoOverlay({ visible, subtitulo = "Extracción automática de datos del reporte", tokens = TOKENS_DEFECTO, etiqueta = "Análisis automático" }) {
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
    const tokenTimer = setInterval(() => setTokenIdx(i => (i + 1) % tokens.length), 1100);
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
              {etiqueta}
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
              {subtitulo}
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
                  {tokens[tokenIdx]}
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

export { TIEMPO_MIN };
