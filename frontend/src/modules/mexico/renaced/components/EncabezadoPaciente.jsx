import { Link } from "react-router-dom";
import { fmtFecha } from "../../../../shared/utils/zonaHoraria";
import { edadDetallada } from "../../../../shared/utils/edad";

// Encabezado común del paciente (consulta y expediente): iniciales, nombre, chips y acciones.
// `acciones` son los botones de la derecha; usa BotonEncabezado / EnlaceEncabezado para que se vean igual.
const base = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
  fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer", fontFamily: "inherit",
};
const estilos = {
  suave: { color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0" },
  primario: { color: "#fff", background: "#2563eb", border: "1px solid #2563eb" },
};

export function EnlaceEncabezado({ to, variante = "suave", children }) {
  return <Link to={to} style={{ ...base, ...estilos[variante] }}>{children}</Link>;
}
export function BotonEncabezado({ onClick, variante = "suave", children }) {
  return <button type="button" onClick={onClick} style={{ ...base, ...estilos[variante] }}>{children}</button>;
}

export default function EncabezadoPaciente({ nombre, sexo, tipoDiabetes, colorTipo, fechaNacimiento, expediente, curp, acciones }) {
  const edad = edadDetallada(String(fechaNacimiento || "").slice(0, 10));
  const color = colorTipo || { bg: "#ede9fe", color: "#6d28d9" };
  const iniciales = String(nombre || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const chip = { borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 600 };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 20px", marginBottom: 14,
      boxShadow: "0 1px 3px rgba(15,23,42,.06)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <div aria-hidden style={{
        width: 56, height: 56, borderRadius: 16, flexShrink: 0, display: "grid", placeItems: "center",
        background: sexo === "F" ? "linear-gradient(135deg,#f472b6,#be185d)" : "linear-gradient(135deg,#60a5fa,#1d4ed8)",
        color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: 0.5,
      }}>{iniciales}</div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.15rem, 2.5vw, 1.55rem)", lineHeight: 1.2, wordBreak: "break-word", color: "#0f172a" }}>{nombre}</h1>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {tipoDiabetes && <span style={{ ...chip, background: color.bg, color: color.color }}>{tipoDiabetes}</span>}
          <span style={{ ...chip, background: sexo === "F" ? "#fce7f3" : "#dbeafe", color: sexo === "F" ? "#be185d" : "#1d4ed8" }}>
            {({ F: "Mujer", M: "Hombre", I: "Intersexual", N: "No reportado" })[sexo] || "—"}
          </span>
          {edad && (
            <span title={fechaNacimiento ? `Nació el ${fmtFecha(fechaNacimiento, { day: "numeric", month: "long", year: "numeric" }, "es-MX")}` : undefined}
              style={{ ...chip, background: "#f1f5f9", color: "#475569" }}>{edad.texto}</span>
          )}
          {expediente && <span style={{ color: "#64748b", fontSize: 12 }}>Expediente <strong style={{ color: "#334155" }}>{expediente}</strong></span>}
          {curp && <span style={{ background: "#f8fafc", color: "#64748b", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "monospace", border: "1px solid #e2e8f0" }}>{curp}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{acciones}</div>
    </div>
  );
}
