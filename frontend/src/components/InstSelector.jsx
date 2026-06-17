const COLORES = {
  HMEP: { border: "#3b82f6", bg: "#eff6ff", text: "#3b82f6" },
  IHSS: { border: "#8b5cf6", bg: "#f5f3ff", text: "#8b5cf6" },
  HEU:  { border: "#ef4444", bg: "#fef2f2", text: "#ef4444" },
};

export default function InstSelector({ institucion, setInstitucion, usuario }) {
  const instDisp = Array.isArray(usuario?.instituciones_acceso) && usuario.instituciones_acceso.length
    ? usuario.instituciones_acceso
    : ["HMEP", "IHSS", "HEU"];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap" }}>Institución:</span>
      <div style={{ display: "flex", gap: 6 }}>
        {instDisp.map((inst) => {
          const c = COLORES[inst] || COLORES.HMEP;
          const activo = institucion === inst;
          return (
            <button
              key={inst}
              onClick={() => setInstitucion(inst)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: `2px solid ${activo ? c.border : "#e2e8f0"}`,
                background: activo ? c.bg : "#fff",
                color: activo ? c.text : "#94a3b8",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {inst}
            </button>
          );
        })}
      </div>
    </div>
  );
}
