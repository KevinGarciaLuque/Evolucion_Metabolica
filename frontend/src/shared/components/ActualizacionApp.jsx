import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiRefreshCw } from "react-icons/fi";
import { usePWA, aplicarActualizacion } from "../pwa/pwa";

// Aviso "Hay una nueva versión": aparece cuando el navegador ya descargó la versión nueva.
// Al pulsar "Actualizar ahora" se instala y la app se recarga para mostrar los cambios.
export default function ActualizacionApp() {
  const { hayActualizacion } = usePWA();
  const [oculto, setOculto] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const nombre = document.documentElement.getAttribute("data-pwa") === "renaced" ? "RENACED" : "Evolución Metabólica";

  return (
    <AnimatePresence>
      {hayActualizacion && !oculto && (
        <motion.div
          role="alert"
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{
            position: "fixed", left: 12, right: 12, bottom: "max(12px, env(safe-area-inset-bottom))", zIndex: 700,
            maxWidth: 460, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            padding: "12px 14px", borderRadius: 14, color: "#e2e8f0",
            background: "linear-gradient(135deg, #0b1220, #14213d)", border: "1px solid rgba(99,179,237,.28)",
            boxShadow: "0 18px 50px rgba(0,0,0,.45)",
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#3b82f6,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <FiRefreshCw size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f8fafc" }}>Hay una nueva versión de {nombre}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Actualiza para ver los últimos cambios. La app se recargará.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button" onClick={() => setOculto(true)} disabled={aplicando}
              style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
            >
              Más tarde
            </button>
            <button
              type="button" disabled={aplicando}
              onClick={() => { setAplicando(true); aplicarActualizacion(); }}
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: aplicando ? "default" : "pointer" }}
            >
              {aplicando ? "Actualizando…" : "Actualizar ahora"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
