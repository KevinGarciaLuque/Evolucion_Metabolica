import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";

const C = { slate: "#64748b" };

// Sección de acordeón: cerrada por defecto; se abre al hacer clic en el encabezado.
// `estado` muestra "Con datos / Sin datos"; `etiqueta` permite otro texto (p. ej. "2 registros").
export default function SeccionAcordeon({ icono: Icono, color, titulo, descripcion, abierta, onToggle, estado, etiqueta, children }) {
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
          {etiqueta || (estado ? "✓ Con datos" : "Sin datos")}
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
