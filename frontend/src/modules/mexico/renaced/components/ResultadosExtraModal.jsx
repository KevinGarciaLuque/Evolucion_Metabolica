import { useEffect, useState } from "react";
import { getResultadosExtraLab } from "../api/renacedApi";

/** Lista el resto de resultados de un examen (biometría, química ampliada, orina…) guardados al escanear el PDF. */
export default function ResultadosExtraModal({ pacienteId, laboratorio, onClose }) {
  const [filas, setFilas] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    getResultadosExtraLab(pacienteId, laboratorio.id).then((r) => setFilas(r.data)).catch(() => setFilas([]));
  }, [pacienteId, laboratorio.id]);

  const q = busqueda.trim().toLowerCase();
  const visibles = (filas || []).filter((f) => !q || f.nombre.toLowerCase().includes(q));
  const origen = filas?.[0]?.laboratorio_origen;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Otros resultados · {String(laboratorio.fecha_muestra).slice(0, 10)}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>
        {origen && <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13 }}>{origen}</p>}
        <input type="text" placeholder="Buscar análisis…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ marginBottom: 12 }} />
        {filas === null ? <div className="loading">Cargando…</div> : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead><tr><th>Análisis</th><th>Resultado</th><th>Unidad</th><th className="hide-mobile">Referencia</th></tr></thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nombre}{f.origen === "orina" ? <span style={{ marginLeft: 6, fontSize: 11, color: "#0369a1" }}>orina</span> : null}</td>
                    <td style={{ fontWeight: 600 }}>{f.signo || ""}{Number(f.valor)}</td>
                    <td style={{ fontSize: 12, color: "#64748b" }}>{f.unidad || ""}</td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: "#94a3b8" }}>{f.referencia || ""}</td>
                  </tr>
                ))}
                {visibles.length === 0 && <tr><td colSpan={4} className="empty-cell">Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
