import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const DEPARTAMENTOS_HN = [
  "Atlántida", "Choluteca", "Colón", "Comayagua", "Copán",
  "Cortés", "El Paraíso", "Francisco Morazán", "Gracias a Dios",
  "Intibucá", "Islas de la Bahía", "La Paz", "Lempira",
  "Ocotepeque", "Olancho", "Santa Bárbara", "Valle", "Yoro",
];

const VACÍO = {
  dni: "", nombre: "", fecha_nacimiento: "", sexo: "F",
  departamento: "", municipio: "", procedencia_tipo: "", direccion: "",
  peso: "", talla: "", tipo_diabetes: "Tipo 1", subtipo_monogenica: "",
  institucion: "HMEP", hba1c_previo: "", telefono: "",
  tipo_insulina: "", dosis_por_kg: "", promedio_glucometrias: "",
  edad_debut: "", antecedente_familiar: "",
  nombre_tutor: "", telefono_tutor: "",
};

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return "";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento + "T00:00:00");
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : "";
}

export default function PacienteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [form, setForm]     = useState(VACÍO);
  const [error, setError]   = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (esEdicion) {
      api.get(`/pacientes/${id}`).then((r) => {
        const p = r.data;
        if (p.fecha_nacimiento) {
          p.fecha_nacimiento = p.fecha_nacimiento.split("T")[0];
        }
        setForm({ ...VACÍO, ...p });
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
        await api.put(`/pacientes/${id}`, form);
      } else {
        const { data } = await api.post("/pacientes", form);
        navigate(`/pacientes/${data.id}`);
        return;
      }
      navigate(`/pacientes/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const edadActual = calcularEdad(form.fecha_nacimiento);

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            to={esEdicion ? `/pacientes/${id}` : "/pacientes"}
            className="back-btn"
            title="Volver"
          >
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ margin: 0 }}>{esEdicion ? "Editar Paciente" : "Nuevo Paciente"}</h1>
            <p className="page-subtitle">Registro de datos del paciente con diabetes</p>
          </div>
        </div>
      </div>

      <div className="card form-card">
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>DNI / Expediente</label>
              <input name="dni" placeholder="12345678" value={form.dni} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Nombre completo *</label>
              <input name="nombre" placeholder="Nombre y apellidos" value={form.nombre} onChange={cambiar} required />
            </div>
            <div className="form-group">
              <label>Fecha de nacimiento</label>
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Edad actual</label>
              <input
                type="text"
                readOnly
                value={edadActual !== "" ? `${edadActual} años` : "—"}
                style={{ background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
              />
            </div>
            <div className="form-group">
              <label>Género *</label>
              <select name="sexo" value={form.sexo} onChange={cambiar} required>
                <option value="F">👧 Femenino</option>
                <option value="M">👦 Masculino</option>
              </select>
            </div>
            <div className="form-group">
              <label>Departamento *</label>
              <select name="departamento" value={form.departamento} onChange={cambiar} required>
                <option value="">-- Seleccionar --</option>
                {DEPARTAMENTOS_HN.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Municipio</label>
              <input name="municipio" placeholder="Ej: Tegucigalpa" value={form.municipio} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Edad al debut (años)</label>
              <input
                type="number" min="0" max="30" name="edad_debut"
                placeholder="Ej: 10"
                value={form.edad_debut}
                onChange={cambiar}
              />
            </div>
            <div className="form-group">
              <label>Procedencia</label>
              <select name="procedencia_tipo" value={form.procedencia_tipo} onChange={cambiar}>
                <option value="">-- Sin especificar --</option>
                <option value="Urbana">Urbana</option>
                <option value="Rural">Rural</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Dirección completa</label>
              <input
                name="direccion"
                placeholder="Ej: Col. Peña por bajo, Tegucigalpa, FM"
                value={form.direccion}
                onChange={cambiar}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Antecedente Familiar</label>
              <textarea
                name="antecedente_familiar"
                placeholder="Describe antecedentes familiares relevantes..."
                value={form.antecedente_familiar}
                onChange={cambiar}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Institución *</label>
              <select name="institucion" value={form.institucion} onChange={cambiar} required>
                <option value="HMEP">🏥 HMEP (Hospital María de Especialidades Pediátricas)</option>
                <option value="IHSS">🏦 IHSS (Instituto Hondureño de Seguridad Social)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de Diabetes</label>
              <select name="tipo_diabetes" value={form.tipo_diabetes} onChange={cambiar}>
                <option value="Tipo 1">Tipo 1</option>
                <option value="Tipo 2">Tipo 2</option>
                <option value="Monogénicas">Monogénicas</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            {form.tipo_diabetes === "Monogénicas" && (
              <div className="form-group">
                <label>Subtipo Monogénica</label>
                <select name="subtipo_monogenica" value={form.subtipo_monogenica} onChange={cambiar}>
                  <option value="">-- Seleccionar --</option>
                  <option value="No sindrómica">No sindrómica</option>
                  <option value="Neonatal">Neonatal</option>
                  <option value="Lipodistrofia">Lipodistrofia</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label>HbA1c previo al MCG (%)</label>
              <input type="number" step="0.1" name="hba1c_previo" placeholder="Ej: 8.5" value={form.hba1c_previo} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Tipo de insulina</label>
              <input name="tipo_insulina" placeholder="Ej: Glargina 15ui / Lispro 10ui" value={form.tipo_insulina} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Dosis por Kg</label>
              <input name="dosis_por_kg" placeholder="Ej: 0.97u/kg/día" value={form.dosis_por_kg} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Promedio glucometrías / día</label>
              <input name="promedio_glucometrias" placeholder="Ej: 4 veces al día" value={form.promedio_glucometrias} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input name="telefono" placeholder="9999-9999" value={form.telefono} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Peso (kg)</label>
              <input type="number" step="0.1" name="peso" placeholder="35.5" value={form.peso} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Talla (cm)</label>
              <input type="number" step="0.1" name="talla" placeholder="140" value={form.talla} onChange={cambiar} />
            </div>
          </div>

          {/* Sección Tutor */}
          <div style={{ marginTop: 28, marginBottom: 10 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: 8, margin: 0 }}>
              Datos del Tutor
            </h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre completo del tutor</label>
              <input name="nombre_tutor" placeholder="Nombre y apellidos del tutor" value={form.nombre_tutor} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Teléfono del tutor</label>
              <input name="telefono_tutor" placeholder="9999-9999" value={form.telefono_tutor} onChange={cambiar} />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Registrar paciente"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
