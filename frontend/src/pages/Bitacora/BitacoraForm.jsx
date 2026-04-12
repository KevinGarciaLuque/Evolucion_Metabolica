import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const VACÍO = {
  paciente_id: "", fecha: new Date().toISOString().split("T")[0],
  tipo_consulta: "Presencial",
  peso: "", talla: "", glucosa_ayunas: "", hba1c: "",
  tension_arterial: "", medicamentos: "", observaciones: "",
  plan_tratamiento: "", proxima_cita: "",
};

export default function BitacoraForm() {
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

  useEffect(() => {
    api.get("/pacientes").then((r) => setPacientes(r.data));
  }, []);

  useEffect(() => {
    if (esEdicion) {
      api.get(`/bitacora/${id}`).then((r) => {
        const d = r.data;
        if (d.fecha)        d.fecha        = d.fecha.split("T")[0];
        if (d.proxima_cita) d.proxima_cita = d.proxima_cita.split("T")[0];
        setForm(d);
      });
    }
  }, [id, esEdicion]);

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (esEdicion) {
        await api.put(`/bitacora/${id}`, form);
        navigate("/bitacora");
      } else {
        await api.post("/bitacora", form);
        navigate("/bitacora");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{esEdicion ? "Editar Entrada" : "Nueva Entrada de Bitácora"}</h1>
          <p className="page-subtitle">Registro de consulta o seguimiento</p>
        </div>
      </div>

      <div className="card form-card">
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* Fila 1 */}
            <div className="form-group">
              <label>Paciente *</label>
              <select name="paciente_id" value={form.paciente_id} onChange={cambiar} required>
                <option value="">-- Seleccionar paciente --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}{p.dni ? ` (${p.dni})` : ""}</option>
                ))}
              </select>
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
            <button type="button" className="btn btn-outline" onClick={() => navigate("/bitacora")}>
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
