import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import SemaforoISPAD from "../../components/SemaforoISPAD";
import { clasificarISPAD } from "../../utils/ispad";

export default function SubirPDF() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const pacientePreseleccionado = params.get("paciente");

  const [pacientes, setPacientes]   = useState([]);
  const [pacienteId, setPacienteId] = useState(pacientePreseleccionado || "");
  const [archivo, setArchivo]       = useState(null);
  const [arrastrado, setArrastrado] = useState(false);
  const [datos, setDatos]           = useState(null);
  const [form, setForm]             = useState(null);
  const [etapa, setEtapa]           = useState("subir"); // subir | revisar | guardado
  const [error, setError]           = useState("");
  const [subiendo, setSubiendo]     = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const inputRef = useRef();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get("/pacientes").then((r) => setPacientes(r.data));
  }, []);

  function onDragOver(e)  { e.preventDefault(); setArrastrado(true); }
  function onDragLeave()  { setArrastrado(false); }
  function onDrop(e) {
    e.preventDefault();
    setArrastrado(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setArchivo(f);
    else setError("Solo se permiten archivos PDF");
  }

  async function subirPDF() {
    if (!pacienteId) return setError("Selecciona un paciente primero");
    if (!archivo)    return setError("Adjunta un archivo PDF");

    setError("");
    setSubiendo(true);
    const fd = new FormData();
    fd.append("pdf", archivo);

    try {
      const { data } = await api.post(`/pdf/upload/${pacienteId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDatos(data);
      const d = data.datos;
      setForm({
        paciente_id:          pacienteId,
        fecha:                new Date().toISOString().split("T")[0],
        fecha_colocacion:     "",
        tir:                  d.tir   ?? "",
        tar:                  d.tar   ?? "",
        tar_muy_alto:         d.tarMuyAlto   ?? "",
        tar_alto:             d.tarAlto      ?? "",
        tbr:                  d.tbr   ?? "",
        tbr_bajo:             d.tbrBajo      ?? "",
        tbr_muy_bajo:         d.tbrMuyBajo   ?? "",
        gmi:                  d.gmi   ?? "",
        cv:                   d.cv    ?? "",
        tiempo_activo:        d.tiempoActivo     ?? "",
        glucosa_promedio:     d.glucosaPromedio  ?? "",
        gri:                  d.gri  ?? "",
        eventos_hipoglucemia: d.eventosHipoglucemia ?? "",
        duracion_hipoglucemia: d.duracionHipoglucemia ?? "",
        dosis_insulina_post:  "",
        se_modifico_dosis:    false,
        dosis_modificada:     "",
        hba1c_post_mcg:       "",
        limitacion_internet:  false,
        limitacion_alergias:  false,
        limitacion_economica: false,
        calidad_vida:         "",
        comentarios:          "",
        archivo_pdf:          data.archivo,
      });
      setEtapa("revisar");
    } catch (err) {
      setError(err.response?.data?.error || "Error al procesar el PDF");
    } finally {
      setSubiendo(false);
    }
  }

  function cambiarForm(e) {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function confirmar() {
    setGuardando(true);
    try {
      await api.post("/pdf/confirmar", form);
      setEtapa("guardado");
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar análisis");
    } finally {
      setGuardando(false);
    }
  }

  const clasificacion = form
    ? clasificarISPAD(Number(form.tir), Number(form.tar), Number(form.tbr), form.gmi ? Number(form.gmi) : null)
    : null;

  // ── Paso final ───────────────────────────────────────────────────────────────
  if (etapa === "guardado") {
    return (
      <Layout>
        <div className="exito-container">
          <span className="exito-icon">✅</span>
          <h2>¡Análisis guardado exitosamente!</h2>
          <p>Los datos del reporte Syai X1 han sido registrados en el historial del paciente.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <button className="btn btn-primary"   onClick={() => navigate(`/pacientes/${pacienteId}`)}>Ver paciente</button>
            <button className="btn btn-outline"   onClick={() => { setEtapa("subir"); setArchivo(null); setForm(null); setPacienteId(pacientePreseleccionado || ""); }}>Subir otro PDF</button>
            <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>Ir al Dashboard</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Subir Reporte PDF · Syai X1</h1>
          <p className="page-subtitle">Carga el PDF generado por el monitor Syai X1 para extracción automática de datos</p>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {etapa === "subir" && (
        <div className="upload-container">
          <div className="card">
            <div className="form-group">
              <label>Paciente *</label>
              <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required>
                <option value="">-- Seleccionar paciente --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isMobile
                      ? `${p.nombre.length > 22 ? p.nombre.slice(0, 22) + "…" : p.nombre} (${p.edad}a)`
                      : `${p.nombre} (${p.edad} años · ${p.departamento})`}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`drop-zone ${arrastrado ? "arrastrado" : ""} ${archivo ? "con-archivo" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current.click()}
            >
              <input
                ref={inputRef} type="file" accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files[0]) setArchivo(e.target.files[0]); }}
              />
              {archivo ? (
                <>
                  <span className="drop-icon">📄</span>
                  <p className="drop-filename">{archivo.name}</p>
                  <p className="drop-hint">Clic para cambiar</p>
                </>
              ) : (
                <>
                  <span className="drop-icon">⬆️</span>
                  <p className="drop-text">Arrastra el PDF aquí o haz clic para seleccionar</p>
                  <p className="drop-hint">Reporte generado por el monitor Syai X1 · Max 20 MB</p>
                </>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={subirPDF}
                disabled={subiendo || !archivo || !pacienteId}
              >
                {subiendo ? "⏳ Procesando PDF..." : "🔍 Analizar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {etapa === "revisar" && form && (
        <div>
          <div className="revisar-header">
            <div className="card" style={{ flex: 1 }}>
              <h3>📊 Datos Extraídos Automáticamente</h3>
              <p className="text-muted">Revisa y corrige si es necesario antes de guardar</p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha análisis *</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={cambiarForm} required />
                </div>
                <div className="form-group">
                  <label>Fecha colocación MCG</label>
                  <input type="date" name="fecha_colocacion" value={form.fecha_colocacion} onChange={cambiarForm} />
                </div>
                <div className="form-group">
                  <label>TIR – Tiempo en Rango (%)</label>
                  <input type="number" step="0.1" name="tir" value={form.tir} onChange={cambiarForm} min={0} max={100} placeholder="68.6" />
                </div>
                <div className="form-group">
                  <label>TAR Muy alto &gt;250 (%)</label>
                  <input type="number" step="0.1" name="tar_muy_alto" value={form.tar_muy_alto} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TAR Alto 181-250 (%)</label>
                  <input type="number" step="0.1" name="tar_alto" value={form.tar_alto} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TAR Total (%)</label>
                  <input type="number" step="0.1" name="tar" value={form.tar} onChange={cambiarForm} min={0} max={100} placeholder="30.4" />
                </div>
                <div className="form-group">
                  <label>TBR Bajo 54-59 (%)</label>
                  <input type="number" step="0.1" name="tbr_bajo" value={form.tbr_bajo} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TBR Muy bajo &lt;54 (%)</label>
                  <input type="number" step="0.1" name="tbr_muy_bajo" value={form.tbr_muy_bajo} onChange={cambiarForm} min={0} max={100} />
                </div>
                <div className="form-group">
                  <label>TBR Total (%)</label>
                  <input type="number" step="0.1" name="tbr" value={form.tbr} onChange={cambiarForm} min={0} max={100} placeholder="1.0" />
                </div>
                <div className="form-group">
                  <label>GMI (%)</label>
                  <input type="number" step="0.01" name="gmi" value={form.gmi} onChange={cambiarForm} placeholder="7.0" />
                </div>
                <div className="form-group">
                  <label>CV – Coeficiente de Variación (%)</label>
                  <input type="number" step="0.1" name="cv" value={form.cv} onChange={cambiarForm} placeholder="39" />
                </div>
                <div className="form-group">
                  <label>Tiempo Activo (%)</label>
                  <input type="number" step="0.1" name="tiempo_activo" value={form.tiempo_activo} onChange={cambiarForm} placeholder="93.5" />
                </div>
                <div className="form-group">
                  <label>Glucosa Promedio (mg/dL)</label>
                  <input type="number" step="0.1" name="glucosa_promedio" value={form.glucosa_promedio} onChange={cambiarForm} placeholder="154" />
                </div>
                <div className="form-group">
                  <label>GRI – Índice de Riesgo</label>
                  <input type="number" step="0.1" name="gri" value={form.gri} onChange={cambiarForm} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Eventos hipoglucemia</label>
                  <input type="number" name="eventos_hipoglucemia" value={form.eventos_hipoglucemia} onChange={cambiarForm} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Duración hipoglucemia (min)</label>
                  <input type="number" name="duracion_hipoglucemia" value={form.duracion_hipoglucemia} onChange={cambiarForm} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Dosis de insulina (durante MCG)</label>
                  <input name="dosis_insulina_post" value={form.dosis_insulina_post} onChange={cambiarForm} placeholder="Ej: Lantus 16ui / Lispro 10-10-11" />
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Seguimiento post-MCG</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Se modificó dosis</label>
                  <input type="checkbox" name="se_modifico_dosis" checked={!!form.se_modifico_dosis} onChange={cambiarForm} style={{ width: "auto" }} />
                </div>
                <div className="form-group">
                  <label>Dosis modificada</label>
                  <input name="dosis_modificada" value={form.dosis_modificada} onChange={cambiarForm} placeholder="Nueva dosis indicada" />
                </div>
                <div className="form-group">
                  <label>HbA1c post MCG (%)</label>
                  <input type="number" step="0.1" name="hba1c_post_mcg" value={form.hba1c_post_mcg} onChange={cambiarForm} placeholder="7.5" />
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Limitaciones para uso de MCG</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label><input type="checkbox" name="limitacion_internet" checked={!!form.limitacion_internet} onChange={cambiarForm} style={{ width: "auto", marginRight: 6 }} />Internet</label>
                </div>
                <div className="form-group">
                  <label><input type="checkbox" name="limitacion_alergias" checked={!!form.limitacion_alergias} onChange={cambiarForm} style={{ width: "auto", marginRight: 6 }} />Alergias</label>
                </div>
                <div className="form-group">
                  <label><input type="checkbox" name="limitacion_economica" checked={!!form.limitacion_economica} onChange={cambiarForm} style={{ width: "auto", marginRight: 6 }} />Económicas</label>
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Calidad de vida (valoración del MCG)</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Valoración</label>
                  <select name="calidad_vida" value={form.calidad_vida} onChange={cambiarForm}>
                    <option value="">-- Sin registrar --</option>
                    <option value="Buena">Buena</option>
                    <option value="Mala">Mala</option>
                    <option value="Igual">Igual</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Comentarios</label>
                  <textarea name="comentarios" value={form.comentarios} onChange={cambiarForm} rows={3} placeholder="Observaciones adicionales..." style={{ width: "100%", resize: "vertical" }} />
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-outline" onClick={() => setEtapa("subir")}>← Subir otro PDF</button>
                <button className="btn btn-primary" onClick={confirmar} disabled={guardando}>
                  {guardando ? "Guardando..." : "✔ Confirmar y Guardar"}
                </button>
              </div>
            </div>

            {/* Semáforo en tiempo real */}
            <div className="card revisar-semaforo">
              <h3>Clasificación ISPAD en tiempo real</h3>
              <SemaforoISPAD
                tir={Number(form.tir) || 0}
                tar={Number(form.tar) || 0}
                tbr={Number(form.tbr) || 0}
                gmi={form.gmi ? Number(form.gmi) : null}
                clasificacion={clasificacion}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
