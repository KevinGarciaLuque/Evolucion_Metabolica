import { useEffect, useMemo, useRef, useState } from "react";
import { getConsentimientosPendientes, subirLoteConsentimientos } from "../api/renacedApi";

const MAX_ARCHIVOS = 30;
const MAX_LOTE = 40 * 1024 * 1024;
const mb = (b) => (b / 1048576).toFixed(b < 10485760 ? 1 : 0);
const nfc = (s) => s.normalize("NFC");

// Carga masiva de los avisos de privacidad y consentimientos firmados del sistema anterior.
// Los PDF están en el equipo de quien migra (no en el servidor): se elige la carpeta "subidas",
// se filtran los que las fichas de los pacientes necesitan y faltan, y se envían por tandas.
export default function ImportarConsentimientos() {
  const [resumen, setResumen] = useState(null); // { referenciados, en_servidor, faltantes }
  const [archivos, setArchivos] = useState([]); // File[] de la carpeta elegida
  const [subida, setSubida] = useState(null);   // { enviados, total, bytesTotal, bytesHechos }
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");
  const inputRef = useRef(null);
  const subiendo = !!subida;

  const cargarResumen = () =>
    getConsentimientosPendientes()
      .then((r) => setResumen(r.data))
      .catch((e) => setError(e.response?.data?.error || "No se pudo revisar el estado de los consentimientos"));
  useEffect(() => { cargarResumen(); }, []);

  // De la carpeta elegida, solo los que las fichas piden y todavía no están en el servidor
  const { aSubir, sinArchivo } = useMemo(() => {
    if (!resumen) return { aSubir: [], sinArchivo: 0 };
    const porNombre = new Map(archivos.map((f) => [nfc(f.name), f]));
    const aSubir = resumen.faltantes.map((n) => porNombre.get(n)).filter(Boolean);
    return { aSubir, sinArchivo: resumen.faltantes.length - aSubir.length };
  }, [resumen, archivos]);
  const bytesASubir = aSubir.reduce((t, f) => t + f.size, 0);

  async function subir() {
    setError(""); setListo("");
    const lotes = [];
    let actual = [], peso = 0;
    for (const f of aSubir) {
      if (actual.length && (actual.length >= MAX_ARCHIVOS || peso + f.size > MAX_LOTE)) { lotes.push(actual); actual = []; peso = 0; }
      actual.push(f); peso += f.size;
    }
    if (actual.length) lotes.push(actual);

    let enviados = 0, hechos = 0;
    setSubida({ enviados, total: aSubir.length, bytesTotal: bytesASubir, bytesHechos: 0 });
    try {
      for (const lote of lotes) {
        const bytesLote = lote.reduce((t, f) => t + f.size, 0);
        await subirLoteConsentimientos(lote, (e) => {
          const parte = e.total ? Math.min(1, e.loaded / e.total) : 0;
          setSubida({ enviados, total: aSubir.length, bytesTotal: bytesASubir, bytesHechos: hechos + bytesLote * parte });
        });
        enviados += lote.length; hechos += bytesLote;
        setSubida({ enviados, total: aSubir.length, bytesTotal: bytesASubir, bytesHechos: hechos });
      }
      setListo(`Se subieron ${enviados} archivo${enviados === 1 ? "" : "s"}.`);
      setArchivos([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(`${e.response?.data?.error || "Se interrumpió la subida"}. Se enviaron ${enviados} de ${aSubir.length}; vuelve a pulsar «Subir» para continuar con los que faltan.`);
    } finally {
      setSubida(null);
      cargarResumen();
    }
  }

  const pct = subida && subida.bytesTotal ? Math.round((subida.bytesHechos / subida.bytesTotal) * 100) : 0;
  const completos = resumen && resumen.faltantes.length === 0;

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Consentimientos firmados del sistema anterior</h3>
      <p style={{ color: "#64748b", fontSize: 13.5, marginBottom: 14 }}>
        Sube los PDF de avisos de privacidad y consentimientos informados para poder verlos desde el expediente
        de cada paciente. Elige la carpeta <strong>subidas</strong> del sistema anterior (<code>registro/docs/subidas</code>);
        solo se envían los archivos que las fichas necesitan y que aún no están en el servidor.
      </p>

      {resumen && resumen.persistente === false && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: 12, fontSize: 13.5, marginBottom: 14 }}>
          <strong>El servidor no tiene un volumen de almacenamiento.</strong> Los archivos que subas se borrarán en el próximo
          despliegue. Crea un volumen en Railway y vincúlalo al servicio del backend antes de subirlos.
        </div>
      )}

      {resumen && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            ["Referenciados", resumen.referenciados, "#334155"],
            ["Ya en el servidor", resumen.en_servidor, "#16a34a"],
            ["Faltan", resumen.faltantes.length, resumen.faltantes.length ? "#d97706" : "#16a34a"],
          ].map(([t, n, c]) => (
            <div key={t} style={{ flex: "1 1 120px", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{n.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {completos && <p style={{ color: "#16a34a", fontWeight: 600, margin: "0 0 8px" }}>✓ Todos los consentimientos referenciados ya están en el servidor.</p>}

      {resumen && !completos && (
        <>
          <input
            ref={inputRef} type="file" multiple disabled={subiendo}
            // eslint-disable-next-line react/no-unknown-property
            webkitdirectory="" directory=""
            onChange={(e) => { setArchivos(Array.from(e.target.files || [])); setListo(""); setError(""); }}
          />
          {archivos.length > 0 && (
            <p style={{ fontSize: 13.5, margin: "12px 0 0", color: "#334155" }}>
              Carpeta con {archivos.length.toLocaleString()} archivos: <strong>{aSubir.length.toLocaleString()}</strong> por subir ({mb(bytesASubir)} MB)
              {sinArchivo > 0 && <span style={{ color: "#d97706" }}> · {sinArchivo.toLocaleString()} de los que faltan no están en esta carpeta</span>}.
            </p>
          )}
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={subiendo || !aSubir.length} onClick={subir}>
            {subiendo ? "Subiendo…" : `Subir ${aSubir.length ? aSubir.length.toLocaleString() + " archivos" : ""}`.trim()}
          </button>
        </>
      )}

      {subida && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 4 }}>
            <span>{subida.enviados.toLocaleString()} de {subida.total.toLocaleString()} archivos</span>
            <strong>{pct}%</strong>
          </div>
          <div style={{ height: 10, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#6366f1", transition: "width .2s" }} />
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{mb(subida.bytesHechos)} MB de {mb(subida.bytesTotal)} MB</div>
        </div>
      )}

      {listo && <p style={{ color: "#16a34a", fontWeight: 600, marginTop: 12 }}>✓ {listo}</p>}
      {error && <p style={{ color: "#dc2626", fontSize: 13.5, marginTop: 12 }}>{error}</p>}
    </div>
  );
}
