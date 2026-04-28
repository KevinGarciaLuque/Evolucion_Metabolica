import { FiAlertTriangle, FiX } from "react-icons/fi";

/**
 * Modal de confirmación reutilizable.
 * Props:
 *   mensaje   — texto principal del modal
 *   detalle   — texto secundario opcional
 *   onConfirm — callback al confirmar
 *   onCancel  — callback al cancelar / cerrar
 *   danger    — bool, si true el botón de confirmar es rojo (default true)
 *   labelOk   — texto del botón confirmar (default "Eliminar")
 */
export default function ConfirmModal({ mensaje, detalle, onConfirm, onCancel, danger = true, labelOk = "Eliminar" }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: danger ? "#fef2f2" : "#f0fdf4",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FiAlertTriangle size={18} color={danger ? "#dc2626" : "#16a34a"} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
              Confirmar acción
            </span>
          </div>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 4 }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: 0, color: "#1e293b", fontSize: "0.9rem", fontWeight: 500, lineHeight: 1.5 }}>
            {mensaje}
          </p>
          {detalle && (
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "0.82rem", lineHeight: 1.5 }}>
              {detalle}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.85rem",
              background: danger ? "#dc2626" : "#16a34a",
              color: "#fff",
            }}
          >
            {labelOk}
          </button>
        </div>
      </div>
    </div>
  );
}
