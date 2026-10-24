const COLORES = {
  HMEP: "#22c55e",
  IHSS: "#3b82f6",
  HEU:  "#ef4444",
};

export default function InstSelector({ institucion, setInstitucion, usuario }) {
  const instDisp = Array.isArray(usuario?.instituciones_acceso) && usuario.instituciones_acceso.length
    ? usuario.instituciones_acceso
    : ["HMEP", "IHSS", "HEU"];

  const n     = instDisp.length;
  const idx   = Math.max(0, instDisp.indexOf(institucion));
  const color = COLORES[institucion] || "#3b82f6";

  // ── 2 instituciones: toggle estilo iPhone ────────────────────────────
  if (n === 2) {
    const isFirst = idx === 0;
    const THUMB_SIZE = 32;
    const PILL_H     = 38;
    const PILL_W     = 100;
    const PAD        = 3;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap" }}>Institución:</span>
        <div
          role="switch"
          aria-checked={isFirst}
          onClick={() => setInstitucion(isFirst ? instDisp[1] : instDisp[0])}
          style={{
            position: "relative",
            width: PILL_W,
            height: PILL_H,
            borderRadius: PILL_H / 2,
            background: color,
            cursor: "pointer",
            userSelect: "none",
            transition: "background 0.22s",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)",
            flexShrink: 0,
          }}
        >
          {/* Etiqueta de la institución activa */}
          <span style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            // Cuando el thumb está a la derecha (isFirst), el texto va a la izquierda
            // Cuando el thumb está a la izquierda (!isFirst), el texto va a la derecha
            left:  isFirst ? PAD + 8 : undefined,
            right: isFirst ? undefined : PAD + 8,
            fontSize: 12,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.04em",
            pointerEvents: "none",
            transition: "opacity 0.15s",
          }}>
            {instDisp[idx]}
          </span>

          {/* Thumb blanco */}
          <div style={{
            position: "absolute",
            top: PAD,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            // isFirst (HMEP activo) → thumb a la derecha
            left: isFirst ? PILL_W - THUMB_SIZE - PAD : PAD,
            transition: "left 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }} />
        </div>
      </div>
    );
  }

  // ── 3+ instituciones: segmented control deslizante ───────────────────
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap" }}>Institución:</span>

      <div style={{
        position: "relative",
        display: "inline-flex",
        background: "#e2e8f0",
        borderRadius: 100,
        padding: 3,
      }}>
        {/* Thumb deslizante */}
        <div style={{
          position: "absolute",
          top: 3, bottom: 3,
          left:  `calc(${idx * (100 / n)}% + 3px)`,
          width: `calc(${100 / n}% - 6px)`,
          background: color,
          borderRadius: 100,
          boxShadow: "0 1px 6px rgba(0,0,0,0.20)",
          transition: "left 0.22s cubic-bezier(0.4, 0, 0.2, 1), background 0.22s",
          pointerEvents: "none",
        }} />

        {instDisp.map((inst) => (
          <button
            key={inst}
            type="button"
            onClick={() => setInstitucion(inst)}
            style={{
              position: "relative",
              zIndex: 1,
              minWidth: 58,
              padding: "5px 14px",
              background: "transparent",
              border: "none",
              borderRadius: 100,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              color: institucion === inst ? "#fff" : "#64748b",
              transition: "color 0.18s",
              letterSpacing: "0.02em",
              userSelect: "none",
            }}
          >
            {inst}
          </button>
        ))}
      </div>
    </div>
  );
}
