import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";

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

export default function BackupPacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState("");
  const [formatMasivo, setFormatMasivo] = useState("both");
  const [institucionMasiva, setInstitucionMasiva] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState("");

  useEffect(() => {
    api.get("/pacientes")
      .then((r) => {
        setPacientes(r.data || []);
      })
      .finally(() => setCargando(false));
  }, []);

  async function exportarPaciente(tipo) {
    if (!pacienteId) return;
    setDescargando(tipo);
    try {
      const paciente = pacientes.find((p) => String(p.id) === String(pacienteId));
      const nombre = (paciente?.nombre || `paciente_${pacienteId}`).replace(/\s+/g, "_");
      const ext = tipo === "excel" ? "xlsx" : "zip";
      const resp = await api.get(`/backup-pacientes/paciente/${pacienteId}/${tipo}`, { responseType: "blob" });
      const finalName = tipo === "excel" ? `${nombre}.${ext}` : `${nombre}_backup_pdfs.${ext}`;
      descargarBlob(resp.data, finalName);
    } finally {
      setDescargando("");
    }
  }

  const pacientesFiltrados = pacientes.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return false;
    const nombre = String(p.nombre || "").toLowerCase();
    const dni = String(p.dni || "").toLowerCase();
    return nombre.includes(q) || dni.includes(q);
  });

  const pacienteSeleccionado = pacientes.find((p) => String(p.id) === String(pacienteId));
  const sugerencias = pacientesFiltrados.slice(0, 8);

  async function exportarMasivo() {
    setDescargando("zip");
    try {
      const params = new URLSearchParams({ format: formatMasivo });
      if (institucionMasiva) params.set("institucion", institucionMasiva);
      const resp = await api.get(`/backup-pacientes/todos/zip?${params.toString()}`, { responseType: "blob" });
      const fecha = new Date().toISOString().slice(0, 10);
      descargarBlob(resp.data, `backup_pacientes_${fecha}.zip`);
    } finally {
      setDescargando("");
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Backup de pacientes</h1>
          <p className="page-subtitle">Respaldo por paciente (Excel/PDF) y backup masivo en ZIP</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Exportar por paciente</h3>
        {cargando ? (
          <div className="loading">Cargando pacientes...</div>
        ) : (
          <>
            <div className="form-group" style={{ maxWidth: 460 }}>
              <label>Buscar paciente (nombre o DNI)</label>
              <input
                type="text"
                placeholder="Ej: Maria o 0801..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
              />
            </div>
            {pacienteId && (
              <p style={{ marginTop: 0, color: "#1e293b", fontSize: 13 }}>
                Paciente seleccionado: <strong>{pacienteSeleccionado?.nombre || ""}</strong>
              </p>
            )}
            {busqueda.trim().length >= 2 && pacientesFiltrados.length === 0 && (
              <p style={{ color: "#b91c1c", marginTop: 0 }}>No se encontraron pacientes con ese criterio.</p>
            )}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <div
                style={{
                  maxWidth: 560,
                  marginBottom: 12,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {sugerencias.map((p) => {
                    const active = String(p.id) === String(pacienteId);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPacienteId(String(p.id));
                          setBusqueda(p.nombre || "");
                          setMostrarSugerencias(false);
                        }}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          border: "none",
                          borderBottom: "1px solid #f1f5f9",
                          background: active ? "#eef2ff" : "#fff",
                          color: active ? "#1d4ed8" : "#1e293b",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: active ? 600 : 500,
                        }}
                      >
                        {p.nombre} {p.dni ? `(${p.dni})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => exportarPaciente("excel")} disabled={!pacienteId || descargando !== ""}>
                {descargando === "excel" ? "Descargando Excel..." : "Descargar Excel"}
              </button>
              <button className="btn btn-outline" onClick={() => exportarPaciente("pdf")} disabled={!pacienteId || descargando !== ""}>
                {descargando === "pdf" ? "Descargando ZIP..." : "Descargar PDFs (ZIP)"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Exportar todos los pacientes</h3>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: 13 }}>
          Se descargara un archivo ZIP con una carpeta por paciente.
        </p>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Contenido del ZIP</label>
          <select value={formatMasivo} onChange={(e) => setFormatMasivo(e.target.value)}>
            <option value="both">Excel + PDF</option>
            <option value="excel">Solo Excel</option>
            <option value="pdf">Solo PDF</option>
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Institución</label>
          <select value={institucionMasiva} onChange={(e) => setInstitucionMasiva(e.target.value)}>
            <option value="">Todas</option>
            <option value="HMEP">HMEP</option>
            <option value="IHSS">IHSS</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={exportarMasivo} disabled={descargando !== ""}>
          {descargando === "zip" ? "Generando ZIP..." : "Descargar ZIP masivo"}
        </button>
      </div>
    </Layout>
  );
}
