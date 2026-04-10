/**
 * SemaforoISPAD
 * Muestra visualmente la clasificación según criterios ISPAD:
 * TIR >70%, TAR <25%, TBR <4%, GMI <7%
 */
export default function SemaforoISPAD({ tir, tar, tbr, gmi, clasificacion, size = "normal" }) {
  const s = size === "small" ? "semaforo-sm" : "";

  const badge = {
    OPTIMO:      { color: "#057a55", bg: "#d1fae5", texto: "🟢 Control Óptimo" },
    MODERADO:    { color: "#c27803", bg: "#fef3c7", texto: "🟡 Riesgo Moderado" },
    ALTO_RIESGO: { color: "#c81e1e", bg: "#fee2e2", texto: "🔴 Alto Riesgo" },
  };

  const info = badge[clasificacion] || badge["MODERADO"];

  const indicadores = [
    {
      label: "TIR",
      valor: tir,
      unidad: "%",
      objetivo: "≥70%",
      ok: tir >= 70,
      descripcion: "Tiempo en rango",
    },
    {
      label: "TAR",
      valor: tar,
      unidad: "%",
      objetivo: "≤25%",
      ok: tar <= 25,
      descripcion: "Tiempo arriba",
    },
    {
      label: "TBR",
      valor: tbr,
      unidad: "%",
      objetivo: "≤4%",
      ok: tbr <= 4,
      descripcion: "Tiempo abajo",
    },
    {
      label: "GMI",
      valor: gmi,
      unidad: "%",
      objetivo: "≤7%",
      ok: gmi !== null && gmi !== undefined ? gmi <= 7 : true,
      descripcion: "Índice glucosa",
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
              borderLeft: `4px solid ${ind.ok ? "#057a55" : "#c81e1e"}`,
              background: ind.ok ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <div className="semaforo-label">{ind.label}</div>
            <div className="semaforo-valor" style={{ color: ind.ok ? "#057a55" : "#c81e1e" }}>
              {ind.valor !== null && ind.valor !== undefined ? `${ind.valor}%` : "—"}
            </div>
            <div className="semaforo-objetivo">Obj: {ind.objetivo}</div>
            <div className="semaforo-desc">{ind.descripcion}</div>
          </div>
        ))}
      </div>

      {/* Barra de TIR visual */}
      {tir !== null && tir !== undefined && (
        <div className="semaforo-barra-wrapper">
          <span className="semaforo-barra-label">TIR {tir}%</span>
          <div className="semaforo-barra">
            <div
              className="semaforo-barra-fill"
              style={{
                width: `${Math.min(tir, 100)}%`,
                background: tir >= 70 ? "#057a55" : tir >= 50 ? "#c27803" : "#c81e1e",
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
