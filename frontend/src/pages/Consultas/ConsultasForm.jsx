import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const VACÍO = {
  paciente_id: "", fecha: new Date().toISOString().split("T")[0],
  tipo_consulta: "Presencial",
  peso: "", talla: "", glucosa_ayunas: "", hba1c: "",
  tension_arterial: "", medicamentos: "", observaciones: "",
  plan_tratamiento: "", proxima_cita: "",
};

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
  }

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

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
