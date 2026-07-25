import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import FlagIcon from "../../components/FlagIcon";
import { getPaciente, createPaciente, updatePaciente, checkCurpPaciente } from "../../api/renacedApi";

const ESTADOS_MX = [
  "AGS","BC","BCS","CAMP","COAH","COL","CHIS","CHIH","CDMX","DGO",
  "GTO","GRO","HGO","JAL","MEX","MICH","MOR","NAY","NL","OAX",
  "PUE","QRO","QROO","SLP","SIN","SON","TAB","TAMPS","TLAX","VER","YUC","ZAC","NE",
];

const TIPOS_DM = [
  { id: 1, label: "Tipo 1" },
  { id: 2, label: "Tipo 2" },
  { id: 3, label: "Gestacional" },
  { id: 4, label: "Otros" },
];

const TIPOS_DM_OTRAS = [
  { id: 1, label: "MODY" },
  { id: 2, label: "LADA" },
  { id: 3, label: "Pancreatectomía" },
  { id: 4, label: "Fibrosis Quística" },
  { id: 5, label: "Otro" },
];

const DM_COLOR = {
  1: { bg: "#dbeafe", color: "#1e40af" },
  2: { bg: "#fef9c3", color: "#92400e" },
  3: { bg: "#fce7f3", color: "#9d174d" },
  4: { bg: "#f3e8ff", color: "#6b21a8" },
};

const ESTATUS = [
  { id: 1, label: "Activo",   color: "#16a34a" },
  { id: 2, label: "Baja",     color: "#dc2626" },
  { id: 3, label: "Inactivo", color: "#d97706" },
];

const INIT = {
  tipo_diabetes_id: "", tipo_diabetes_otra_id: "",
  expediente: "", iniciales: "",
  nombre: "", ap_pat: "", ap_mat: "",
  sexo: "", fecha_nacimiento: "", curp: "",
  estado_nacimiento: "", pais_nacimiento_id: "",
  nivel_ingresos_id: "", nivel_educativo_id: "",
  estado_residencia: "", colonia: "", calle_num: "",
  codigo_postal: "", telefonos: "", email: "",
  seguro_medico_id: "", establecimiento_cve: "", unidad_servicio_id: "",
  tiene_aviso_privacidad: false, tiene_consentimiento: false,
  estatus_id: 1,
};

function calcIniciales(nombre, apPat, apMat) {
  return [apPat, apMat, nombre]
    .filter(Boolean)
    .map((s) => s.trim()[0]?.toUpperCase() || "")
    .join("");
}

export default function RenacedPacienteForm() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const esEdicion  = Boolean(id);

  const [form, setForm]             = useState(INIT);
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState(null);
  const [inicialesAuto, setInicialesAuto] = useState(true);
  const [curpDuplicado, setCurpDuplicado] = useState(null); // { id, nombre, ap_pat, ap_mat } | null
  const [confirmaCurpDuplicado, setConfirmaCurpDuplicado] = useState(false);
  const [verificandoCurp, setVerificandoCurp] = useState(false);

  useEffect(() => {
    if (!esEdicion) return;
    getPaciente(id).then((r) => {
      const p = r.data;
      setForm({
        tipo_diabetes_id:      p.diagnostico?.tipo_diabetes_id     || "",
        tipo_diabetes_otra_id: p.diagnostico?.tipo_diabetes_otra_id || "",
        expediente:            p.expediente            || "",
        iniciales:             p.iniciales             || "",
        nombre:                p.nombre                || "",
        ap_pat:                p.ap_pat                || "",
        ap_mat:                p.ap_mat                || "",
        sexo:                  p.sexo                  || "",
        fecha_nacimiento:      p.fecha_nacimiento?.slice(0, 10) || "",
        curp:                  p.curp                  || "",
        estado_nacimiento:     p.estado_nacimiento     || "",
        pais_nacimiento_id:    p.pais_nacimiento_id    || "",
        nivel_ingresos_id:     p.nivel_ingresos_id     || "",
        nivel_educativo_id:    p.nivel_educativo_id    || "",
        estado_residencia:     p.estado_residencia     || "",
        colonia:               p.colonia               || "",
        calle_num:             p.calle_num             || "",
        codigo_postal:         p.codigo_postal         || "",
        telefonos:             p.telefonos             || "",
        email:                 p.email                 || "",
        seguro_medico_id:      p.seguro_medico_id      || "",
        establecimiento_cve:   p.establecimiento_cve   || "",
        unidad_servicio_id:    p.unidad_servicio_id    || "",
        tiene_aviso_privacidad: Boolean(p.tiene_aviso_privacidad),
        tiene_consentimiento:   Boolean(p.tiene_consentimiento),
        estatus_id:             p.estatus_id || 1,
      });
      if (p.iniciales) setInicialesAuto(false);
    }).catch(() => setError("No se pudo cargar el paciente"));
  }, [id, esEdicion]);

  function cambiar(e) {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm((f) => {
      const next = { ...f, [name]: val };
      if (inicialesAuto && (name === "nombre" || name === "ap_pat" || name === "ap_mat")) {
        const n  = name === "nombre"  ? val : f.nombre;
        const pp = name === "ap_pat"  ? val : f.ap_pat;
        const pm = name === "ap_mat"  ? val : f.ap_mat;
        next.iniciales = calcIniciales(n, pp, pm);
      }
      if (name === "tipo_diabetes_id" && value !== "4") {
        next.tipo_diabetes_otra_id = "";
      }
      return next;
    });
  }

  function cambiarIniciales(e) {
    setInicialesAuto(false);
    setForm((f) => ({ ...f, iniciales: e.target.value.toUpperCase() }));
  }

  async function verificarCurp() {
    const curp = form.curp.trim();
    setCurpDuplicado(null);
    setConfirmaCurpDuplicado(false);
    if (curp.length < 18) return;
    setVerificandoCurp(true);
    try {
      const { data } = await checkCurpPaciente(curp, esEdicion ? id : null);
      if (data.existe) setCurpDuplicado(data.paciente);
    } catch {
      // si falla la verificación, no bloqueamos el flujo
    } finally {
      setVerificandoCurp(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.tipo_diabetes_id) {
      setError("Selecciona el tipo de diabetes");
      return;
    }
    if (String(form.tipo_diabetes_id) === "4" && !form.tipo_diabetes_otra_id) {
      setError("Selecciona el subtipo de diabetes");
      return;
    }
    if (curpDuplicado && !confirmaCurpDuplicado) {
      setError("Ya existe un paciente con este CURP. Confirma que quieres registrarlo de todas formas, o revisa el expediente existente.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      if (esEdicion) {
        await updatePaciente(id, form);
      } else {
        await createPaciente(form);
      }
      navigate("/renaced/pacientes");
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const Campo = ({ label, name, type = "text", required, children, colSpan }) => (
    <div className="form-group" style={colSpan ? { gridColumn: `span ${colSpan}` } : {}}>
      <label className="form-label">
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children ?? (
        <input type={type} name={name} value={form[name]} onChange={cambiar} required={required} />
      )}
    </div>
  );

  const tipoDM = TIPOS_DM.find((t) => String(t.id) === String(form.tipo_diabetes_id));
  const dmColor = tipoDM ? DM_COLOR[tipoDM.id] : null;

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>{esEdicion ? "Editar Paciente" : "Nuevo Paciente"} — RENACED</h1>
          <p className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FlagIcon codigo="mx" size={13} /> Registro Nacional de Diabetes
          </p>
        </div>
        {tipoDM && (
          <span style={{
            padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700,
            background: dmColor.bg, color: dmColor.color,
          }}>
            {tipoDM.label}
          </span>
        )}
      </div>

      <form onSubmit={guardar}>

        {/* ── Tipo de Diabetes ─────────────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
            Tipo de Diabetes
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            <Campo label="Tipo de Diabetes" name="tipo_diabetes_id" required>
              <select name="tipo_diabetes_id" value={form.tipo_diabetes_id} onChange={cambiar} required>
                <option value="">— Seleccionar —</option>
                {TIPOS_DM.map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </Campo>
            {String(form.tipo_diabetes_id) === "4" && (
              <Campo label="Subtipo" name="tipo_diabetes_otra_id" required>
                <select name="tipo_diabetes_otra_id" value={form.tipo_diabetes_otra_id} onChange={cambiar} required>
                  <option value="">— Seleccionar —</option>
                  {TIPOS_DM_OTRAS.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
        </div>

        {/* ── Ficha de Identificación ──────────────────────────────────────── */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
            Ficha de Identificación
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
            <Campo label="Expediente Interno" name="expediente" />
            <div className="form-group">
              <label className="form-label">
                Iniciales <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(auto)</span>
              </label>
              <input
                type="text"
                name="iniciales"
                value={form.iniciales}
                onChange={cambiarIniciales}
                maxLength={10}
                style={{ textTransform: "uppercase", fontFamily: "monospace" }}
                placeholder="Auto"
              />
            </div>
            <Campo label="Apellido Paterno" name="ap_pat" required />
            <Campo label="Apellido Materno" name="ap_mat" />
            <Campo label="Nombre(s)" name="nombre" required />
            <Campo label="Sexo" name="sexo" required>
              <select name="sexo" value={form.sexo} onChange={cambiar} required>
                <option value="">— Seleccionar —</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </Campo>
            <Campo label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" />
            <Campo label="Estado de Nacimiento" name="estado_nacimiento">
              <select name="estado_nacimiento" value={form.estado_nacimiento} onChange={cambiar}>
                <option value="">— Seleccionar —</option>
                {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Campo>
            <Campo label="CURP" name="curp" colSpan={2}>
              <input
                type="text"
                name="curp"
                value={form.curp}
                onChange={cambiar}
                onBlur={verificarCurp}
                maxLength={18}
                style={{ textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "0.05em" }}
                placeholder="XXXX000000XXXXXXXX"
              />
              {verificandoCurp && (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Verificando…</span>
              )}
            </Campo>
          </div>

          {curpDuplicado && (
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 8,
              background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div>
                ⚠️ Ya existe un paciente con este CURP: <strong>{curpDuplicado.nombre} {curpDuplicado.ap_pat} {curpDuplicado.ap_mat || ""}</strong>.{" "}
                <Link to={`/renaced/pacientes/${curpDuplicado.id}`} target="_blank" style={{ color: "#92400e", textDecoration: "underline" }}>
                  Ver expediente existente
                </Link>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={confirmaCurpDuplicado}
                  onChange={(e) => setConfirmaCurpDuplicado(e.target.checked)}
                />
                Confirmo que es un paciente distinto y quiero registrarlo de todas formas
              </label>
            </div>
          )}
        </div>

        {/* ── Datos Socioeconómicos ────────────────────────────────────────── */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
            Datos Socioeconómicos
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <Campo label="Nivel Educativo" name="nivel_educativo_id">
              <select name="nivel_educativo_id" value={form.nivel_educativo_id} onChange={cambiar}>
                <option value="">— Seleccionar —</option>
                {[
                  [13,"Preescolar"],[2,"Primaria incompleta"],[3,"Primaria completa"],
                  [4,"Secundaria incompleta"],[5,"Secundaria completa"],[6,"Preparatoria"],
                  [7,"Técnica"],[12,"Técnico superior"],[11,"Profesionista"],
                  [8,"Licenciatura"],[9,"Posgrado"],[1,"Sin escolaridad"],[10,"No aplica"],
                ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Campo>
            <Campo label="Nivel de Ingresos" name="nivel_ingresos_id">
              <select name="nivel_ingresos_id" value={form.nivel_ingresos_id} onChange={cambiar}>
                <option value="">— Seleccionar —</option>
                {[
                  [1,"Menos de 1 salario mínimo"],[2,"1 salario mínimo"],
                  [3,"2-3 salarios mínimos"],[4,"4-6 salarios mínimos"],
                  [5,"7-10 salarios mínimos"],[6,"Más de 10 salarios mínimos"],
                  [7,"No especificado"],[8,"No aplica"],[9,"Extranjero"],
                  [10,"Pensionado/Jubilado"],
                ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Campo>
            <Campo label="Institución de Salud" name="seguro_medico_id">
              <select name="seguro_medico_id" value={form.seguro_medico_id} onChange={cambiar}>
                <option value="">— Seleccionar —</option>
                {[
                  [1,"IMSS"],[2,"ISSSTE"],[3,"SSA/INSABI"],[4,"PEMEX"],
                  [5,"SEDENA"],[6,"SEMAR"],[7,"Privado"],[8,"Sin seguro"],
                  [9,"Otro"],[10,"IMSS Bienestar"],
                ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Campo>
          </div>
        </div>

        {/* ── Domicilio ────────────────────────────────────────────────────── */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
            Domicilio
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
            <Campo label="Estado de Residencia" name="estado_residencia">
              <select name="estado_residencia" value={form.estado_residencia} onChange={cambiar}>
                <option value="">— Seleccionar —</option>
                {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Campo>
            <Campo label="Colonia" name="colonia" />
            <Campo label="Calle y Número" name="calle_num" colSpan={2} />
            <Campo label="Código Postal" name="codigo_postal">
              <input
                type="text"
                name="codigo_postal"
                value={form.codigo_postal}
                onChange={cambiar}
                maxLength={5}
                pattern="[0-9]{5}"
              />
            </Campo>
          </div>
        </div>

        {/* ── Contacto y Unidad Médica ─────────────────────────────────────── */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
            Contacto y Unidad Médica
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <Campo label="Teléfono(s)" name="telefonos" />
            <Campo label="Email" name="email" type="email" />
            <Campo label="Clave Establecimiento" name="establecimiento_cve">
              <input
                type="text"
                name="establecimiento_cve"
                value={form.establecimiento_cve}
                onChange={cambiar}
                style={{ fontFamily: "monospace" }}
              />
            </Campo>
          </div>
        </div>

        {/* ── Consentimientos ──────────────────────────────────────────────── */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
            Consentimientos
          </h3>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                name="tiene_aviso_privacidad"
                checked={form.tiene_aviso_privacidad}
                onChange={cambiar}
              />
              <span>Aviso de privacidad firmado</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                name="tiene_consentimiento"
                checked={form.tiene_consentimiento}
                onChange={cambiar}
              />
              <span>Consentimiento informado firmado</span>
            </label>
          </div>
        </div>

        {/* ── Estatus (solo edición) ───────────────────────────────────────── */}
        {esEdicion && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>
              Estatus del Paciente
            </h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {ESTATUS.map(({ id, label, color }) => (
                <label
                  key={id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                    padding: "8px 16px", borderRadius: 8, border: "1.5px solid",
                    borderColor: String(form.estatus_id) === String(id) ? color : "#e2e8f0",
                    background: String(form.estatus_id) === String(id) ? `${color}18` : "#fff",
                    fontWeight: String(form.estatus_id) === String(id) ? 600 : 400,
                    color: String(form.estatus_id) === String(id) ? color : "#64748b",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="estatus_id"
                    value={id}
                    checked={String(form.estatus_id) === String(id)}
                    onChange={cambiar}
                    style={{ accentColor: color }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 8,
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/renaced/pacientes")}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? "Guardando…" : esEdicion ? "Actualizar" : "Registrar Paciente"}
          </button>
        </div>
      </form>
    </RenacedLayout>
  );
}
