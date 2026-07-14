import { useState } from "react";
import RenacedLayout from "../../components/RenacedLayout";
import { descargarExcel, descargarCSV, descargarPDF } from "../../api/renacedApi";
import { HiOutlineTableCells, HiOutlineDocumentText, HiOutlineArrowDownTray } from "react-icons/hi2";

function descargarBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const fecha = () => new Date().toISOString().slice(0, 10);

const REPORTES = [
  {
    id: "excel",
    icon: HiOutlineTableCells,
    iconColor: "#16a34a",
    iconBg: "#dcfce7",
    titulo: "Excel completo",
    subtitulo: "Archivo .xlsx con múltiples hojas",
    descripcion: "Incluye: lista completa de pacientes con datos personales y diagnóstico, última consulta de cada paciente (peso, talla, PA) y últimos resultados de laboratorio (HbA1c, glucosa, lípidos).",
    boton: "Descargar Excel",
    ext: "xlsx",
    fn: descargarExcel,
    btnColor: "#16a34a",
    btnHover: "#15803d",
  },
  {
    id: "csv",
    icon: HiOutlineTableCells,
    iconColor: "#0891b2",
    iconBg: "#e0f2fe",
    titulo: "CSV — Lista de pacientes",
    subtitulo: "Archivo .csv compatible con cualquier hoja de cálculo",
    descripcion: "Exporta la lista de pacientes con sus datos demográficos, diagnóstico de diabetes y estatus. Útil para importar en otros sistemas o análisis rápidos.",
    boton: "Descargar CSV",
    ext: "csv",
    fn: descargarCSV,
    btnColor: "#0891b2",
    btnHover: "#0e7490",
  },
  {
    id: "pdf",
    icon: HiOutlineDocumentText,
    iconColor: "#dc2626",
    iconBg: "#fee2e2",
    titulo: "Reporte PDF — ALAD",
    subtitulo: "Reporte estadístico para la Asociación Latinoamericana de Diabetes",
    descripcion: "Genera un resumen estadístico con: totales por sexo, distribución por tipo de diabetes, control glucémico (HbA1c promedio y rangos) y prevalencia de complicaciones crónicas.",
    boton: "Descargar PDF",
    ext: "pdf",
    fn: descargarPDF,
    btnColor: "#dc2626",
    btnHover: "#b91c1c",
  },
];

export default function RenacedReportes() {
  const [descargando, setDescargando] = useState(null);
  const [error, setError] = useState(null);

  async function descargar(reporte) {
    setDescargando(reporte.id);
    setError(null);
    try {
      const resp = await reporte.fn();
      descargarBlob(resp.data, `RENACED_Mexico_${fecha()}.${reporte.ext}`);
    } catch {
      setError(`No se pudo generar el ${reporte.titulo}. Intenta de nuevo.`);
    } finally {
      setDescargando(null);
    }
  }

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Reportes y Exportación</h1>
          <p className="page-subtitle">Descarga los datos RENACED en distintos formatos</p>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 10, padding: "12px 18px", marginBottom: 20,
          color: "#dc2626", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {REPORTES.map((r) => {
          const Icon = r.icon;
          const cargando = descargando === r.id;
          return (
            <div
              key={r.id}
              className="card"
              style={{ margin: 0, display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Ícono + título */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: r.iconBg, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={24} color={r.iconColor} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                    {r.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {r.subtitulo}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                {r.descripcion}
              </p>

              {/* Botón */}
              <button
                onClick={() => descargar(r)}
                disabled={descargando !== null}
                style={{
                  marginTop: "auto",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 18px", border: "none", borderRadius: 8,
                  background: cargando ? "#e2e8f0" : r.btnColor,
                  color: cargando ? "#94a3b8" : "#fff",
                  fontWeight: 600, fontSize: "0.88rem", cursor: cargando ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { if (!cargando) e.currentTarget.style.background = r.btnHover; }}
                onMouseLeave={(e) => { if (!cargando) e.currentTarget.style.background = r.btnColor; }}
              >
                {cargando
                  ? <><span style={{ width: 16, height: 16, border: "2px solid #94a3b8", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Generando…</>
                  : <><HiOutlineArrowDownTray size={16} /> {r.boton}</>
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Spinner CSS */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </RenacedLayout>
  );
}
