import { useEffect, useState } from "react";
import { FiFileText, FiTrash2, FiExternalLink, FiUpload } from "react-icons/fi";
import { getDocumentosPaciente, getArchivoDocumento, borrarDocumentoPaciente, subirDocumentoPaciente } from "../api/renacedApi";

const COLORES = { nota_evolucion: ["#eef2ff", "#4338ca"], receta: ["#ecfdf5", "#047857"], historia_clinica: ["#fef3c7", "#b45309"], otro: ["#f1f5f9", "#475569"] };
const fecha = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "—");
const tam = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Pestaña "Documentos" del paciente: los PDF de notas de evolución y recetas que se importaron (o se subieron aquí). */
export default function DocumentosPaciente({ pacienteId, recarga = 0 }) {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const cargar = () => getDocumentosPaciente(pacienteId).then((r) => setDocs(r.data)).catch(() => { setDocs([]); setError("No se pudieron cargar los documentos"); });
  useEffect(() => { cargar(); }, [pacienteId, recarga]);

  async function abrir(d) {
    try {
      const { data } = await getArchivoDocumento(pacienteId, d.id);
      window.open(URL.createObjectURL(data), "_blank", "noopener");
    } catch { setError("No se pudo abrir el archivo"); }
  }
  async function borrar(d) {
    if (!window.confirm(`¿Eliminar «${d.titulo || d.nombre_original}»? El PDF se borrará del servidor.`)) return;
    try { await borrarDocumentoPaciente(pacienteId, d.id); cargar(); } catch { setError("No se pudo eliminar el documento"); }
  }
  async function subir(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendo(true); setError("");
    try { await subirDocumentoPaciente(pacienteId, archivo); await cargar(); }
    catch (err) { setError(err.response?.data?.error || "No se pudo subir el PDF"); }
    finally { setSubiendo(false); }
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Documentos del paciente</h3>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            Aquí se guardan las notas de evolución y recetas que importas con «Importar nota / receta (PDF)». También puedes subir un PDF suelto.
          </div>
        </div>
        <label className="btn btn-secondary btn-sm" style={{ cursor: subiendo ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: subiendo ? 0.6 : 1 }}>
          <FiUpload size={14} /> {subiendo ? "Subiendo…" : "Subir PDF"}
          <input type="file" accept="application/pdf" hidden disabled={subiendo} onChange={subir} />
        </label>
      </div>
      {error && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {docs === null ? <div style={{ color: "#64748b", fontSize: 13 }}>Cargando…</div>
        : docs.length === 0 ? <div style={{ color: "#64748b", fontSize: 13.5, padding: "18px 4px" }}>Este paciente aún no tiene documentos guardados.</div>
        : (
          <div style={{ display: "grid", gap: 8 }}>
            {docs.map((d) => {
              const [bg, fg] = COLORES[d.tipo] || COLORES.otro;
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", flexWrap: "wrap" }}>
                  <FiFileText size={20} style={{ color: fg, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{d.titulo || d.nombre_original}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{d.nombre_original} · {tam(d.tamano)} · subido el {fecha(d.creado_en)}</div>
                  </div>
                  <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{d.tipo_nombre}</span>
                  <span style={{ fontSize: 13, color: "#334155", minWidth: 84 }}>{fecha(d.fecha_documento)}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => abrir(d)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiExternalLink size={14} /> Abrir</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => borrar(d)} title="Eliminar" style={{ color: "#b91c1c" }}><FiTrash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
