import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import Layout from "../../components/Layout";
import api from "../../api/axios";

export default function ImportacionHEU() {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [detalleClinico, setDetalleClinico] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pacientesHEU, setPacientesHEU] = useState([]);
  const [cargandoPacientesHEU, setCargandoPacientesHEU] = useState(false);

  async function cargarPacientesHEU() {
    setCargandoPacientesHEU(true);
    try {
      const { data } = await api.get("/importaciones/heu-pacientes", { timeout: 60000 });
      setPacientesHEU(Array.isArray(data) ? data : []);
    } catch {
      setPacientesHEU([]);
    } finally {
      setCargandoPacientesHEU(false);
    }
  }

  useEffect(() => {
    cargarPacientesHEU();
  }, []);

  async function generarPreview() {
    if (!archivo) {
      setError("Selecciona un archivo XLSX.");
      return;
    }
    setError("");
    setOk("");
    setDetalleClinico(null);
    setCargando(true);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const { data } = await api.post("/importaciones/heu/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });
      const det = await api.get(`/importaciones/heu/${data.batch_id}`, { timeout: 60000 });
      setPreview({ ...data, detalle: det.data });
      setOk("Preview generado correctamente.");
    } catch (e) {
      const backendMsg = typeof e.response?.data === "string" ? e.response.data : e.response?.data?.error;
      setError(backendMsg || e.message || "No se pudo generar el preview.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmarImportacion() {
    if (!preview?.batch_id) return;
    setConfirmando(true);
    setError("");
    setOk("");
    try {
      const { data } = await api.post("/importaciones/heu/confirmar", { batch_id: preview.batch_id }, { timeout: 180000 });
      setOk(
        `Importacion confirmada. Pacientes creados: ${data.pacientesCreados}, actualizados: ${data.pacientesActualizados}, consultas creadas: ${data.consultasCreadas}.`
      );
      const det = await api.get(`/importaciones/heu/${preview.batch_id}`, { timeout: 60000 });
      setPreview((p) => ({ ...p, detalle: det.data }));
      await cargarPacientesHEU();
    } catch (e) {
      const backendMsg = typeof e.response?.data === "string"
        ? e.response.data
        : (e.response?.data?.detalle ? `${e.response?.data?.error || "Error"}: ${e.response.data.detalle}` : e.response?.data?.error);
      setError(backendMsg || e.message || "No se pudo confirmar la importacion.");
    } finally {
      setConfirmando(false);
    }
  }

  async function sincronizarKobo() {
    setSincronizando(true);
    setError("");
    setOk("");
    setDetalleClinico(null);
    try {
      const { data } = await api.post("/importaciones/heu/sync-kobo", {}, { timeout: 240000 });
      if (data.batch_id) {
        const det = await api.get(`/importaciones/heu/${data.batch_id}`, { timeout: 60000 });
        setPreview({
          batch_id: data.batch_id,
          total: data.total,
          nuevos: data.nuevos,
          actualizar: data.actualizar,
          invalidos: data.invalidos,
          detalle: det.data,
        });
      }
      await cargarPacientesHEU();
      setOk(
        `${data.mensaje}. Total: ${data.total || 0}, Pacientes creados: ${data.pacientesCreados || 0}, ` +
        `Pacientes actualizados: ${data.pacientesActualizados || 0}, Consultas creadas: ${data.consultasCreadas || 0}.`
      );
    } catch (e) {
      const backendMsg = typeof e.response?.data === "string"
        ? e.response.data
        : (e.response?.data?.detalle ? `${e.response?.data?.error || "Error"}: ${e.response.data.detalle}` : e.response?.data?.error);
      setError(backendMsg || e.message || "No se pudo sincronizar desde Kobo.");
    } finally {
      setSincronizando(false);
    }
  }

  async function verDetalleClinico(consultaId) {
    if (!consultaId) return;
    setCargandoDetalle(true);
    setError("");
    try {
      const { data } = await api.get(`/importaciones/heu/consulta/${consultaId}/detalle`, { timeout: 60000 });
      setDetalleClinico(data.detalle || null);
      setModalOpen(true);
    } catch (e) {
      const backendMsg = typeof e.response?.data === "string" ? e.response.data : e.response?.data?.error;
      setError(backendMsg || e.message || "No se pudo cargar el detalle clinico.");
    } finally {
      setCargandoDetalle(false);
    }
  }

  function parseMaybeJson(v) {
    if (!v) return {};
    if (typeof v === "object") return v;
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }

  function renderDataSection(title, obj) {
    const entries = Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <h4 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h4>
        {!entries.length ? (
          <p style={{ margin: 0, color: "#64748b" }}>Sin datos en esta seccion.</p>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead><tr><th>Campo</th><th>Valor</th></tr></thead>
              <tbody>
                {entries.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k.replaceAll("_", " ")}</td>
                    <td>{Array.isArray(v) ? v.join(", ") : String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function exportarDetallePDF() {
    if (!detalleClinico) return;

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pW = pdf.internal.pageSize.getWidth();
    const pH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let y = 14;

    const writeLine = (text, opts = {}) => {
      const size = opts.size || 10;
      const bold = !!opts.bold;
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(String(text), pW - margin * 2);
      for (const line of lines) {
        if (y > pH - 12) {
          pdf.addPage();
          y = 14;
        }
        pdf.text(line, margin, y);
        y += size <= 10 ? 5 : 6;
      }
    };

    const toObj = (v) => parseMaybeJson(v);
    const sections = [
      ["Antecedentes", toObj(detalleClinico.antecedentes_json)],
      ["Ginecoobstetricos", toObj(detalleClinico.gineco_json)],
      ["Evaluacion clinica", toObj(detalleClinico.evaluacion_clinica_json)],
      ["Terapia y adherencia", toObj(detalleClinico.terapia_adherencia_json)],
      ["Evaluacion psicosocial", toObj(detalleClinico.evaluacion_psicosocial_json)],
      ["Seguimiento", toObj(detalleClinico.seguimiento_json)],
    ];

    writeLine("Detalle Clinico HEU", { size: 14, bold: true });
    writeLine(`Paciente: ${detalleClinico.paciente_nombre || ""} | DNI: ${detalleClinico.paciente_dni || ""}`);
    writeLine(`Consulta ID: ${detalleClinico.consulta_id || ""} | Fecha: ${detalleClinico.consulta_fecha || ""}`);
    y += 2;

    for (const [title, obj] of sections) {
      writeLine(title, { size: 12, bold: true });
      const entries = Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
      if (!entries.length) {
        writeLine("Sin datos.");
      } else {
        for (const [k, v] of entries) {
          const value = Array.isArray(v) ? v.join(", ") : String(v);
          writeLine(`${k.replaceAll("_", " ")}: ${value}`);
        }
      }
      y += 2;
    }

    const safeNombre = String(detalleClinico.paciente_nombre || "paciente").replace(/[^\w\-]+/g, "_");
    pdf.save(`detalle_clinico_heu_${safeNombre}_${detalleClinico.consulta_id || "consulta"}.pdf`);
  }

  const filas = preview?.detalle?.filas || [];
  const invalidas = filas.filter((f) => f.accion === "invalid");

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Importacion HEU</h1>
          <p className="page-subtitle">Carga Excel de KoboToolbox para adultos HEU con validacion previa</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Paso 1: Cargar archivo</h3>
        <div className="form-group" style={{ maxWidth: 560 }}>
          <label>Archivo XLSX de KoboToolbox</label>
          <input type="file" accept=".xlsx" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={generarPreview} disabled={cargando}>
            {cargando ? "Generando preview..." : "Generar preview"}
          </button>
          <button className="btn btn-outline" onClick={sincronizarKobo} disabled={sincronizando}>
            {sincronizando ? "Sincronizando..." : "Sincronizar desde Kobo"}
          </button>
          {preview?.batch_id && (
            <button className="btn btn-outline" onClick={confirmarImportacion} disabled={confirmando}>
              {confirmando ? "Confirmando..." : "Confirmar importacion"}
            </button>
          )}
        </div>
        {error && <p style={{ color: "#b91c1c", marginTop: 12 }}>{error}</p>}
        {ok && <p style={{ color: "#15803d", marginTop: 12 }}>{ok}</p>}
      </div>

      {preview && (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-card-blue"><div><p className="stat-value">{preview.total}</p><p className="stat-label">Filas leidas</p></div></div>
            <div className="stat-card stat-card-green"><div><p className="stat-value">{preview.nuevos}</p><p className="stat-label">Nuevos pacientes</p></div></div>
            <div className="stat-card stat-card-orange"><div><p className="stat-value">{preview.actualizar}</p><p className="stat-label">Pacientes a actualizar</p></div></div>
            <div className="stat-card stat-card-red"><div><p className="stat-value">{preview.invalidos}</p><p className="stat-label">Filas invalidas</p></div></div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Detalle del preview (Batch #{preview.batch_id})</h3>
            <div className="table-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>DNI</th>
                    <th>Nombre</th>
                    <th>Accion</th>
                    <th>Errores</th>
                    <th>Detalle clinico</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => {
                    const errs = (() => {
                      if (Array.isArray(f.errores_json)) return f.errores_json;
                      if (f.errores_json && typeof f.errores_json === "object") return Object.values(f.errores_json).flat();
                      try {
                        return JSON.parse(f.errores_json || "[]");
                      } catch {
                        return [];
                      }
                    })();
                    return (
                      <tr key={f.id}>
                        <td>{f.fila_numero}</td>
                        <td>{f.dni || "-"}</td>
                        <td>{f.nombre || "-"}</td>
                        <td>
                          <span className={`badge ${
                            f.accion === "create_paciente" ? "badge-ok" :
                            f.accion === "update_paciente" ? "badge-warn" :
                            f.accion === "skip_duplicado" ? "badge-gray" : "badge-bad"
                          }`}>
                            {f.accion === "create_paciente" ? "Crear paciente" :
                              f.accion === "update_paciente" ? "Actualizar paciente" :
                              f.accion === "skip_duplicado" ? "Duplicado (UUID)" : "Invalida"}
                          </span>
                        </td>
                        <td>{errs.length ? errs.join(", ") : "-"}</td>
                        <td>
                          {f.consulta_id_creada ? (
                            <button
                              className="btn btn-outline"
                              style={{ padding: "6px 10px" }}
                              onClick={() => verDetalleClinico(f.consulta_id_creada)}
                              disabled={cargandoDetalle}
                            >
                              {cargandoDetalle ? "Cargando..." : "Ver en modal"}
                            </button>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {filas.length === 0 && (
                    <tr><td colSpan={6} className="empty-cell">Sin detalle disponible</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {!!invalidas.length && (
              <p style={{ marginTop: 12, color: "#b45309", fontSize: 13 }}>
                Hay {invalidas.length} filas invalidas. Esas filas no se importaran al confirmar.
              </p>
            )}
          </div>
        </>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Pacientes HEU importados ({pacientesHEU.length})</h3>
          <button className="btn btn-outline" onClick={cargarPacientesHEU} disabled={cargandoPacientesHEU}>
            {cargandoPacientesHEU ? "Actualizando..." : "Actualizar listado"}
          </button>
        </div>
        {cargandoPacientesHEU ? (
          <p style={{ color: "#64748b", margin: 0 }}>Cargando pacientes HEU...</p>
        ) : pacientesHEU.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>Aun no hay pacientes HEU importados.</p>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Nombre</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Telefono</th>
                  <th>Consultas HEU</th>
                  <th>Ultima consulta</th>
                </tr>
              </thead>
              <tbody>
                {pacientesHEU.map((p) => (
                  <tr key={p.id}>
                    <td>{p.dni || "-"}</td>
                    <td>{p.nombre || "-"}</td>
                    <td>{p.sexo || "-"}</td>
                    <td>{p.edad ?? "-"}</td>
                    <td>{p.telefono || "-"}</td>
                    <td>{p.total_consultas_heu ?? 0}</td>
                    <td>{p.ultima_consulta_heu ? String(p.ultima_consulta_heu).slice(0, 10) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && detalleClinico && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.55)",
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "min(1100px, 96vw)",
              maxHeight: "88vh",
              overflow: "auto",
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Detalle clinico HEU</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={exportarDetallePDF}>Exportar detalle a PDF</button>
                <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cerrar</button>
              </div>
            </div>
            <p style={{ marginTop: 0, color: "#475569" }}>
              Paciente: <strong>{detalleClinico.paciente_nombre}</strong> ({detalleClinico.paciente_dni}) | Consulta #{detalleClinico.consulta_id}
            </p>
            {renderDataSection("Antecedentes", parseMaybeJson(detalleClinico.antecedentes_json))}
            {renderDataSection("Ginecoobstetricos", parseMaybeJson(detalleClinico.gineco_json))}
            {renderDataSection("Evaluacion clinica", parseMaybeJson(detalleClinico.evaluacion_clinica_json))}
            {renderDataSection("Terapia y adherencia", parseMaybeJson(detalleClinico.terapia_adherencia_json))}
            {renderDataSection("Evaluacion psicosocial", parseMaybeJson(detalleClinico.evaluacion_psicosocial_json))}
            {renderDataSection("Seguimiento", parseMaybeJson(detalleClinico.seguimiento_json))}
          </div>
        </div>
      )}
    </Layout>
  );
}



