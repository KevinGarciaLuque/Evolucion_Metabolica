import { useState } from "react";
import { escanearHistoriaClinicaPDF } from "../api/renacedApi";
import AnalizandoOverlay, { conAnimacion, ANALISIS_HISTORIA_CLINICA } from "../../../../shared/components/AnalizandoOverlay";

/**
 * Botón "Importar historia clínica (PDF)". Lee el PDF y llama a `onImportar(datos)`, que rellena los formularios
 * de la pantalla SIN guardar y devuelve { llenados, respetados }. Aquí solo se muestra el resultado, los avisos
 * y los datos del PDF que RENACED no tiene dónde guardar.
 */
export default function ImportarHistoriaClinica({ pacienteId, onImportar, texto = "📄 Importar historia clínica (PDF)", ayuda }) {
  const [estado, setEstado] = useState({ cargando: false, error: "", datos: null, resumen: null });
  const [verExtra, setVerExtra] = useState(false);

  async function leer(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setEstado({ cargando: true, error: "", datos: null, resumen: null });
    try {
      const { data } = await conAnimacion(escanearHistoriaClinicaPDF(archivo, pacienteId), ANALISIS_HISTORIA_CLINICA);
      const resumen = onImportar(data) || null;
      setEstado({ cargando: false, error: "", datos: data, resumen });
      setVerExtra(false);
    } catch (err) {
      setEstado({ cargando: false, error: err.response?.data?.error || "No se pudo leer el PDF", datos: null, resumen: null });
    }
  }

  const { cargando, error, datos, resumen } = estado;
  return (
    <div className="card" style={{ marginBottom: 14, padding: "12px 16px" }}>
      <AnalizandoOverlay visible={cargando} preset={ANALISIS_HISTORIA_CLINICA} subtitulo="Lectura automática · Historia clínica" etiqueta="Importación de historia clínica" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label className="btn btn-secondary btn-sm" style={{ cursor: cargando ? "wait" : "pointer", opacity: cargando ? 0.6 : 1 }}>
          {cargando ? "Leyendo historia clínica…" : texto}
          <input type="file" accept="application/pdf" hidden disabled={cargando} onChange={leer} />
        </label>
        <span style={{ fontSize: 12.5, color: "#64748b" }}>
          {ayuda || "Se leen los datos del PDF y se llenan los campos vacíos. No se guarda nada hasta que tú guardes cada apartado."}
        </span>
      </div>
      {error && <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>{error}</div>}
      {datos && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, padding: "8px 12px" }}>
            {resumen
              ? <>Se llenaron <strong>{resumen.llenados}</strong> campo{resumen.llenados === 1 ? "" : "s"}
                  {resumen.respetados > 0 ? <> y se respetaron <strong>{resumen.respetados}</strong> que ya tenían un dato distinto</> : null}. Revisa y guarda cada apartado.</>
              : "Historia clínica leída."}
          </div>
          {datos.avisos?.map((a, i) => <div key={i} style={{ color: "#b45309", marginTop: 6 }}>⚠ {a}</div>)}
          {datos.no_importado?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setVerExtra((v) => !v)}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }}>
                {verExtra ? "▾" : "▸"} Datos del PDF que RENACED no guarda ({datos.no_importado.length})
              </button>
              {verExtra && (
                <div style={{ marginTop: 6, display: "grid", gap: 4, color: "#334155" }}>
                  {datos.no_importado.map((x, i) => <div key={i}><strong>{x.etiqueta}:</strong> {x.valor}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
