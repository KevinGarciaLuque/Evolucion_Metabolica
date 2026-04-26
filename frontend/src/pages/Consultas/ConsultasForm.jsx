import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import { calcularZScores, calcularEdadMeses } from "../../utils/who_zscore";

const VACÍO = {
  paciente_id: "", fecha: new Date().toISOString().split("T")[0],
  tipo_consulta: "Presencial",
  peso: "", talla: "", glucosa_ayunas: "", hba1c: "",
  tension_arterial: "", medicamentos: "", observaciones: "",
  plan_tratamiento: "", proxima_cita: "",
  tanner_mama: "", tanner_genitales: "", tanner_vello_pubico: "", tanner_observaciones: "",
};

const TANNER_OPCIONES = [
  { value: "1", label: "Estadio 1 — Prepuberal" },
  { value: "2", label: "Estadio 2 — Inicio de pubertad" },
  { value: "3", label: "Estadio 3 — Pubertad media" },
  { value: "4", label: "Estadio 4 — Pubertad avanzada" },
  { value: "5", label: "Estadio 5 — Desarrollo adulto" },
];

export default function ConsultasForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const esEdicion = Boolean(id);

  const [form, setForm] = useState({
    ...VACÍO,
    paciente_id: searchParams.get("paciente_id") || "",
  });
  const [pacientes, setPacientes] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Autocomplete paciente
  const [buscarPac, setBuscarPac] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [pacienteNombre, setPacienteNombre] = useState("");
  const refSug = useRef(null);

  // Curva de crecimiento
  const [calcularCrecimiento, setCalcularCrecimiento] = useState(false);
  const [pacienteFechaNac, setPacienteFechaNac] = useState(null);
  const [pacienteSexo, setPacienteSexo] = useState("M");
  const [pcCm, setPcCm] = useState("");
  const [notasCrec, setNotasCrec] = useState("");

  useEffect(() => {
    api.get("/pacientes").then((r) => setPacientes(r.data));
  }, []);

  // Cuando carga en edición, buscar el nombre del paciente seleccionado
  useEffect(() => {
    if (esEdicion) {
      api.get(`/consultas/${id}`).then((r) => {
        const d = r.data;
        if (d.fecha)        d.fecha        = d.fecha.split("T")[0];
        if (d.proxima_cita) d.proxima_cita = d.proxima_cita.split("T")[0];
        setForm(d);
        if (d.paciente_nombre) setPacienteNombre(d.paciente_nombre);
        if (d.paciente_nombre) setBuscarPac(d.paciente_nombre);
      });
    }
  }, [id, esEdicion]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handler(e) {
      if (refSug.current && !refSug.current.contains(e.target)) setSugerencias([]);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function filtrarPacientes(texto) {
    setBuscarPac(texto);
    setPacienteNombre("");
    setForm((f) => ({ ...f, paciente_id: "" }));
    if (!texto.trim()) { setSugerencias([]); return; }
    const lower = texto.toLowerCase();
    setSugerencias(
      pacientes.filter((p) => p.nombre.toLowerCase().includes(lower)).slice(0, 8)
    );
  }

  function seleccionarPaciente(p) {
    setForm((f) => ({ ...f, paciente_id: p.id }));
    setPacienteNombre(p.nombre);
    setBuscarPac(p.nombre);
    setSugerencias([]);
    setPacienteFechaNac(p.fecha_nacimiento || null);
    setPacienteSexo(p.sexo || "M");
  }

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Z-scores preview en tiempo real cuando el switch está activo
  const zPrev = (() => {
    if (!calcularCrecimiento || (!form.peso && !form.talla && !pcCm)) return null;
    const edadMeses = calcularEdadMeses(pacienteFechaNac, form.fecha);
    return calcularZScores(
      { peso_kg: form.peso || null, talla_cm: form.talla || null, pc_cm: pcCm || null, edad_meses: edadMeses },
      pacienteSexo
    );
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.paciente_id) { setError("Debes seleccionar un paciente de la lista"); return; }
    setError("");
    setGuardando(true);
    try {
      if (esEdicion) {
        await api.put(`/consultas/${id}`, form);
      } else {
        await api.post("/consultas", form);
      }
      // Guardar medición de crecimiento si el switch está activo
      if (calcularCrecimiento && form.paciente_id && !esEdicion) {
        try {
          const edadMeses = calcularEdadMeses(pacienteFechaNac, form.fecha);
          const zs = calcularZScores(
            { peso_kg: form.peso || null, talla_cm: form.talla || null, pc_cm: pcCm || null, edad_meses: edadMeses },
            pacienteSexo
          );
          await api.post(`/pacientes/${form.paciente_id}/crecimiento`, {
            fecha: form.fecha,
            peso_kg: form.peso || null,
            talla_cm: form.talla || null,
            pc_cm: pcCm || null,
            edad_meses: edadMeses,
            observaciones: notasCrec || null,
            ...zs,
          });
        } catch {
          // No bloquear el flujo principal si falla el registro de crecimiento
          console.warn("No se pudo guardar el registro de crecimiento");
        }
      }
      navigate("/consultas");
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/consultas")}
            title="Volver a Consultas"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1>{esEdicion ? "Editar Consulta" : "Nueva Consulta"}</h1>
            <p className="page-subtitle">Registro de consulta o seguimiento</p>
          </div>
        </div>
      </div>

      <div className="card form-card">
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* Fila 1 */}
            <div className="form-group" style={{ position: "relative" }} ref={refSug}>
              <label>Paciente *</label>
              <input
                type="text"
                placeholder="Buscar paciente por nombre..."
                value={buscarPac}
                onChange={(e) => filtrarPacientes(e.target.value)}
                autoComplete="off"
                style={{ borderColor: form.paciente_id ? "var(--green, #22c55e)" : undefined }}
              />
              {form.paciente_id && pacienteNombre && (
                <span style={{ fontSize: "0.75rem", color: "#22c55e", marginTop: "3px", display: "block" }}>
                  ✓ {pacienteNombre}
                </span>
              )}
              {sugerencias.length > 0 && (
                <ul style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: "#fff", border: "1px solid var(--gray-200)",
                  borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  listStyle: "none", margin: 0, padding: "4px 0", maxHeight: "220px", overflowY: "auto",
                }}>
                  {sugerencias.map((p) => (
                    <li
                      key={p.id}
                      onMouseDown={() => seleccionarPaciente(p)}
                      style={{
                        padding: "8px 14px", cursor: "pointer", fontSize: "0.9rem",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                      onMouseLeave={(e) => e.currentTarget.style.background = ""}
                    >
                      <span>{p.nombre}</span>
                      {p.dni && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{p.dni}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group">
              <label>Fecha de consulta *</label>
              <input type="date" name="fecha" value={form.fecha} onChange={cambiar} required />
            </div>

            <div className="form-group">
              <label>Tipo de consulta</label>
              <select name="tipo_consulta" value={form.tipo_consulta} onChange={cambiar}>
                <option value="Presencial">Presencial</option>
                <option value="Telemedicina">Telemedicina</option>
                <option value="Control">Control</option>
                <option value="Urgencia">Urgencia</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Fila 2 — Signos vitales / medidas */}
            <div className="form-group">
              <label>Peso (kg)</label>
              <input type="number" step="0.1" min="0" name="peso" placeholder="Ej: 35.5" value={form.peso} onChange={cambiar} />
            </div>

            <div className="form-group">
              <label>Talla (cm)</label>
              <input type="number" step="0.1" min="0" name="talla" placeholder="Ej: 140.0" value={form.talla} onChange={cambiar} />
            </div>

            <div className="form-group">
              <label>Glucosa en ayunas (mg/dL)</label>
              <input type="number" step="0.1" min="0" name="glucosa_ayunas" placeholder="Ej: 120" value={form.glucosa_ayunas} onChange={cambiar} />
            </div>

            <div className="form-group">
              <label>HbA1c (%)</label>
              <input type="number" step="0.01" min="0" max="20" name="hba1c" placeholder="Ej: 7.5" value={form.hba1c} onChange={cambiar} />
            </div>

            <div className="form-group">
              <label>Tensión arterial</label>
              <input name="tension_arterial" placeholder="Ej: 110/70 mmHg" value={form.tension_arterial} onChange={cambiar} />
            </div>

            <div className="form-group">
              <label>Próxima cita</label>
              <input type="date" name="proxima_cita" value={form.proxima_cita} onChange={cambiar} />
            </div>

            {/* ── Estadios de Tanner ────────────────────────────────── */}
            {form.paciente_id && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{
                  background: "#faf5ff",
                  border: "1.5px solid #e9d5ff",
                  borderRadius: 12, padding: "14px 18px",
                }}>
                  {/* Encabezado */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: "1rem" }}>🔬</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.92rem" }}>
                        Estadios de Tanner
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 1 }}>
                        Clasificación del desarrollo puberal&nbsp;
                        <span style={{
                          background: pacienteSexo === "F" ? "#fce7f3" : "#dbeafe",
                          color: pacienteSexo === "F" ? "#9d174d" : "#1e40af",
                          borderRadius: 6, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700,
                        }}>
                          {pacienteSexo === "F" ? "♀ Niña" : "♂ Niño"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>

                    {/* Campo específico por sexo */}
                    {pacienteSexo === "F" ? (
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                          MAMA (M) — DESARROLLO MAMARIO
                        </label>
                        <select
                          name="tanner_mama"
                          value={form.tanner_mama}
                          onChange={cambiar}
                          style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #e9d5ff", borderRadius: 8, fontSize: "0.88rem", background: "#fff" }}
                        >
                          <option value="">— Sin registro —</option>
                          {TANNER_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                          GENITALES (G) — DESARROLLO GENITAL
                        </label>
                        <select
                          name="tanner_genitales"
                          value={form.tanner_genitales}
                          onChange={cambiar}
                          style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: "0.88rem", background: "#fff" }}
                        >
                          <option value="">— Sin registro —</option>
                          {TANNER_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Vello púbico — ambos sexos */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                        VELLO PÚBICO (PH)
                      </label>
                      <select
                        name="tanner_vello_pubico"
                        value={form.tanner_vello_pubico}
                        onChange={cambiar}
                        style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: `1.5px solid ${pacienteSexo === "F" ? "#e9d5ff" : "#bfdbfe"}`, borderRadius: 8, fontSize: "0.88rem", background: "#fff" }}
                      >
                        <option value="">— Sin registro —</option>
                        {TANNER_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {/* Campo de observaciones Tanner */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                        OBSERVACIONES
                      </label>
                      <textarea
                        name="tanner_observaciones"
                        value={form.tanner_observaciones}
                        onChange={cambiar}
                        rows={2}
                        placeholder="Notas sobre el desarrollo puberal, hallazgos relevantes..."
                        style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: `1.5px solid ${pacienteSexo === "F" ? "#e9d5ff" : "#bfdbfe"}`, borderRadius: 8, fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit" }}
                      />
                    </div>

                    {/* Resumen visual si hay estadios registrados */}
                    {((pacienteSexo === "F" ? form.tanner_mama : form.tanner_genitales) || form.tanner_vello_pubico) && (
                      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                        {pacienteSexo === "F" && form.tanner_mama && (
                          <div style={{ background: "#fff", border: "1.5px solid #e9d5ff", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Mama</span>
                            <span style={{ fontWeight: 700, color: "#9333ea", fontSize: "1.1rem" }}>M{form.tanner_mama}</span>
                          </div>
                        )}
                        {pacienteSexo !== "F" && form.tanner_genitales && (
                          <div style={{ background: "#fff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Genitales</span>
                            <span style={{ fontWeight: 700, color: "#2563eb", fontSize: "1.1rem" }}>G{form.tanner_genitales}</span>
                          </div>
                        )}
                        {form.tanner_vello_pubico && (
                          <div style={{ background: "#fff", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Vello púbico</span>
                            <span style={{ fontWeight: 700, color: "#374151", fontSize: "1.1rem" }}>PH{form.tanner_vello_pubico}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Switch curva de crecimiento ───────────────────────── */}
            {!esEdicion && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{
                  background: calcularCrecimiento ? "#f0fdf4" : "#f8fafc",
                  border: `1.5px solid ${calcularCrecimiento ? "#16a34a" : "#e2e8f0"}`,
                  borderRadius: 12, padding: "14px 18px", transition: "all 0.2s",
                }}>
                  {/* Toggle header */}
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none" }}>
                    <div
                      onClick={() => setCalcularCrecimiento(v => !v)}
                      style={{
                        position: "relative", width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                        background: calcularCrecimiento ? "#16a34a" : "#cbd5e1",
                        cursor: "pointer", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 3, left: calcularCrecimiento ? 23 : 3,
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s",
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.92rem" }}>
                        📏 Registrar curva de crecimiento OMS
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 1 }}>
                        Guarda automáticamente la medición en el historial de crecimiento del paciente
                      </div>
                    </div>
                  </label>

                  {/* Campos adicionales cuando está activo */}
                  {calcularCrecimiento && (
                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>P. CEFÁLICO (CM)</label>
                        <input
                          type="number" step="0.1" min="0" placeholder="Ej: 43.2"
                          value={pcCm} onChange={e => setPcCm(e.target.value)}
                          style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #d1fae5", borderRadius: 8, fontSize: "0.9rem" }}
                        />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>NOTAS (CURVA DE CRECIMIENTO)</label>
                        <input
                          type="text" placeholder="Observaciones para este registro de crecimiento..."
                          value={notasCrec} onChange={e => setNotasCrec(e.target.value)}
                          style={{ width: "100%", boxSizing: "border-box", padding: "0.6rem 0.8rem", border: "1.5px solid #d1fae5", borderRadius: 8, fontSize: "0.9rem" }}
                        />
                      </div>

                      {/* Preview Z-scores */}
                      {zPrev && Object.keys(zPrev).some(k => k.startsWith("zscore")) && (
                        <div style={{ gridColumn: "1 / -1", background: "#fff", border: "1px solid #d1fae5", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#16a34a", letterSpacing: "0.06em", marginBottom: 8 }}>
                            📊 Z-SCORES OMS (CALCULADOS AUTOMÁTICAMENTE)
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {[
                              { key: "zscore_peso_edad",  label: "Peso/Edad",  est: "estado_peso_edad" },
                              { key: "zscore_talla_edad", label: "Talla/Edad", est: "estado_talla_edad" },
                              { key: "zscore_imc_edad",   label: "IMC/Edad",   est: "estado_imc_edad" },
                              { key: "zscore_pc_edad",    label: "P.C./Edad",  est: "estado_pc_edad" },
                            ].filter(c => zPrev[c.key] != null).map(c => {
                              const z = zPrev[c.key];
                              const est = zPrev[c.est];
                              const col = !est ? "#94a3b8" : est.includes("severa") || est.includes("Obesi") || est.includes("Micro") || est.includes("Macro") ? "#dc2626" : est.includes("oderad") || est.includes("riesgo") || est.includes("baja") || est.includes("Delga") ? "#d97706" : "#16a34a";
                              return (
                                <div key={c.key} style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 12px", border: `1.5px solid ${col}25`, minWidth: 100 }}>
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginBottom: 1 }}>{c.label}</div>
                                  <div style={{ fontSize: "1rem", fontWeight: 700, color: col }}>{z}</div>
                                  {est && <div style={{ fontSize: "0.6rem", color: col, fontWeight: 600, lineHeight: 1.2 }}>{est}</div>}
                                </div>
                              );
                            })}
                            {zPrev.imc && (
                              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 12px", border: "1.5px solid #6366f125", minWidth: 80 }}>
                                <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginBottom: 1 }}>IMC</div>
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#6366f1" }}>{zPrev.imc}</div>
                                <div style={{ fontSize: "0.6rem", color: "#94a3b8" }}>kg/m²</div>
                              </div>
                            )}
                          </div>
                          {!pacienteFechaNac && (
                            <p style={{ margin: "8px 0 0", fontSize: "0.7rem", color: "#f59e0b" }}>
                              ⚠️ El paciente no tiene fecha de nacimiento registrada — la edad en meses no se puede calcular.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Áreas de texto — ancho completo */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Medicamentos / Dosis actuales</label>
              <textarea
                name="medicamentos" rows={3}
                placeholder="Ej: Glargina 14u/noche, Lispro ratio 1:15..."
                value={form.medicamentos} onChange={cambiar}
              />
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Observaciones clínicas</label>
              <textarea
                name="observaciones" rows={4}
                placeholder="Hallazgos, síntomas reportados, evolución del control glucémico..."
                value={form.observaciones} onChange={cambiar}
              />
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Plan de tratamiento</label>
              <textarea
                name="plan_tratamiento" rows={3}
                placeholder="Ajustes de dosis, indicaciones, metas para próxima cita..."
                value={form.plan_tratamiento} onChange={cambiar}
              />
            </div>

          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate("/consultas")}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Registrar entrada"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
