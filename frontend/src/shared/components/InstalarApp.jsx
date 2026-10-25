import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiDownload, FiShare, FiPlusSquare, FiX } from "react-icons/fi";
import { usePWA, instalarApp } from "../pwa/pwa";

// Botón "Instalar app" para las pantallas de login de cada país.
//  · Android / Chrome / Edge: abre el cuadro de instalación (la app queda anclada en el inicio del celular).
//  · iPhone / iPad (Safari no permite instalar con un botón): muestra los pasos de "Agregar a pantalla de inicio".
//  · Si la app ya está instalada o el navegador no lo admite, no se muestra nada.
export default function InstalarApp({ nombre = "la app", estilo }) {
  const { puedeInstalar, instalada, ios } = usePWA();
  const [pasosIOS, setPasosIOS] = useState(false);

  if (instalada) return null;
  if (!puedeInstalar && !ios) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (ios && !puedeInstalar ? setPasosIOS(true) : instalarApp())}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginTop: 12, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
          background: "transparent", color: "#4f46e5", border: "1.5px dashed #a5b4fc", fontSize: 14, fontWeight: 600,
          ...estilo,
        }}
      >
        <FiDownload size={16} /> Instalar {nombre} como app
      </button>

      <AnimatePresence>
        {pasosIOS && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPasosIOS(false)}
            style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(2,6,23,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}
          >
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: 18, padding: "20px 20px 18px", width: "100%", maxWidth: 420, marginBottom: "max(0px, env(safe-area-inset-bottom))" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: 16, color: "#0f172a" }}>Instalar {nombre} en tu iPhone</strong>
                <button type="button" onClick={() => setPasosIOS(false)} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><FiX size={20} /></button>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>Abre esta página en <strong>Safari</strong> y sigue estos pasos:</p>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "#0f172a" }}>
                <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={paso}>1</span> Toca el botón <FiShare size={18} style={{ color: "#2563eb" }} /> <strong>Compartir</strong> de la barra de Safari.
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={paso}>2</span> Elige <FiPlusSquare size={18} style={{ color: "#2563eb" }} /> <strong>Agregar a pantalla de inicio</strong>.
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={paso}>3</span> Toca <strong>Agregar</strong>. El ícono quedará en tu pantalla de inicio.
                </li>
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const paso = { width: 24, height: 24, borderRadius: "50%", background: "#eef2ff", color: "#4338ca", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
