import { useEffect, useState } from "react";
import AnalizandoOverlay, { conAnimacion, ANALISIS_ULTRASONIDO } from "../../../../shared/components/AnalizandoOverlay";
import { getUltrasonidos, createUltrasonido, deleteUltrasonido, escanearUltrasonidoPDF } from "../api/renacedApi";

const API_ARCHIVOS = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
const VACIO = { fecha_estudio: "", estudio: "", sucursal: "", ultrasonografista: "", indicacion: "", tecnica: "", hallazgos: "", conclusion: "", sugerencia: "", archivo_pdf: "" };
const CAMPOS_TEXTO = [
  ["indicacion", "Indicación", 2], ["tecnica", "Técnica", 2], ["hallazgos", "Hallazgos", 7], ["conclusion", "Conclusión", 4], ["sugerencia", "Sugerencia", 2],
];
const btnLink = { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "2px 6px" };
const fechaLarga = (f) => (f ? new Date(String(f).slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/** Pestaña "Ultrasonidos" del expediente: sube el PDF, lee el informe y lo guarda con el PDF. */
export default function UltrasonidosPanel({ pacienteId }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [escaneo, setEscaneo] = useState({ cargando: false, error: "", avisos: [] });
  const [form, setForm] = useState(null);       // null = modal cerrado
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(null);

  function cargar() {
    setCargando(true);
    getUltrasonidos(pacienteId).then((r) => setLista(r.data)).catch(() => setLista([])).finally(() => setCargando(false));
  }
  useEffect(cargar, [pacienteId]);

  async function escanear(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setEscaneo({ cargando: true, error: "", avisos: [] });
    try {
      const { data } = await conAnimacion(escanearUltrasonidoPDF(pacienteId, archivo), ANALISIS_ULTRASONIDO);
      setForm({ ...VACIO, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in VACIO && v)), archivo_pdf: data.archivo });
      setEscaneo({ cargando: false, error: "", avisos: data.avisos || [] });
    } catch (err) {
      setEscaneo({ cargando: false, error: err.response?.data?.error || "No se pudo leer el PDF", avisos: [] });
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await createUltrasonido(pacienteId, form);
      setForm(null);
      setEscaneo({ cargando: false, error: "", avisos: [] });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el ultrasonido");
    } finally { setGuardando(false); }
  }

  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar el ultrasonido del ${fechaLarga(u.fecha_estudio)}? También se borra su PDF.`)) return;
    try { await deleteUltrasonido(pacienteId, u.id); cargar(); } catch { /* el listado se recarga igual */ cargar(); }
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <AnalizandoOverlay visible={escaneo.cargando} preset={ANALISIS_ULTRASONIDO} subtitulo="Lectura automática · Ultrasonido" etiqueta="Análisis de ultrasonido" />
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {escaneo.error && <span style={{ color: "#b91c1c", fontSize: 13 }}>{escaneo.error}</span>}
        <label className="btn btn-primary btn-sm" style={{ cursor: escaneo.cargando ? "wait" : "pointer", opacity: escaneo.cargando ? 0.6 : 1 }}>
          {escaneo.cargando ? "Leyendo estudio…" : "🩻 Subir ultrasonido (PDF)"}
          <input type="file" accept="application/pdf" hidden disabled={escaneo.cargando} onChange={escanear} />
        </label>
      </div>

      <div className="card">
        {cargando ? <div className="loading">Cargando…</div> : lista.length === 0 ? (
          <div className="empty-cell" style={{ padding: 24, textAlign: "center" }}>Sin ultrasonidos registrados</div>
        ) : lista.map((u) => (
          <div key={u.id} style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <strong>{u.estudio || "Ultrasonido"}</strong>
                <span style={{ color: "#64748b", fontSize: 13 }}> · {fechaLarga(u.fecha_estudio)}{u.sucursal ? ` · ${u.sucursal}` : ""}</span>
              </div>
              <div>
                <button style={btnLink} onClick={() => setAbierto(abierto === u.id ? null : u.id)}>{abierto === u.id ? "Ocultar" : "Ver informe"}</button>
                {u.archivo_pdf && <a href={`${API_ARCHIVOS}/uploads/renaced_ultrasonidos/${u.archivo_pdf}`} target="_blank" rel="noopener noreferrer" style={{ ...btnLink, textDecoration: "none" }}>Ver PDF</a>}
                <button style={{ ...btnLink, color: "#dc2626" }} onClick={() => eliminar(u)}>Eliminar</button>
              </div>
            </div>
            {u.conclusion && <div style={{ marginTop: 6, fontSize: 13.5, whiteSpace: "pre-line" }}><strong>Conclusión: </strong>{u.conclusion}</div>}
            {abierto === u.id && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#334155", display: "grid", gap: 8 }}>
                {u.ultrasonografista && <div><strong>Ultrasonografista: </strong>{u.ultrasonografista}</div>}
                {CAMPOS_TEXTO.filter(([k]) => k !== "conclusion" && u[k]).map(([k, label]) => (
                  <div key={k} style={{ whiteSpace: "pre-line" }}><strong>{label}: </strong>{u[k]}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {form && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 720, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Nuevo ultrasonido</h3>
              <button onClick={() => setForm(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>
              Se leyó el informe del PDF (se guardará con el registro). Revisa el texto antes de guardar.
              {escaneo.avisos.map((a, i) => <div key={i} style={{ color: "#b45309" }}>⚠ {a}</div>)}
            </div>
            <form onSubmit={guardar}>
              <div className="detalle-2col">
                <div className="form-group"><label style={{ fontSize: 12 }}>Fecha del estudio *</label>
                  <input type="date" required value={form.fecha_estudio} onChange={(e) => set("fecha_estudio", e.target.value)} /></div>
                <div className="form-group"><label style={{ fontSize: 12 }}>Estudio</label>
                  <input type="text" value={form.estudio} onChange={(e) => set("estudio", e.target.value)} /></div>
                <div className="form-group"><label style={{ fontSize: 12 }}>Sucursal</label>
                  <input type="text" value={form.sucursal} onChange={(e) => set("sucursal", e.target.value)} /></div>
                <div className="form-group"><label style={{ fontSize: 12 }}>Ultrasonografista</label>
                  <input type="text" value={form.ultrasonografista} onChange={(e) => set("ultrasonografista", e.target.value)} /></div>
              </div>
              {CAMPOS_TEXTO.map(([k, label, filas]) => (
                <div className="form-group" key={k}><label style={{ fontSize: 12 }}>{label}</label>
                  <textarea rows={filas} value={form[k]} onChange={(e) => set(k, e.target.value)} style={{ width: "100%" }} /></div>
              ))}
              {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => setForm(null)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar ultrasonido"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
