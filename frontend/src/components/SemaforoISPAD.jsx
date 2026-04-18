/**
 * SemaforoISPAD
 * Muestra visualmente la clasificación según criterios ISPAD:
 * TIR >70%, TAR <25%, TBR <4%, GMI <7%
 */
export default function SemaforoISPAD({
  tir, tar, tbr, gmi, clasificacion, size = "normal",
  tarMuyAlto, tarAlto, tbrBajo, tbrMuyBajo, tiempoActivo,
}) {
  const s = size === "small" ? "semaforo-sm" : "";

  const badge = {
    OPTIMO:      { color: "#4a8a2a", bg: "#edf7e3", texto: "🟢 Control Óptimo" },
    MODERADO:    { color: "#c27803", bg: "#fef3c7", texto: "🟡 Riesgo Moderado" },
    ALTO_RIESGO: { color: "#c81e1e", bg: "#fee2e2", texto: "🔴 Alto Riesgo" },
  };

  const info = badge[clasificacion] || badge["MODERADO"];

  const fmt = (v) => (v !== null && v !== undefined && v !== "") ? `${v}%` : "—";

  const indicadores = [
    {
      label: "TIR",
      valor: tir,
      objetivo: "≥70%",
      ok: tir >= 70,
      descripcion: "Tiempo en rango",
      sub: null,
    },
    {
      label: "TAR",
      valor: tar,
      objetivo: "≤25%",
      ok: tar <= 25,
      descripcion: "Tiempo arriba",
      sub: [
        { label: "Muy Alto  >250 mg/dL",    valor: tarMuyAlto, color: "#FEBF01" },
        { label: "Alto  181-250 mg/dL",     valor: tarAlto,    color: "#e6a800" },
      ],
    },
    {
      label: "TBR",
      valor: tbr,
      objetivo: "≤4%",
      ok: tbr <= 4,
      descripcion: "Tiempo abajo",
      sub: [
        { label: "Bajo  54-69 mg/dL",    valor: tbrBajo,    color: "#FB0D0A" },
        { label: "Muy Bajo  <54 mg/dL",  valor: tbrMuyBajo, color: "#86270C" },
      ],
    },
    {
      label: "GMI",
      valor: gmi,
      objetivo: "≤7%",
      ok: gmi !== null && gmi !== undefined ? gmi <= 7 : true,
      descripcion: "Índice glucosa",
      sub: null,
    },
  ];

  return (
    <div className={`semaforo-wrapper ${s}`}>
      <div
        className="semaforo-badge"
        style={{ background: info.bg, color: info.color, border: `2px solid ${info.color}` }}
      >
        {info.texto}
      </div>

      <div className="semaforo-grid">
        {indicadores.map((ind) => (
          <div
            key={ind.label}
            className="semaforo-indicador"
            style={{
              borderLeft: `4px solid ${ind.ok ? "#76B250" : "#c81e1e"}`,
              background: ind.ok ? "#f4fbed" : "#fef2f2",
            }}
          >
            <div className="semaforo-label">{ind.label}</div>
            <div className="semaforo-valor" style={{ color: ind.ok ? "#76B250" : "#c81e1e" }}>
              {fmt(ind.valor)}
            </div>
            <div className="semaforo-objetivo">Obj: {ind.objetivo}</div>
            <div className="semaforo-desc">{ind.descripcion}</div>
            {ind.sub && (
              <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 6 }}>
                {ind.sub.map((sb) => {
                  const pct = (sb.valor !== null && sb.valor !== undefined && sb.valor !== "") ? Math.min(Number(sb.valor), 100) : null;
                  return (
                    <div key={sb.label} style={{
                      background: `${sb.color}12`,
                      border: `1px solid ${sb.color}40`,
                      borderRadius: 7,
                      padding: "6px 9px 7px 7px",
                    }}>
                      {/* Fila: icono + nombre + badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: 3,
                            background: sb.color, flexShrink: 0,
                            boxShadow: `0 1px 4px ${sb.color}80`,
                          }} />
                          <span style={{ color: "#334155", fontSize: 11.5, fontWeight: 500 }}>{sb.label}</span>
                        </div>
                        <span style={{
                          fontWeight: 800, color: "#fff", fontSize: 12,
                          background: sb.color, borderRadius: 5,
                          padding: "2px 8px", minWidth: 36, textAlign: "center",
                          boxShadow: `0 1px 4px ${sb.color}60`,
                        }}>
                          {fmt(sb.valor)}
                        </span>
                      </div>
                      {/* Mini barra de progreso */}
                      <div style={{
                        marginTop: 5, height: 5, borderRadius: 99,
                        background: `${sb.color}25`, overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          background: sb.color,
                          width: pct !== null ? `${pct}%` : "0%",
                          transition: "width 0.5s ease",
                          boxShadow: pct ? `0 0 6px ${sb.color}90` : "none",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tiempo Activo */}
      {tiempoActivo !== null && tiempoActivo !== undefined && tiempoActivo !== "" && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: Number(tiempoActivo) >= 70 ? "#f4fbed" : "#fef2f2",
          border: `1px solid ${Number(tiempoActivo) >= 70 ? "#b6dca0" : "#fecaca"}`,

          borderRadius: 8, padding: "7px 12px", marginTop: 8, fontSize: 13,
        }}>
          <span style={{ color: "#64748b", fontWeight: 500 }}>⏱ Tiempo Activo</span>
          <span style={{ fontWeight: 700, color: Number(tiempoActivo) >= 70 ? "#76B250" : "#c81e1e" }}>
            {tiempoActivo}% <span style={{ fontWeight: 400, fontSize: 11, color: "#94a3b8" }}>Obj: ≥70%</span>
          </span>
        </div>
      )}

      {/* Barra de TIR visual */}
      {tir !== null && tir !== undefined && (
        <div className="semaforo-barra-wrapper">
          <span className="semaforo-barra-label">TIR {tir}%</span>
          <div className="semaforo-barra">
            <div
              className="semaforo-barra-fill"
              style={{
                width: `${Math.min(tir, 100)}%`,
                background: tir >= 70 ? "#76B250" : tir >= 50 ? "#c27803" : "#c81e1e",
              }}
            />
            <div className="semaforo-barra-objetivo" style={{ left: "70%" }} title="Objetivo ISPAD: 70%" />
          </div>
          <span className="semaforo-barra-meta">Meta 70%</span>
        </div>
      )}
    </div>
  );
}
