import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const MUNICIPIOS_POR_DEPARTAMENTO = {
  "Atlántida":          ["Arizona", "El Porvenir", "Esparta", "Honduras", "Jutiapa", "La Ceiba", "La Masica", "San Francisco", "Tela"],
  "Choluteca":          ["Apacilagua", "Choluteca", "Concepción de María", "Duyure", "El Corpus", "El Triunfo", "Marcovia", "Morolica", "Namasigüe", "Orocuina", "Pespire", "San Antonio de Flores", "San Isidro", "San José", "San Marcos de Colón", "Santa Ana de Yusguare"],
  "Colón":              ["Balfate", "Bonito Oriental", "Iriona", "Limón", "Sabá", "Santa Fe", "Santa Rosa de Aguán", "Sonaguera", "Tocoa", "Trujillo"],
  "Comayagua":          ["Ajuterique", "Comayagua", "El Rosario", "Esquías", "Humuya", "La Libertad", "La Trinidad", "Lamaní", "Las Lajas", "Lejamani", "Meámbar", "Minas de Oro", "Ojos de Agua", "San Jerónimo", "San José de Comayagua", "San José del Potrero", "San Luis", "San Sebastián", "Siguatepeque", "Taulabé", "Villa de San Antonio"],
  "Copán":              ["Cabañas", "Concepción", "Copán Ruinas", "Corquín", "Cucuyagua", "Dulce Nombre", "El Paraíso", "Florida", "La Jigua", "La Unión", "Nueva Arcadia", "San Agustín", "San Antonio", "San Jerónimo", "San José", "San Juan de Opoa", "San Nicolás", "San Pedro", "Santa Rita", "Santa Rosa de Copán", "Trinidad de Copán", "Veracruz"],
  "Cortés":             ["Choloma", "La Lima", "Omoa", "Pimienta", "Potrerillos", "Puerto Cortés", "San Antonio de Cortés", "San Francisco de Yojoa", "San Manuel", "San Pedro Sula", "Santa Cruz de Yojoa", "Villanueva"],
  "El Paraíso":         ["Alauca", "Danlí", "El Paraíso", "Guinope", "Jacaleapa", "Liure", "Morocelí", "Oropolí", "Potrerillos", "San Antonio de Flores", "San Lucas", "San Matías", "Soledad", "Teupasenti", "Texiguat", "Trojes", "Vado Ancho", "Yauyupe", "Yuscarán"],
  "Francisco Morazán":  ["Alubaren", "Cedros", "Curarén", "El Porvenir", "El Rosario", "Guaimaca", "La Libertad", "La Venta", "Lepaterique", "Maraita", "Marale", "Nueva Armenia", "Ojojona", "Orica", "Reitoca", "Sabanagrande", "San Ana", "San Buenaventura", "San Ignacio", "San Juan de Flores", "San Miguelito", "Santa Ana", "Santa Lucía", "Talanga", "Tatumbla", "Tegucigalpa", "Valle de Ángeles", "Vallecillo", "Villa de San Francisco"],
  "Gracias a Dios":     ["Ahuas", "Brus Laguna", "Juan Francisco Bulnes", "Puerto Lempira", "Villeda Morales", "Wampusirpe"],
  "Intibucá":           ["Camasca", "Colomoncagua", "Concepción", "Dolores", "Intibucá", "Jesús de Otoro", "La Esperanza", "Magdalena", "Masaguara", "San Antonio", "San Francisco de Becerra", "San Francisco de Opalaca", "San Isidro", "San Juan", "San Marcos de la Sierra", "San Miguelito", "Santa Lucía", "Yamaranguila"],
  "Islas de la Bahía":  ["Guanaja", "José Santos Guardiola", "Roatán", "Utila"],
  "La Paz":             ["Aguanqueterique", "Cabañas", "Cane", "Chinacla", "Guajiquiro", "La Paz", "Lauterique", "Marcala", "Mercedes de Oriente", "Opatoro", "San Antonio del Norte", "San José", "San Juan", "San Pedro de Tutule", "Santa Ana", "Santa Elena", "Santa María", "Santiago de Puringla", "Yarula"],
  "Lempira":            ["Belén", "Candelaria", "Cololaca", "Erandique", "Gracias", "Gualcince", "Guarita", "La Campa", "La Iguala", "La Unión", "La Virtud", "Las Flores", "Lepaera", "Mapulaca", "Piraera", "San Andrés", "San Francisco", "San Juan Guarita", "San Manuel Colohete", "San Marcos de Caiquín", "San Rafael", "San Sebastián", "Santa Cruz", "Talgua", "Tambla", "Tomalá", "Valladolid", "Virginia"],
  "Ocotepeque":         ["Belén Gualcho", "Concepción", "Dolores Merendón", "Fraternidad", "La Encarnación", "La Labor", "Lucerna", "Mercedes", "Ocotepeque", "San Fernando", "San Francisco del Valle", "San Jorge", "San Marcos", "Santa Fe", "Sensenti", "Sinuapa"],
  "Olancho":            ["Campamento", "Catacamas", "Concordia", "Dulce Nombre de Culmí", "El Rosario", "Esquipulas del Norte", "Gualaco", "Guarizama", "Guata", "Jano", "Juticalpa", "La Unión", "Mangulile", "Manto", "Patuca", "Salamá", "San Esteban", "San Francisco de Becerra", "San Francisco de la Paz", "Santa María del Real", "Silca", "Yocón"],
  "Santa Bárbara":      ["Arada", "Atima", "Azacualpa", "Ceguaca", "Chinda", "Concepción del Norte", "Concepción del Sur", "El Níspero", "Gualala", "Ilama", "Las Vegas", "Macuelizo", "Naranjito", "New Barbadoes", "Petoa", "Protección", "Quimistán", "San Francisco", "San Francisco de Ojuera", "San José de las Colinas", "San Luis", "San Marcos", "San Nicolás", "San Pedro Zacapa", "San Vicente Centenario", "Santa Bárbara", "Santa Rita", "Trinidad"],
  "Valle":              ["Alianza", "Amapala", "Aramecina", "Caridad", "Goascorán", "Langue", "Nacaome", "San Francisco de Coray", "San Lorenzo"],
  "Yoro":               ["Arenal", "El Negrito", "El Progreso", "Jocón", "Morazán", "Olanchito", "Santa Rita", "Sulaco", "Victoria", "Yorito", "Yoro"],
};

const DEPARTAMENTOS_HN = Object.keys(MUNICIPIOS_POR_DEPARTAMENTO).sort();

const VACÍO = {
  dni: "", nombre: "", fecha_nacimiento: "", sexo: "F",
  departamento: "", municipio: "", procedencia_tipo: "", direccion: "",
  peso: "", talla: "", tipo_diabetes: "Tipo 1", subtipo_monogenica: "",
  institucion: "HMEP", hba1c_previo: "", telefono: "",
  tipo_insulina: "", dosis_insulina_prolongada: "", tipo_insulina_2: "", dosis_insulina_corta: "", anticuerpos: "", dosis_por_kg: "", promedio_glucometrias: "",
  edad_debut: "", antecedente_familiar: "",
  nombre_tutor: "", telefono_tutor: "",
  con_monitor: false,
};

function SeccionTitulo({ children }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 10 }}>
      <h3 style={{
        fontSize: "0.85rem", fontWeight: 700, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.08em",
        borderBottom: "1px solid #e2e8f0", paddingBottom: 8, margin: 0,
      }}>
        {children}
      </h3>
    </div>
  );
}

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
    const { name, value, type, checked } = e.target;
    if (name === "departamento") {
      setForm({ ...form, departamento: value, municipio: "" });
    } else {
      setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    }
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

          {/* ── Sección 1: Datos Personales ── */}
          <SeccionTitulo>Datos del Paciente</SeccionTitulo>
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
              <label>Teléfono</label>
              <input name="telefono" placeholder="9999-9999" value={form.telefono} onChange={cambiar} />
            </div>
          </div>

          {/* ── Sección 2: Ubicación y Procedencia ── */}
          <SeccionTitulo>Ubicación y Procedencia</SeccionTitulo>
          <div className="form-grid">
            {/* Departamento + Municipio: siempre en pareja, 2 col → 1 col en móvil */}
            <div style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}
              className="depto-muni-grid"
            >
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
                <select name="municipio" value={form.municipio} onChange={cambiar} disabled={!form.departamento}>
                  <option value="">{form.departamento ? "-- Seleccionar --" : "-- Seleccione departamento primero --"}</option>
                  {(MUNICIPIOS_POR_DEPARTAMENTO[form.departamento] || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
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
          </div>

          {/* ── Sección 3: Datos Clínicos ── */}
          <SeccionTitulo>Datos Clínicos</SeccionTitulo>
          <div className="form-grid">
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
              <label>Edad al debut (años)</label>
              <input
                type="number" min="0" max="30" name="edad_debut"
                placeholder="Ej: 10"
                value={form.edad_debut}
                onChange={cambiar}
              />
            </div>
            <div className="form-group">
              <label>HbA1c previo al MCG (%)</label>
              <input type="number" step="0.1" name="hba1c_previo" placeholder="Ej: 8.5" value={form.hba1c_previo} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Peso (kg)</label>
              <input type="number" step="0.1" name="peso" placeholder="35.5" value={form.peso} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Talla (cm)</label>
              <input type="number" step="0.1" name="talla" placeholder="140" value={form.talla} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Dosis por Kg</label>
              <input name="dosis_por_kg" placeholder="Ej: 0.97u/kg/día" value={form.dosis_por_kg} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Promedio glucometrías / día</label>
              <input name="promedio_glucometrias" placeholder="Ej: 4 veces al día" value={form.promedio_glucometrias} onChange={cambiar} />
            </div>
            <div className="form-group" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <label style={{ marginBottom: 10 }}>Monitor de Glucosa (MCG)</label>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 12,
                cursor: "pointer", userSelect: "none",
              }}>
                <span style={{
                  position: "relative", display: "inline-block",
                  width: 44, height: 24, flexShrink: 0,
                }}>
                  <input
                    type="checkbox" name="con_monitor"
                    checked={!!form.con_monitor}
                    onChange={cambiar}
                    style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                  />
                  <span style={{
                    position: "absolute", inset: 0, borderRadius: 24,
                    background: form.con_monitor ? "#6366f1" : "#cbd5e1",
                    transition: "background 0.2s",
                  }} />
                  <span style={{
                    position: "absolute", top: 3, left: form.con_monitor ? 23 : 3,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transition: "left 0.2s",
                  }} />
                </span>
                <span style={{
                  fontWeight: 600, fontSize: "0.9rem",
                  color: form.con_monitor ? "#4f46e5" : "#94a3b8",
                }}>
                  {form.con_monitor ? "Con monitor MCG" : "Sin monitor MCG"}
                </span>
              </label>
            </div>
          </div>

          {/* ── Sección 4: Antecedentes ── */}
          <SeccionTitulo>Antecedentes</SeccionTitulo>
          <div className="form-grid">
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
          </div>

          {/* ── Sección 5: Tipos de Insulina Histórico ── */}
          <SeccionTitulo>Tipos de Insulina Histórico</SeccionTitulo>
          <div className="form-grid form-grid-2col">
            <div className="form-group">
              <label>Insulina acción prolongada</label>
              <input name="tipo_insulina" placeholder="Ej: Glargina / NPH" value={form.tipo_insulina} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Dosis acción prolongada</label>
              <input name="dosis_insulina_prolongada" placeholder="Ej: 15 UI / 12 UI" value={form.dosis_insulina_prolongada} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Insulina acción corta</label>
              <input name="tipo_insulina_2" placeholder="Ej: Lispro / Regular" value={form.tipo_insulina_2} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Dosis acción corta</label>
              <input name="dosis_insulina_corta" placeholder="Ej: 10 UI / 8 UI" value={form.dosis_insulina_corta} onChange={cambiar} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Anticuerpos para diabetes</label>
              <input name="anticuerpos" placeholder="Ej: Anti-GAD positivo, IA-2 positivo, ZnT8 negativo" value={form.anticuerpos} onChange={cambiar} />
            </div>
          </div>

          {/* ── Sección 6: Datos del Tutor ── */}
          <SeccionTitulo>Datos del Tutor</SeccionTitulo>
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
