import { useEffect, useState } from "react";
import { getConsentimientos, getArchivoConsentimiento, subirConsentimiento } from "../api/renacedApi";

const ORDEN = ["aviso", "consentimiento"];

// Aviso de privacidad y consentimiento informado firmados: ver y subir/reemplazar el archivo.
export default function ConsentimientosModal({ pacienteId, onCerrar, onCambio }) {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");

  const cargar = () =>
    getConsentimientos(pacienteId).then((r) => setDocs(r.data)).catch(() => setError("No se pudieron cargar los consentimientos"));
  useEffect(() => { cargar(); }, [pacienteId]);

  async function ver(tipo) {
    setError("");
    const ventana = window.open("", "_blank"); // se abre ya para que el navegador no la bloquee
    try {
      const { data } = await getArchivoConsentimiento(pacienteId, tipo);
      const url = URL.createObjectURL(data);
      if (ventana) ventana.location = url; else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      ventana?.close();
      setError("El archivo no está disponible en el servidor");
    }
  }

  async function subir(tipo, e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(""); setOcupado(tipo);
    try {
      await subirConsentimiento(pacienteId, tipo, archivo);
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo subir el archivo");
    } finally { setOcupado(""); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 560, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Consentimientos firmados</h3>
          <button onClick={onCerrar} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>PDF o imagen del documento firmado por el paciente.</p>

        {error && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {!docs && !error && <div style={{ color: "#64748b", fontSize: 14 }}>Cargando…</div>}

        {docs && ORDEN.map((tipo) => {
          const d = docs[tipo];
          if (!d) return null;
          return (
            <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap", padding: "12px 0", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{d.nombre}</div>
                <div style={{ fontSize: 12.5, color: d.disponible ? "#166534" : "#64748b" }}>
                  {d.disponible ? "Archivo disponible"
                    : d.archivo ? "Registrado, pero el archivo no está en el servidor"
                    : d.firmado ? "Marcado como firmado, pero sin documento digitalizado" : "Sin firmar"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {d.disponible && <button className="btn btn-secondary btn-sm" onClick={() => ver(tipo)}>Ver</button>}
                <label className="btn btn-outline btn-sm" style={{ cursor: ocupado === tipo ? "wait" : "pointer", opacity: ocupado === tipo ? 0.6 : 1 }}>
                  {ocupado === tipo ? "Subiendo…" : d.archivo ? "Reemplazar" : "Subir"}
                  <input type="file" accept="application/pdf,image/jpeg,image/png" hidden disabled={!!ocupado} onChange={(e) => subir(tipo, e)} />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
