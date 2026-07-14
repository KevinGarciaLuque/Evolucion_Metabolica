import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import {
  getPaciente,
  getDiagnosticoClinico, saveDiagnosticoClinico,
  getConsultas, createConsulta,
  getLaboratorios, createLaboratorio,
  getTratamiento, createTratamiento,
  getEvaluaciones, createEvaluacion,
  getEducacion, createEducacion,
  getCatalogosEvaluacion,
  getComorbilidad, saveComorbilidad,
  getPatologia, savePatologia,
  getAntecedentesGO, saveAntecedentesGO,
  getEventos, createEvento, deleteEvento,
  getEstiloVida, createEstiloVida, deleteEstiloVida,
  getToxicomanias, createToxicomanias, deleteToxicomanias,
  getReclasificaciones, createReclasificacion, deleteReclasificacion,
  getEmbarazos, createEmbarazo, deleteEmbarazo,
} from "../../api/renacedApi";

// ── Constantes compartidas ────────────────────────────────────────────────────
const SINON    = ["", "SI", "NO", "SE DESCONOCE"];
const SINON2   = ["", "SI", "NO"];
const POSNEG   = ["", "POS", "NEG"];
const GRADOS   = [{ id: "", label: "—" }, { id: 1, label: "1er grado" }, { id: 2, label: "2do grado" }, { id: 3, label: "Otro" }];

const DX_INIT = {
  fecha_diagnostico: "", fecha_approx: 0, fecha_approx_anio: "", fecha_approx_mes: "",
  peso: "", estatura: "", imc: "", pa_sistolica: "", pa_diastolica: "",
  cetoacidosis: "", cetoacidosis_ph: "", cetoacidosis_bicarbonato: "",
  glucemia_azar: "", hba1c: "", hba1c_fecha: "", peptido_c: "",
  anti_gad: "", anti_gad_valor: "", anti_insulina: "", anti_insulina_valor: "",
  anti_islotes: "", anti_islotes_valor: "", anti_ia2: "", anti_ia2_valor: "",
  anti_zct8: "", anti_zct8_valor: "",
  hospitalizacion: "", hospitalizacion_dias: "",
  terapia_intensiva: "", terapia_intensiva_dias: "",
  antec_dm1: "", antec_dm1_grado: "", antec_dm2: "", antec_dm2_grado: "",
  nacido_por: "", lactancia_materna: "", hipotiroidismo_dx: "",
  terapia_id: "", esquema_insulina_id: "", calculo_dosis_id: "",
  dosis_prescrita: "", dispositivo_id: "", institucion_id: "",
  tipo_mody: "", confirmacion_genetica: "", mutacion: "",
  lada_fecha_insulina: "", lada_fecha_approx: 0,
};

const DM_COLOR = {
  "Tipo 1":      { bg: "#dbeafe", color: "#1e40af" },
  "Tipo 2":      { bg: "#fef9c3", color: "#92400e" },
  "Gestacional": { bg: "#fce7f3", color: "#9d174d" },
  "Otros":       { bg: "#f3e8ff", color: "#6b21a8" },
};

const TABS_CLINICOS = ["Diagnóstico", "Visita", "Laboratorio", "Tratamiento", "Evaluación", "Educación",
  "Comorbilidades", "Patologías", "Ant. G.O.", "Eventos", "Estilo Vida", "Toxicomanías", "Reclasificación", "Embarazo"];

const TAB_GRUPOS_CLIN = [
  { label: "Consulta clínica", tabs: ["Diagnóstico","Visita","Laboratorio","Tratamiento","Evaluación","Educación"] },
  { label: "Antecedentes",     tabs: ["Comorbilidades","Patologías","Ant. G.O.","Eventos","Estilo Vida","Toxicomanías","Reclasificación","Embarazo"] },
];

const SINON_EV = ["", "SI", "NO", "SD"];

const COMORB_TIPOS = {
  retinopatia:    ["No proliferativa","Proliferativa","Macular"],
  nefropatia:     ["Microalbuminuria","Macroalbuminuria","Insuficiencia renal"],
  neuropatia:     ["Periférica","Autonómica"],
  vascular_perif: ["Claudicación","Amputación","Otro"],
  cardiovascular: ["Cardiopatía isquémica","Infarto","ICC","Otro"],
  pie_diabetico:  ["Grado 0","Grado 1","Grado 2","Grado 3"],
};

const SUSTANCIAS_LIST = [
  ["Tabaco","tabaco","cigarros/día"],
  ["Alcohol","alcohol","copas/semana"],
  ["Marihuana","marihuana","veces/semana"],
  ["Cocaína","cocaina","veces/semana"],
  ["Crack","crack","veces/semana"],
  ["Éxtasis","extasis","veces/semana"],
  ["Metanfetamina","meta","veces/semana"],
  ["Inhalantes","inhala","veces/semana"],
  ["Heroína","heroina","veces/semana"],
  ["Alucinógenos","alucin","veces/semana"],
];

// ── Componente Campo reutilizable ─────────────────────────────────────────────
function Campo({ label, children, colSpan, required }) {
  return (
    <div className="form-group" style={colSpan ? { gridColumn: `span ${colSpan}` } : {}}>
      <label className="form-label">
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ── Feedback inline ───────────────────────────────────────────────────────────
function Feedback({ ok, error }) {
  if (ok)    return <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: 12 }}>{ok}</div>;
  if (error) return <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", marginBottom: 12 }}>{error}</div>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RenacedConsultasClinical() {
  const { pacienteId } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab]   = useState("Diagnóstico");
  const [cats, setCats] = useState({ retinopatia: [], nefropatia: [], neuropatia: [], pie_diabetico: [], cardiovascular: [] });

  // ── Estado por sección ────────────────────────────────────────────────────
  const [dx, setDx]       = useState(DX_INIT);
  const [dxOk, setDxOk]   = useState("");
  const [dxErr, setDxErr] = useState("");
  const [dxLoading, setDxLoading] = useState(false);

  const [visita, setVisita]     = useState({ fecha_consulta: "", peso: "", estatura: "", pa_sistolica: "", pa_diastolica: "", cintura: "", cadera: "", percentil: "" });
  const [visitaOk, setVisitaOk] = useState("");
  const [visitaErr, setVisitaErr] = useState("");
  const [visitaLoading, setVisitaLoading] = useState(false);

  const [lab, setLab]     = useState({ fecha_muestra: "", hba1c: "", glucosa_ayuno: "", glucosa_postprandial: "", colesterol_total: "", hdl: "", ldl: "", trigliceridos: "", creatinina: "", tasa_filtracion: "", microalbuminuria: "", tsh: "", c_peptido: "", anti_gad: "", anti_ia2: "" });
  const [labOk, setLabOk] = useState("");
  const [labErr, setLabErr] = useState("");
  const [labLoading, setLabLoading] = useState(false);

  const [trat, setTrat]     = useState({ fecha_inicio: "", terapia_id: "", esquema_insulina_id: "", dispositivo_id: "", insulina_id: "", dosis_unidades: "", antidiabetico_id: "", dosis_mg: "", frecuencia: "" });
  const [tratOk, setTratOk] = useState("");
  const [tratErr, setTratErr] = useState("");
  const [tratLoading, setTratLoading] = useState(false);

  const [eval_, setEval]   = useState({ fecha_evaluacion: "", retinopatia_id: "", nefropatia_id: "", neuropatia_id: "", pie_diabetico_id: "", enf_cardiovascular_id: "", observaciones: "" });
  const [evalOk, setEvalOk] = useState("");
  const [evalErr, setEvalErr] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);

  const [edu, setEdu]     = useState({ fecha: "", tema: "", modalidad: "", duracion_min: "", educador: "", observaciones: "" });
  const [eduOk, setEduOk] = useState("");
  const [eduErr, setEduErr] = useState("");
  const [eduLoading, setEduLoading] = useState(false);

  // ── Comorbilidades ────────────────────────────────────────────────────────
  const COMORB_INIT = { retinopatia:"NO",retinopatia_fecha:"",retinopatia_tipo:"",retinopatia_laser:"",nefropatia:"NO",nefropatia_fecha:"",nefropatia_tipo:"",neuropatia:"NO",neuropatia_fecha:"",neuropatia_tipo:"",neuropatia_auto_tipo:"",vascular_perif:"NO",vascular_perif_fecha:"",vascular_perif_tipo:"",cardiovascular:"NO",cardiovascular_fecha:"",cardiovascular_tipo:"",pie_diabetico:"NO",pie_diabetico_fecha:"",pie_diabetico_tipo:"" };
  const [comorb, setComorb]       = useState(COMORB_INIT);
  const [comorbOk, setComorbOk]   = useState("");
  const [comorbErr, setComorbErr] = useState("");
  const [comorbLoad, setComorbLoad] = useState(false);

  // ── Patologías ────────────────────────────────────────────────────────────
  const PAT_INIT = { hipotiroidismo:"",hipotiroidismo_anio:"",e_celiaca:"",e_celiaca_anio:"",e_addison:"",e_addison_anio:"",vitiligo:"",vitiligo_anio:"",e_graves:"",e_graves_anio:"",hipertension:"",hipertension_anio:"",dislipidemia:"",dislipidemia_anio:"",hiperuricemia:"",hiperuricemia_anio:"",gota:"",gota_anio:"",otras:"" };
  const [pat, setPat]             = useState(PAT_INIT);
  const [patOk, setPatOk]         = useState("");
  const [patErr, setPatErr]       = useState("");
  const [patLoad, setPatLoad]     = useState(false);

  // ── Antecedentes G.O. ─────────────────────────────────────────────────────
  const AGO_INIT = { menarca:"",fum:"",visa:"",mac:"",peso_4000:"",menopausia:"",menopausia_fecha:"",tipo_menopausia:"",trh:"" };
  const [ago, setAgo]             = useState(AGO_INIT);
  const [agoOk, setAgoOk]         = useState("");
  const [agoErr, setAgoErr]       = useState("");
  const [agoLoad, setAgoLoad]     = useState(false);

  // ── Eventos ───────────────────────────────────────────────────────────────
  const EV_INIT = { hipo_leve:"",hipo_leve_num:"",hipo_severa:"",hipo_severa_fecha:"",hipo_severa_causa:"",convulsiones:"",coma:"",perd_conocimiento:"",glucagon_disp:"",glucagon_uso:"",cetoacidosis:"",cetoacidosis_fecha:"",cetoacidosis_causa:"",hospitalizacion:"",hospitalizacion_fecha:"",hospitalizacion_dias:"",hospitalizacion_causa:"" };
  const [ev, setEv]               = useState(EV_INIT);
  const [eventos, setEventos]     = useState([]);
  const [evOk, setEvOk]           = useState("");
  const [evErr, setEvErr]         = useState("");
  const [evLoad, setEvLoad]       = useState(false);

  // ── Estilo de vida ────────────────────────────────────────────────────────
  const EVI_INIT = { fecha_registro:"",plan_alimentacion:"",plan_calorias:"",ejercicio:"",min_ejer_semana:"",conteo_chos:"" };
  const [evi, setEvi]             = useState(EVI_INIT);
  const [eviList, setEviList]     = useState([]);
  const [eviOk, setEviOk]         = useState("");
  const [eviErr, setEviErr]       = useState("");
  const [eviLoad, setEviLoad]     = useState(false);

  // ── Toxicomanías ──────────────────────────────────────────────────────────
  const TOX_INIT = { fecha_registro:"",tabaco:"NO",tabaco_num:"",tabaco_periodo:"",alcohol:"NO",alcohol_num:"",alcohol_periodo:"",marihuana:"NO",marihuana_num:"",marihuana_periodo:"",cocaina:"NO",cocaina_num:"",cocaina_periodo:"",crack:"NO",crack_num:"",crack_periodo:"",extasis:"NO",extasis_num:"",extasis_periodo:"",meta:"NO",meta_num:"",meta_periodo:"",inhala:"NO",inhala_num:"",inhala_periodo:"",heroina:"NO",heroina_num:"",heroina_periodo:"",alucin:"NO",alucin_num:"",alucin_periodo:"" };
  const [tox, setTox]             = useState(TOX_INIT);
  const [toxList, setToxList]     = useState([]);
  const [toxOk, setToxOk]         = useState("");
  const [toxErr, setToxErr]       = useState("");
  const [toxLoad, setToxLoad]     = useState(false);

  // ── Reclasificación ───────────────────────────────────────────────────────
  const RECL_INIT = { glucosa_ayuno:"",fecha_glucosa:"",insulina_ayuno:"",fecha_insulina:"",hba1c:"",fecha_hba1c:"",ctog_ayuno:"",ctog_30min:"",ctog_60min:"",ctog_90min:"",ctog_120min:"",ctog_ayuno_insul:"",ctog_30min_insul:"",ctog_60min_insul:"",ctog_90min_insul:"",ctog_120min_insul:"",fecha_ctog:"",resultado:"SI" };
  const [recl, setRecl]           = useState(RECL_INIT);
  const [reclList, setReclList]   = useState([]);
  const [reclOk, setReclOk]       = useState("");
  const [reclErr, setReclErr]     = useState("");
  const [reclLoad, setReclLoad]   = useState(false);

  // ── Embarazo ──────────────────────────────────────────────────────────────
  const EMB_INIT = { fecha_um:"",fecha_pp:"",tipo_embarazo:"",logro_embarazo:"",estatus_embarazo:"",hba1c_dx:"",fecha_hba1c_dx:"",glucosa_ayunas:"",glucosa_50gr:"",ctog75_ayuno:"",ctog75_1hr:"",ctog75_2hr:"",fecha_ctog75:"",ctog100_ayuno:"",ctog100_1hr:"",ctog100_2hr:"",ctog100_3hr:"",fecha_ctog100:"",hipertension:"",preeclampsia:"",eclampsia:"",hellp:"",oligohidramnios:"",polihidramnios:"",desprendimiento_placenta:"",insuficiencia_placentaria:"",placenta_previa:"",placenta_acreta:"",semanas_gestacion:"",via_parto:"",peso_rn:"",macrosomia:"",hipoglucemia_rn:"",sdr:"",ictericia:"",malformacion:"",malformacion_desc:"",obito:"" };
  const [emb, setEmb]             = useState(EMB_INIT);
  const [embList, setEmbList]     = useState([]);
  const [embOk, setEmbOk]         = useState("");
  const [embErr, setEmbErr]       = useState("");
  const [embLoad, setEmbLoad]     = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    getPaciente(pacienteId)
      .then((r) => setPaciente(r.data))
      .catch(() => setPaciente(null))
      .finally(() => setCargando(false));
    getCatalogosEvaluacion().then((r) => setCats(r.data)).catch(() => {});
  }, [pacienteId]);

  // Cargar datos de diagnóstico al entrar al tab
  useEffect(() => {
    if (tab !== "Diagnóstico") return;
    getDiagnosticoClinico(pacienteId).then((r) => {
      if (!r.data) return;
      const d = r.data;
      setDx({
        fecha_diagnostico:       d.fecha_diagnostico?.slice(0,10) || "",
        fecha_approx:            d.fecha_approx || 0,
        fecha_approx_anio:       d.fecha_approx_anio || "",
        fecha_approx_mes:        d.fecha_approx_mes || "",
        peso:                    d.peso ?? "",
        estatura:                d.estatura ?? "",
        imc:                     d.imc ?? "",
        pa_sistolica:            d.pa_sistolica ?? "",
        pa_diastolica:           d.pa_diastolica ?? "",
        cetoacidosis:            d.cetoacidosis || "",
        cetoacidosis_ph:         d.cetoacidosis_ph ?? "",
        cetoacidosis_bicarbonato: d.cetoacidosis_bicarbonato ?? "",
        glucemia_azar:           d.glucemia_azar ?? "",
        hba1c:                   d.hba1c ?? "",
        hba1c_fecha:             d.hba1c_fecha?.slice(0,10) || "",
        peptido_c:               d.peptido_c ?? "",
        anti_gad:                d.anti_gad || "",
        anti_gad_valor:          d.anti_gad_valor ?? "",
        anti_insulina:           d.anti_insulina || "",
        anti_insulina_valor:     d.anti_insulina_valor ?? "",
        anti_islotes:            d.anti_islotes || "",
        anti_islotes_valor:      d.anti_islotes_valor ?? "",
        anti_ia2:                d.anti_ia2 || "",
        anti_ia2_valor:          d.anti_ia2_valor ?? "",
        anti_zct8:               d.anti_zct8 || "",
        anti_zct8_valor:         d.anti_zct8_valor ?? "",
        hospitalizacion:         d.hospitalizacion || "",
        hospitalizacion_dias:    d.hospitalizacion_dias ?? "",
        terapia_intensiva:       d.terapia_intensiva || "",
        terapia_intensiva_dias:  d.terapia_intensiva_dias ?? "",
        antec_dm1:               d.antec_dm1 || "",
        antec_dm1_grado:         d.antec_dm1_grado ?? "",
        antec_dm2:               d.antec_dm2 || "",
        antec_dm2_grado:         d.antec_dm2_grado ?? "",
        nacido_por:              d.nacido_por || "",
        lactancia_materna:       d.lactancia_materna || "",
        hipotiroidismo_dx:       d.hipotiroidismo_dx || "",
        terapia_id:              d.terapia_id ?? "",
        esquema_insulina_id:     d.esquema_insulina_id ?? "",
        calculo_dosis_id:        d.calculo_dosis_id ?? "",
        dosis_prescrita:         d.dosis_prescrita ?? "",
        dispositivo_id:          d.dispositivo_id ?? "",
        institucion_id:          d.institucion_id ?? "",
        tipo_mody:               d.tipo_mody || "",
        confirmacion_genetica:   d.confirmacion_genetica || "",
        mutacion:                d.mutacion || "",
        lada_fecha_insulina:     d.lada_fecha_insulina?.slice(0,10) || "",
        lada_fecha_approx:       d.lada_fecha_approx || 0,
      });
    }).catch(() => {});
  }, [tab, pacienteId]);

  // ── Handlers cambio de campo ──────────────────────────────────────────────
  function cambiarDx(e) {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? (checked ? 1 : 0) : value;
    setDx((f) => {
      const next = { ...f, [name]: val };
      if (name === "peso" || name === "estatura") {
        const p = parseFloat(name === "peso" ? val : f.peso);
        const h = parseFloat(name === "estatura" ? val : f.estatura);
        if (p > 0 && h > 0) next.imc = (p / (h * h)).toFixed(2);
      }
      if (name === "tipo_diabetes_id" && value !== "4") next.tipo_diabetes_otra_id = "";
      return next;
    });
  }

  function cambiarVisita(e) {
    const { name, value } = e.target;
    setVisita((f) => {
      const next = { ...f, [name]: value };
      if (name === "peso" || name === "estatura") {
        const p = parseFloat(name === "peso" ? value : f.peso);
        const h = parseFloat(name === "estatura" ? value : f.estatura);
        if (p > 0 && h > 0) next.imc = (p / (h * h)).toFixed(2);
      }
      if ((name === "cintura" || name === "cadera") && f.cintura && f.cadera) {
        const cin = parseFloat(name === "cintura" ? value : f.cintura);
        const cad = parseFloat(name === "cadera"  ? value : f.cadera);
        if (cin > 0 && cad > 0) next.indice_cc = (cin / cad).toFixed(2);
      }
      return next;
    });
  }

  // ── Carga de datos al cambiar de tab ─────────────────────────────────────
  useEffect(() => {
    if (tab === "Comorbilidades") {
      getComorbilidad(pacienteId).then(r => { if (r.data) setComorb({ ...COMORB_INIT, ...r.data }); }).catch(()=>{});
    } else if (tab === "Patologías") {
      getPatologia(pacienteId).then(r => { if (r.data) setPat({ ...PAT_INIT, ...r.data }); }).catch(()=>{});
    } else if (tab === "Ant. G.O.") {
      getAntecedentesGO(pacienteId).then(r => { if (r.data) setAgo({ ...AGO_INIT, ...r.data }); }).catch(()=>{});
    } else if (tab === "Eventos") {
      getEventos(pacienteId).then(r => setEventos(r.data)).catch(()=>{});
    } else if (tab === "Estilo Vida") {
      getEstiloVida(pacienteId).then(r => setEviList(r.data)).catch(()=>{});
    } else if (tab === "Toxicomanías") {
      getToxicomanias(pacienteId).then(r => setToxList(r.data)).catch(()=>{});
    } else if (tab === "Reclasificación") {
      getReclasificaciones(pacienteId).then(r => setReclList(r.data)).catch(()=>{});
    } else if (tab === "Embarazo") {
      getEmbarazos(pacienteId).then(r => setEmbList(r.data)).catch(()=>{});
    }
  }, [tab, pacienteId]);

  // ── Guardar diagnóstico ────────────────────────────────────────────────────
  async function guardarDx(e) {
    e.preventDefault();
    setDxLoading(true); setDxOk(""); setDxErr("");
    try {
      await saveDiagnosticoClinico(pacienteId, dx);
      setDxOk("Diagnóstico guardado");
      setTimeout(() => setDxOk(""), 3000);
    } catch (err) {
      setDxErr(err.response?.data?.error || "Error al guardar");
    } finally { setDxLoading(false); }
  }

  // ── Guardar visita ─────────────────────────────────────────────────────────
  async function guardarVisita(e) {
    e.preventDefault();
    setVisitaLoading(true); setVisitaOk(""); setVisitaErr("");
    try {
      await createConsulta(pacienteId, visita);
      setVisitaOk("Visita registrada");
      setVisita({ fecha_consulta: "", peso: "", estatura: "", pa_sistolica: "", pa_diastolica: "", cintura: "", cadera: "", percentil: "" });
      setTimeout(() => setVisitaOk(""), 3000);
    } catch (err) {
      setVisitaErr(err.response?.data?.error || "Error al guardar");
    } finally { setVisitaLoading(false); }
  }

  // ── Guardar laboratorio ────────────────────────────────────────────────────
  async function guardarLab(e) {
    e.preventDefault();
    setLabLoading(true); setLabOk(""); setLabErr("");
    try {
      await createLaboratorio(pacienteId, lab);
      setLabOk("Laboratorio registrado");
      setLab({ fecha_muestra: "", hba1c: "", glucosa_ayuno: "", glucosa_postprandial: "", colesterol_total: "", hdl: "", ldl: "", trigliceridos: "", creatinina: "", tasa_filtracion: "", microalbuminuria: "", tsh: "", c_peptido: "", anti_gad: "", anti_ia2: "" });
      setTimeout(() => setLabOk(""), 3000);
    } catch (err) {
      setLabErr(err.response?.data?.error || "Error al guardar");
    } finally { setLabLoading(false); }
  }

  // ── Guardar tratamiento ────────────────────────────────────────────────────
  async function guardarTrat(e) {
    e.preventDefault();
    setTratLoading(true); setTratOk(""); setTratErr("");
    try {
      const insulinas = trat.insulina_id ? [{ insulina_id: trat.insulina_id, dosis_unidades: trat.dosis_unidades }] : [];
      const orales    = trat.antidiabetico_id ? [{ antidiabetico_id: trat.antidiabetico_id, dosis_mg: trat.dosis_mg, frecuencia: trat.frecuencia }] : [];
      await createTratamiento(pacienteId, { terapia_id: trat.terapia_id || null, esquema_insulina_id: trat.esquema_insulina_id || null, dispositivo_id: trat.dispositivo_id || null, fecha_inicio: trat.fecha_inicio || null, insulinas, orales });
      setTratOk("Tratamiento registrado");
      setTrat({ fecha_inicio: "", terapia_id: "", esquema_insulina_id: "", dispositivo_id: "", insulina_id: "", dosis_unidades: "", antidiabetico_id: "", dosis_mg: "", frecuencia: "" });
      setTimeout(() => setTratOk(""), 3000);
    } catch (err) {
      setTratErr(err.response?.data?.error || "Error al guardar");
    } finally { setTratLoading(false); }
  }

  // ── Guardar evaluación ─────────────────────────────────────────────────────
  async function guardarEval(e) {
    e.preventDefault();
    setEvalLoading(true); setEvalOk(""); setEvalErr("");
    try {
      await createEvaluacion(pacienteId, eval_);
      setEvalOk("Evaluación registrada");
      setEval({ fecha_evaluacion: "", retinopatia_id: "", nefropatia_id: "", neuropatia_id: "", pie_diabetico_id: "", enf_cardiovascular_id: "", observaciones: "" });
      setTimeout(() => setEvalOk(""), 3000);
    } catch (err) {
      setEvalErr(err.response?.data?.error || "Error al guardar");
    } finally { setEvalLoading(false); }
  }

  // ── Guardar educación ──────────────────────────────────────────────────────
  async function guardarEdu(e) {
    e.preventDefault();
    setEduLoading(true); setEduOk(""); setEduErr("");
    try {
      await createEducacion(pacienteId, edu);
      setEduOk("Sesión educativa registrada");
      setEdu({ fecha: "", tema: "", modalidad: "", duracion_min: "", educador: "", observaciones: "" });
      setTimeout(() => setEduOk(""), 3000);
    } catch (err) {
      setEduErr(err.response?.data?.error || "Error al guardar");
    } finally { setEduLoading(false); }
  }

  // ── Guardar comorbilidades ─────────────────────────────────────────────────
  async function guardarComorb(e) {
    e.preventDefault(); setComorbLoad(true); setComorbOk(""); setComorbErr("");
    try { await saveComorbilidad(pacienteId, comorb); setComorbOk("Comorbilidades guardadas"); setTimeout(()=>setComorbOk(""),3000); }
    catch (err) { setComorbErr(err.response?.data?.error||"Error al guardar"); }
    finally { setComorbLoad(false); }
  }

  // ── Guardar patologías ─────────────────────────────────────────────────────
  async function guardarPat(e) {
    e.preventDefault(); setPatLoad(true); setPatOk(""); setPatErr("");
    try { await savePatologia(pacienteId, pat); setPatOk("Patologías guardadas"); setTimeout(()=>setPatOk(""),3000); }
    catch (err) { setPatErr(err.response?.data?.error||"Error al guardar"); }
    finally { setPatLoad(false); }
  }

  // ── Guardar antecedentes G.O. ──────────────────────────────────────────────
  async function guardarAgo(e) {
    e.preventDefault(); setAgoLoad(true); setAgoOk(""); setAgoErr("");
    try { await saveAntecedentesGO(pacienteId, ago); setAgoOk("Antecedentes G.O. guardados"); setTimeout(()=>setAgoOk(""),3000); }
    catch (err) { setAgoErr(err.response?.data?.error||"Error al guardar"); }
    finally { setAgoLoad(false); }
  }

  // ── Crear evento ───────────────────────────────────────────────────────────
  async function guardarEv(e) {
    e.preventDefault(); setEvLoad(true); setEvOk(""); setEvErr("");
    try {
      await createEvento(pacienteId, ev);
      setEvOk("Evento registrado"); setEv(EV_INIT);
      getEventos(pacienteId).then(r=>setEventos(r.data)).catch(()=>{});
      setTimeout(()=>setEvOk(""),3000);
    } catch (err) { setEvErr(err.response?.data?.error||"Error al guardar"); }
    finally { setEvLoad(false); }
  }

  // ── Crear estilo de vida ───────────────────────────────────────────────────
  async function guardarEvi(e) {
    e.preventDefault(); setEviLoad(true); setEviOk(""); setEviErr("");
    try {
      await createEstiloVida(pacienteId, evi);
      setEviOk("Registro guardado"); setEvi(EVI_INIT);
      getEstiloVida(pacienteId).then(r=>setEviList(r.data)).catch(()=>{});
      setTimeout(()=>setEviOk(""),3000);
    } catch (err) { setEviErr(err.response?.data?.error||"Error al guardar"); }
    finally { setEviLoad(false); }
  }

  // ── Crear toxicomanías ─────────────────────────────────────────────────────
  async function guardarTox(e) {
    e.preventDefault(); setToxLoad(true); setToxOk(""); setToxErr("");
    try {
      await createToxicomanias(pacienteId, tox);
      setToxOk("Registro guardado"); setTox(TOX_INIT);
      getToxicomanias(pacienteId).then(r=>setToxList(r.data)).catch(()=>{});
      setTimeout(()=>setToxOk(""),3000);
    } catch (err) { setToxErr(err.response?.data?.error||"Error al guardar"); }
    finally { setToxLoad(false); }
  }

  // ── Crear reclasificación ──────────────────────────────────────────────────
  async function guardarRecl(e) {
    e.preventDefault(); setReclLoad(true); setReclOk(""); setReclErr("");
    try {
      await createReclasificacion(pacienteId, recl);
      setReclOk("Reclasificación guardada"); setRecl(RECL_INIT);
      getReclasificaciones(pacienteId).then(r=>setReclList(r.data)).catch(()=>{});
      setTimeout(()=>setReclOk(""),3000);
    } catch (err) { setReclErr(err.response?.data?.error||"Error al guardar"); }
    finally { setReclLoad(false); }
  }

  // ── Crear embarazo ─────────────────────────────────────────────────────────
  async function guardarEmb(e) {
    e.preventDefault(); setEmbLoad(true); setEmbOk(""); setEmbErr("");
    try {
      await createEmbarazo(pacienteId, emb);
      setEmbOk("Embarazo registrado"); setEmb(EMB_INIT);
      getEmbarazos(pacienteId).then(r=>setEmbList(r.data)).catch(()=>{});
      setTimeout(()=>setEmbOk(""),3000);
    } catch (err) { setEmbErr(err.response?.data?.error||"Error al guardar"); }
    finally { setEmbLoad(false); }
  }

  if (cargando) return <RenacedLayout><div className="loading">Cargando paciente…</div></RenacedLayout>;
  if (!paciente) return <RenacedLayout><div className="card" style={{ color: "#dc2626" }}>Paciente no encontrado</div></RenacedLayout>;

  const p = paciente;
  const nombreCompleto = `${p.nombre} ${p.ap_pat} ${p.ap_mat || ""}`.trim();
  const dmC = DM_COLOR[p.diagnostico?.tipo_diabetes] || { bg: "#f1f5f9", color: "#475569" };
  const tipoDM5 = String(p.diagnostico?.tipo_diabetes_id) === "4";
  const esMODY  = String(p.diagnostico?.tipo_diabetes_otra_id) === "1";
  const esLADA  = String(p.diagnostico?.tipo_diabetes_otra_id) === "2";

  return (
    <RenacedLayout>
      {/* ── Header paciente ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <Link to="/renaced/consultas" style={{ color: "#94a3b8", fontSize: 13 }}>← Consultas</Link>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <Link to={`/renaced/pacientes/${pacienteId}`} style={{ color: "#94a3b8", fontSize: 13 }}>Ver expediente</Link>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", wordBreak: "break-word" }}>{nombreCompleto}</h1>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {p.diagnostico?.tipo_diabetes && (
              <span style={{ background: dmC.bg, color: dmC.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                {p.diagnostico.tipo_diabetes}
              </span>
            )}
            <span style={{ background: p.sexo === "F" ? "#fce7f3" : "#dbeafe", color: p.sexo === "F" ? "#be185d" : "#1d4ed8", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              {p.sexo === "F" ? "Mujer" : "Hombre"}
            </span>
            {p.edad != null && (
              <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 12 }}>
                {p.edad} años
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs responsivos ─────────────────────────────────────────────────── */}
      {/* Móvil: select agrupado */}
      <div className="tab-select-mobile">
        <select
          value={tab}
          onChange={e => setTab(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, background: "#fff", color: "#0f172a", marginBottom: 16 }}
        >
          {TAB_GRUPOS_CLIN.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.tabs.map(t => <option key={t} value={t}>{t}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {/* Desktop: dos filas de tabs con flex-wrap */}
      <div className="tab-grupos-desktop" style={{ marginBottom: 20 }}>
        {TAB_GRUPOS_CLIN.map((grupo) => (
          <div key={grupo.label} style={{ marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", paddingLeft: 4 }}>
              {grupo.label}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "2px solid #e2e8f0" }}>
              {grupo.tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "7px 14px", border: "none", background: "none",
                    borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
                    marginBottom: "-2px",
                    color: tab === t ? "#6366f1" : "#64748b",
                    fontWeight: tab === t ? 700 : 500,
                    fontSize: 13, cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: DIAGNÓSTICO                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Diagnóstico" && (
        <form onSubmit={guardarDx}>
          {/* Fecha */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Fecha de Diagnóstico</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" name="fecha_approx" checked={!!dx.fecha_approx} onChange={cambiarDx} />
              <span style={{ fontWeight: 500 }}>Fecha aproximada</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {!dx.fecha_approx ? (
                <Campo label="Fecha exacta">
                  <input type="date" name="fecha_diagnostico" value={dx.fecha_diagnostico} onChange={cambiarDx} />
                </Campo>
              ) : (
                <>
                  <Campo label="Año">
                    <input type="number" name="fecha_approx_anio" value={dx.fecha_approx_anio} onChange={cambiarDx} min="1900" max={new Date().getFullYear()} placeholder="2010" />
                  </Campo>
                  <Campo label="Mes (opcional)">
                    <select name="fecha_approx_mes" value={dx.fecha_approx_mes} onChange={cambiarDx}>
                      <option value="">— Desconocido —</option>
                      {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m,i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                      ))}
                    </select>
                  </Campo>
                </>
              )}
            </div>
          </div>

          {/* Somatometría */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Somatometría al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
              <Campo label="Peso (kg)"><input type="number" step="0.01" name="peso" value={dx.peso} onChange={cambiarDx} /></Campo>
              <Campo label="Estatura (m)"><input type="number" step="0.01" name="estatura" value={dx.estatura} onChange={cambiarDx} /></Campo>
              <Campo label={<>IMC <span style={{ fontSize: 11, color: "#94a3b8" }}>(auto)</span></>}>
                <input type="number" step="0.01" name="imc" value={dx.imc} onChange={cambiarDx} style={{ background: dx.peso && dx.estatura ? "#f0fdf4" : undefined }} />
              </Campo>
              <Campo label="PA Sistólica (mmHg)"><input type="number" name="pa_sistolica" value={dx.pa_sistolica} onChange={cambiarDx} /></Campo>
              <Campo label="PA Diastólica (mmHg)"><input type="number" name="pa_diastolica" value={dx.pa_diastolica} onChange={cambiarDx} /></Campo>
            </div>
          </div>

          {/* Cetoacidosis */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Cetoacidosis al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              <Campo label="¿Cetoacidosis?" required>
                <select name="cetoacidosis" value={dx.cetoacidosis} onChange={cambiarDx}>
                  {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              {dx.cetoacidosis === "SI" && (
                <>
                  <Campo label="PH al diagnóstico"><input type="number" step="0.01" name="cetoacidosis_ph" value={dx.cetoacidosis_ph} onChange={cambiarDx} /></Campo>
                  <Campo label="Bicarbonato (mEq/L)"><input type="number" step="0.01" name="cetoacidosis_bicarbonato" value={dx.cetoacidosis_bicarbonato} onChange={cambiarDx} /></Campo>
                </>
              )}
            </div>
          </div>

          {/* Laboratorio */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Laboratorio al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              <Campo label="Glucemia al azar (mg/dl)"><input type="number" step="0.01" name="glucemia_azar" value={dx.glucemia_azar} onChange={cambiarDx} /></Campo>
              <Campo label="HbA1c (%)"><input type="number" step="0.01" name="hba1c" value={dx.hba1c} onChange={cambiarDx} /></Campo>
              <Campo label="Fecha HbA1c"><input type="date" name="hba1c_fecha" value={dx.hba1c_fecha} onChange={cambiarDx} /></Campo>
              <Campo label="Péptido C (ng/ml)"><input type="number" step="0.001" name="peptido_c" value={dx.peptido_c} onChange={cambiarDx} /></Campo>
            </div>
          </div>

          {/* Anticuerpos */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Anticuerpos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {[["Anti-GAD","anti_gad","anti_gad_valor"],["Anti-Insulina","anti_insulina","anti_insulina_valor"],["Anti-Islotes","anti_islotes","anti_islotes_valor"],["Anti-IA2","anti_ia2","anti_ia2_valor"],["Anti-ZCT8","anti_zct8","anti_zct8_valor"]].map(([label, campo, campoVal]) => (
                <div key={campo} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flex: "0 0 140px" }}>
                    <label className="form-label">{label}</label>
                    <select name={campo} value={dx[campo]} onChange={cambiarDx}>
                      {POSNEG.map((v) => <option key={v} value={v}>{v || "— S/D —"}</option>)}
                    </select>
                  </div>
                  {dx[campo] === "POS" && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Valor (nmol/L)</label>
                      <input type="number" step="0.01" name={campoVal} value={dx[campoVal]} onChange={cambiarDx} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hospitalización */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Hospitalización al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              <Campo label="¿Hospitalización?" required>
                <select name="hospitalizacion" value={dx.hospitalizacion} onChange={cambiarDx}>
                  {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              {dx.hospitalizacion === "SI" && <Campo label="Días hospitalizados"><input type="number" name="hospitalizacion_dias" value={dx.hospitalizacion_dias} onChange={cambiarDx} min="1" /></Campo>}
              <Campo label="¿Terapia intensiva?" required>
                <select name="terapia_intensiva" value={dx.terapia_intensiva} onChange={cambiarDx}>
                  {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              {dx.terapia_intensiva === "SI" && <Campo label="Días en UCI"><input type="number" name="terapia_intensiva_dias" value={dx.terapia_intensiva_dias} onChange={cambiarDx} min="1" /></Campo>}
            </div>
          </div>

          {/* Antecedentes familiares */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Antecedentes Familiares</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
              {[["Antecedentes DM Tipo 1","antec_dm1","antec_dm1_grado"],["Antecedentes DM Tipo 2","antec_dm2","antec_dm2_grado"]].map(([label, campo, campoGrado]) => (
                <div key={campo} style={{ display: "contents" }}>
                  <Campo label={label} required>
                    <select name={campo} value={dx[campo]} onChange={cambiarDx}>
                      {SINON.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                    </select>
                  </Campo>
                  {dx[campo] === "SI" && (
                    <Campo label="Grado">
                      <select name={campoGrado} value={dx[campoGrado]} onChange={cambiarDx}>
                        {GRADOS.map(({ id, label: l }) => <option key={id} value={id}>{l}</option>)}
                      </select>
                    </Campo>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Antecedentes personales */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Antecedentes Personales</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Nacido por" required>
                <select name="nacido_por" value={dx.nacido_por} onChange={cambiarDx}>
                  <option value="">— Seleccionar —</option>
                  {[["PARTO","Parto"],["CESAREA","Cesárea"],["OTRO","Otro"],["SE_DESCONOCE","Se desconoce"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Lactancia materna" required>
                <select name="lactancia_materna" value={dx.lactancia_materna} onChange={cambiarDx}>
                  {SINON.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
              <Campo label="Hipotiroidismo previo" required>
                <select name="hipotiroidismo_dx" value={dx.hipotiroidismo_dx} onChange={cambiarDx}>
                  {SINON.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          {/* Tratamiento al diagnóstico */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#6366f1" }}>Tratamiento Prescrito al Diagnóstico</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Terapia prescrita" required>
                <select name="terapia_id" value={dx.terapia_id} onChange={cambiarDx}>
                  <option value="">— Seleccionar —</option>
                  {[["1","Dieta y ejercicio"],["2","Oral"],["3","Insulina"],["4","Insulina + Oral"],["5","Otra"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              {(dx.terapia_id === "3" || dx.terapia_id === "4") && (
                <>
                  <Campo label="Esquema de insulina">
                    <select name="esquema_insulina_id" value={dx.esquema_insulina_id} onChange={cambiarDx}>
                      <option value="">— Seleccionar —</option>
                      {[["1","Tradicional (NPH+Rápida)"],["2","Premezcla"],["3","Basal"],["4","Basal-Bolo (MID)"],["5","Microinfusora (ICSI)"],["6","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Cálculo de dosis">
                    <select name="calculo_dosis_id" value={dx.calculo_dosis_id} onChange={cambiarDx}>
                      <option value="">— Seleccionar —</option>
                      {[["1","Conteo CHOs+factor"],["2","Por equivalentes"],["3","Dosis fijas"],["4","Glucosa preprandial"],["5","Por intuición"],["6","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Dosis prescrita (U/día)"><input type="number" step="0.01" name="dosis_prescrita" value={dx.dosis_prescrita} onChange={cambiarDx} /></Campo>
                  <Campo label="Dispositivo">
                    <select name="dispositivo_id" value={dx.dispositivo_id} onChange={cambiarDx}>
                      <option value="">— Seleccionar —</option>
                      {[["1","Jeringa"],["2","Pluma"],["3","Microinfusora"],["4","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                </>
              )}
              <Campo label="Institución de atención" required>
                <select name="institucion_id" value={dx.institucion_id} onChange={cambiarDx}>
                  <option value="">— Seleccionar —</option>
                  {[["1","IMSS"],["2","ISSSTE"],["3","SSA/INSABI"],["4","PEMEX"],["5","SEDENA"],["6","SEMAR"],["7","Privado"],["8","Sin seguro"],["9","Otro"],["10","IMSS Bienestar"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          {/* MODY */}
          {esMODY && (
            <div className="card" style={{ marginBottom: 16, border: "1.5px solid #e9d5ff" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#7c3aed" }}>Datos MODY</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <Campo label="Tipo MODY">
                  <select name="tipo_mody" value={dx.tipo_mody} onChange={cambiarDx}>
                    <option value="">— Seleccionar —</option>
                    {["MODY 1","MODY 2","MODY 3","MODY 4","MODY 5","MODY 6","MODY 7","Otro"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Campo>
                <Campo label="Confirmación genética">
                  <select name="confirmacion_genetica" value={dx.confirmacion_genetica} onChange={cambiarDx}>
                    {SINON2.map((v) => <option key={v} value={v}>{v || "— Seleccionar —"}</option>)}
                  </select>
                </Campo>
                {dx.confirmacion_genetica === "SI" && <Campo label="Mutación"><input type="text" name="mutacion" value={dx.mutacion} onChange={cambiarDx} /></Campo>}
              </div>
            </div>
          )}

          {/* LADA */}
          {esLADA && (
            <div className="card" style={{ marginBottom: 16, border: "1.5px solid #bfdbfe" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#1d4ed8" }}>Datos LADA</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <Campo label="Fecha inicio insulina">
                  <input type="date" name="lada_fecha_insulina" value={dx.lada_fecha_insulina} onChange={cambiarDx} />
                </Campo>
              </div>
            </div>
          )}

          <Feedback ok={dxOk} error={dxErr} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={dxLoading}>
              {dxLoading ? "Guardando…" : "Guardar Diagnóstico"}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: VISITA                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Visita" && (
        <form onSubmit={guardarVisita}>
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>Datos de la Visita / Consulta</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              <Campo label="Fecha de consulta" required>
                <input type="date" name="fecha_consulta" value={visita.fecha_consulta} onChange={cambiarVisita} required />
              </Campo>
              <Campo label="Peso (kg)" required>
                <input type="number" step="0.01" name="peso" value={visita.peso} onChange={cambiarVisita} required />
              </Campo>
              <Campo label="Estatura (m)" required>
                <input type="number" step="0.001" name="estatura" value={visita.estatura} onChange={cambiarVisita} required />
              </Campo>
              <Campo label={<>IMC <span style={{ fontSize: 11, color: "#94a3b8" }}>(auto)</span></>}>
                <input type="number" step="0.01" name="imc" value={visita.imc || ""} readOnly style={{ background: "#f8fafc", color: "#64748b" }} />
              </Campo>
              {paciente?.edad != null && paciente.edad < 20 && (
                <Campo label="Percentil">
                  <input type="text" name="percentil" value={visita.percentil} onChange={cambiarVisita} placeholder="ej. p50" />
                </Campo>
              )}
              <Campo label="Cintura (cm)">
                <input type="number" step="0.1" name="cintura" value={visita.cintura} onChange={cambiarVisita} />
              </Campo>
              <Campo label="Cadera (cm)">
                <input type="number" step="0.1" name="cadera" value={visita.cadera} onChange={cambiarVisita} />
              </Campo>
              <Campo label={<>Índice C/C <span style={{ fontSize: 11, color: "#94a3b8" }}>(auto)</span></>}>
                <input type="number" step="0.001" name="indice_cc" value={visita.indice_cc || ""} readOnly style={{ background: "#f8fafc", color: "#64748b" }} />
              </Campo>
              <Campo label="PA Sistólica (mmHg)">
                <input type="number" name="pa_sistolica" value={visita.pa_sistolica} onChange={cambiarVisita} />
              </Campo>
              <Campo label="PA Diastólica (mmHg)">
                <input type="number" name="pa_diastolica" value={visita.pa_diastolica} onChange={cambiarVisita} />
              </Campo>
            </div>
            <Feedback ok={visitaOk} error={visitaErr} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={visitaLoading}>
                {visitaLoading ? "Guardando…" : "Guardar Visita"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: LABORATORIO                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Laboratorio" && (
        <form onSubmit={guardarLab}>
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>Resultados de Laboratorio</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              <Campo label="Fecha de muestra" required>
                <input type="date" name="fecha_muestra" value={lab.fecha_muestra} onChange={(e) => setLab(f => ({ ...f, fecha_muestra: e.target.value }))} required />
              </Campo>
              {[
                ["HbA1c (%)",           "hba1c",              "0.01"],
                ["Glucosa en ayuno",    "glucosa_ayuno",      "0.1" ],
                ["Glucosa postprandial","glucosa_postprandial","0.1" ],
                ["Colesterol total",    "colesterol_total",   "0.1" ],
                ["HDL (mg/dl)",         "hdl",                "0.1" ],
                ["LDL (mg/dl)",         "ldl",                "0.1" ],
                ["Triglicéridos",       "trigliceridos",      "0.1" ],
                ["Creatinina (mg/dl)",  "creatinina",         "0.001"],
                ["TFG (ml/min)",        "tasa_filtracion",    "0.1" ],
                ["Microalbuminuria",    "microalbuminuria",   "0.1" ],
                ["TSH (µUI/ml)",        "tsh",                "0.001"],
                ["Péptido C (ng/ml)",   "c_peptido",          "0.001"],
                ["Anti-GAD (nmol/L)",   "anti_gad",           "0.01" ],
                ["Anti-IA2 (nmol/L)",   "anti_ia2",           "0.01" ],
              ].map(([label, name, step]) => (
                <Campo key={name} label={label}>
                  <input type="number" step={step} name={name} value={lab[name]} onChange={(e) => setLab(f => ({ ...f, [name]: e.target.value }))} />
                </Campo>
              ))}
            </div>
            <Feedback ok={labOk} error={labErr} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={labLoading}>
                {labLoading ? "Guardando…" : "Guardar Laboratorio"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: TRATAMIENTO                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Tratamiento" && (
        <form onSubmit={guardarTrat}>
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>Tratamiento</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Fecha inicio" required>
                <input type="date" name="fecha_inicio" value={trat.fecha_inicio} onChange={(e) => setTrat(f => ({ ...f, fecha_inicio: e.target.value }))} required />
              </Campo>
              <Campo label="Terapia">
                <select value={trat.terapia_id} onChange={(e) => setTrat(f => ({ ...f, terapia_id: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {[["1","Dieta y ejercicio"],["2","Oral"],["3","Insulina"],["4","Insulina+Oral"],["5","Otra"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Esquema insulina">
                <select value={trat.esquema_insulina_id} onChange={(e) => setTrat(f => ({ ...f, esquema_insulina_id: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {[["1","Tradicional"],["2","Premezcla"],["3","Basal"],["4","Basal-Bolo"],["5","Microinfusora"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Dispositivo">
                <select value={trat.dispositivo_id} onChange={(e) => setTrat(f => ({ ...f, dispositivo_id: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {[["1","Jeringa"],["2","Pluma"],["3","Microinfusora"],["4","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Insulina">
                <select value={trat.insulina_id} onChange={(e) => setTrat(f => ({ ...f, insulina_id: e.target.value }))}>
                  <option value="">— Ninguna —</option>
                  {[["1","NPH"],["2","Glargina"],["3","Detemir"],["4","Degludec"],["5","Rápida"],["6","Lispro"],["7","Aspart"],["8","Glulisina"],["14","Glargina U300"],["15","FiAsp"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Dosis insulina (U)">
                <input type="number" step="0.01" value={trat.dosis_unidades} onChange={(e) => setTrat(f => ({ ...f, dosis_unidades: e.target.value }))} />
              </Campo>
              <Campo label="Antidiabético oral">
                <select value={trat.antidiabetico_id} onChange={(e) => setTrat(f => ({ ...f, antidiabetico_id: e.target.value }))}>
                  <option value="">— Ninguno —</option>
                  {[["1","Metformina"],["2","Sulfonilureas"],["7","Análogos GLP-1"],["8","Inhibidores DPP-4"],["9","Inhibidores SGLT2"],["5","Glitazonas"],["10","Otro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Dosis oral (mg)">
                <input type="number" step="0.01" value={trat.dosis_mg} onChange={(e) => setTrat(f => ({ ...f, dosis_mg: e.target.value }))} />
              </Campo>
              <Campo label="Frecuencia" colSpan={2}>
                <input type="text" placeholder="ej. 1 vez al día con desayuno" value={trat.frecuencia} onChange={(e) => setTrat(f => ({ ...f, frecuencia: e.target.value }))} />
              </Campo>
            </div>
            <Feedback ok={tratOk} error={tratErr} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={tratLoading}>
                {tratLoading ? "Guardando…" : "Guardar Tratamiento"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: EVALUACIÓN                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Evaluación" && (
        <form onSubmit={guardarEval}>
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>Evaluación de Complicaciones</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Fecha evaluación" required>
                <input type="date" value={eval_.fecha_evaluacion} onChange={(e) => setEval(f => ({ ...f, fecha_evaluacion: e.target.value }))} required />
              </Campo>
              {[["Retinopatía","retinopatia_id",cats.retinopatia],["Nefropatía","nefropatia_id",cats.nefropatia],["Neuropatía","neuropatia_id",cats.neuropatia],["Pie diabético","pie_diabetico_id",cats.pie_diabetico],["Enf. cardiovascular","enf_cardiovascular_id",cats.cardiovascular]].map(([label, field, opciones]) => (
                <Campo key={field} label={label}>
                  <select value={eval_[field]} onChange={(e) => setEval(f => ({ ...f, [field]: e.target.value }))}>
                    <option value="">— Sin registro —</option>
                    {opciones.map((o) => <option key={o.id} value={o.id}>{o.descripcion}</option>)}
                  </select>
                </Campo>
              ))}
              <Campo label="Observaciones" colSpan={2}>
                <textarea rows={3} value={eval_.observaciones} onChange={(e) => setEval(f => ({ ...f, observaciones: e.target.value }))} style={{ resize: "vertical" }} />
              </Campo>
            </div>
            <Feedback ok={evalOk} error={evalErr} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={evalLoading}>
                {evalLoading ? "Guardando…" : "Guardar Evaluación"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: EDUCACIÓN                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Educación" && (
        <form onSubmit={guardarEdu}>
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#6366f1" }}>Sesión de Educación</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              <Campo label="Fecha" required>
                <input type="date" value={edu.fecha} onChange={(e) => setEdu(f => ({ ...f, fecha: e.target.value }))} required />
              </Campo>
              <Campo label="Duración (min)">
                <input type="number" value={edu.duracion_min} onChange={(e) => setEdu(f => ({ ...f, duracion_min: e.target.value }))} />
              </Campo>
              <Campo label="Tema" required colSpan={2}>
                <input type="text" value={edu.tema} onChange={(e) => setEdu(f => ({ ...f, tema: e.target.value }))} required placeholder="ej. Conteo de carbohidratos, ajuste de dosis…" />
              </Campo>
              <Campo label="Modalidad">
                <select value={edu.modalidad} onChange={(e) => setEdu(f => ({ ...f, modalidad: e.target.value }))}>
                  <option value="">Seleccionar</option>
                  {["Individual","Grupal","Virtual","Taller"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Campo>
              <Campo label="Educador">
                <input type="text" value={edu.educador} onChange={(e) => setEdu(f => ({ ...f, educador: e.target.value }))} />
              </Campo>
              <Campo label="Observaciones" colSpan={2}>
                <textarea rows={3} value={edu.observaciones} onChange={(e) => setEdu(f => ({ ...f, observaciones: e.target.value }))} style={{ resize: "vertical" }} />
              </Campo>
            </div>
            <Feedback ok={eduOk} error={eduErr} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={eduLoading}>
                {eduLoading ? "Guardando…" : "Guardar Educación"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: COMORBILIDADES CRÓNICAS                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Comorbilidades" && (
        <form onSubmit={guardarComorb}>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Comorbilidades Crónicas</h3>
            <p style={{ fontSize:12, color:"#94a3b8", margin:"0 0 16px" }}>Marca SI si el paciente tiene la complicación, luego ingresa fecha y tipo.</p>
            {[
              ["Retinopatía","retinopatia","retinopatia_fecha","retinopatia_tipo",true,"retinopatia_laser","Láser"],
              ["Nefropatía","nefropatia","nefropatia_fecha","nefropatia_tipo",false,null,null],
              ["Neuropatía","neuropatia","neuropatia_fecha","neuropatia_tipo",false,null,null],
              ["Vasculopatía Periférica","vascular_perif","vascular_perif_fecha","vascular_perif_tipo",false,null,null],
              ["Enf. Cardiovascular","cardiovascular","cardiovascular_fecha","cardiovascular_tipo",false,null,null],
              ["Pie Diabético","pie_diabetico","pie_diabetico_fecha","pie_diabetico_tipo",false,null,null],
            ].map(([label, campo, campoFecha, campoTipo, hasLaser, laserCampo, laserLabel]) => (
              <div key={campo} style={{ display:"grid", gridTemplateColumns:"180px 90px 160px 1fr", gap:10, alignItems:"center", marginBottom:10, padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                <span style={{ fontWeight:600, fontSize:13 }}>{label}</span>
                <select value={comorb[campo]} onChange={e=>setComorb(f=>({...f,[campo]:e.target.value}))} style={{ minWidth:70 }}>
                  <option value="NO">NO</option><option value="SI">SI</option>
                </select>
                {comorb[campo]==="SI" && <>
                  <input type="date" value={comorb[campoFecha]||""} onChange={e=>setComorb(f=>({...f,[campoFecha]:e.target.value}))} />
                  <select value={comorb[campoTipo]||""} onChange={e=>setComorb(f=>({...f,[campoTipo]:e.target.value}))}>
                    <option value="">— Tipo —</option>
                    {(COMORB_TIPOS[campo]||[]).map((t,i)=><option key={i+1} value={i+1}>{t}</option>)}
                  </select>
                  {hasLaser && (
                    <label style={{ display:"flex", alignItems:"center", gap:6, gridColumn:"span 2" }}>
                      <span style={{ fontSize:12, color:"#64748b" }}>{laserLabel}:</span>
                      <select value={comorb[laserCampo]||""} onChange={e=>setComorb(f=>({...f,[laserCampo]:e.target.value}))} style={{ minWidth:70 }}>
                        <option value="">—</option><option value="SI">SI</option><option value="NO">NO</option>
                      </select>
                    </label>
                  )}
                </>}
              </div>
            ))}
          </div>
          <Feedback ok={comorbOk} error={comorbErr} />
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={comorbLoad}>
              {comorbLoad ? "Guardando…" : "Guardar Comorbilidades"}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PATOLOGÍAS ASOCIADAS                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Patologías" && (
        <form onSubmit={guardarPat}>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Patologías Asociadas</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12 }}>
              {[
                ["Hipotiroidismo","hipotiroidismo","hipotiroidismo_anio"],
                ["Enfermedad celíaca","e_celiaca","e_celiaca_anio"],
                ["Enfermedad de Addison","e_addison","e_addison_anio"],
                ["Vitiligo","vitiligo","vitiligo_anio"],
                ["Enfermedad de Graves","e_graves","e_graves_anio"],
                ["Hipertensión","hipertension","hipertension_anio"],
                ["Dislipidemia","dislipidemia","dislipidemia_anio"],
                ["Hiperuricemia","hiperuricemia","hiperuricemia_anio"],
                ["Gota","gota","gota_anio"],
              ].map(([label,campo,campoAnio])=>(
                <div key={campo} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f8fafc" }}>
                  <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{label}</span>
                  <select value={pat[campo]||""} onChange={e=>setPat(f=>({...f,[campo]:e.target.value}))} style={{ width:80 }}>
                    <option value="">—</option><option value="SI">SI</option><option value="NO">NO</option>
                  </select>
                  {pat[campo]==="SI" && (
                    <input type="number" placeholder="Año" value={pat[campoAnio]||""} onChange={e=>setPat(f=>({...f,[campoAnio]:e.target.value}))} style={{ width:80 }} min="1900" max={new Date().getFullYear()} />
                  )}
                </div>
              ))}
            </div>
            <div className="form-group" style={{ marginTop:12 }}>
              <label className="form-label">Otras patologías</label>
              <textarea rows={2} value={pat.otras||""} onChange={e=>setPat(f=>({...f,otras:e.target.value}))} style={{ resize:"vertical" }} />
            </div>
          </div>
          <Feedback ok={patOk} error={patErr} />
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={patLoad}>
              {patLoad ? "Guardando…" : "Guardar Patologías"}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ANTECEDENTES GINECO-OBSTÉTRICOS                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Ant. G.O." && (
        <form onSubmit={guardarAgo}>
          {paciente.sexo !== "F" && (
            <div className="card" style={{ background:"#fef9c3", border:"1px solid #fde68a", color:"#92400e", marginBottom:16 }}>
              Este módulo aplica solo para pacientes femeninas.
            </div>
          )}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Datos Ginecológicos</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              <Campo label="Menarca (años)"><input type="number" value={ago.menarca||""} onChange={e=>setAgo(f=>({...f,menarca:e.target.value}))} min="8" max="20" /></Campo>
              <Campo label="FUM"><input type="date" value={ago.fum||""} onChange={e=>setAgo(f=>({...f,fum:e.target.value}))} /></Campo>
              <Campo label="VISA (vive en área de influencia)">
                <select value={ago.visa||""} onChange={e=>setAgo(f=>({...f,visa:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                </select>
              </Campo>
              <Campo label="MAC (método anticonceptivo)">
                <select value={ago.mac||""} onChange={e=>setAgo(f=>({...f,mac:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                </select>
              </Campo>
              <Campo label="Hijos con peso > 4 kg">
                <select value={ago.peso_4000||""} onChange={e=>setAgo(f=>({...f,peso_4000:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option>
                </select>
              </Campo>
            </div>
          </div>
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Menopausia</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              <Campo label="Menopausia">
                <select value={ago.menopausia||""} onChange={e=>setAgo(f=>({...f,menopausia:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option>
                </select>
              </Campo>
              {ago.menopausia==="SI" && <>
                <Campo label="Fecha menopausia"><input type="date" value={ago.menopausia_fecha||""} onChange={e=>setAgo(f=>({...f,menopausia_fecha:e.target.value}))} /></Campo>
                <Campo label="Tipo menopausia">
                  <select value={ago.tipo_menopausia||""} onChange={e=>setAgo(f=>({...f,tipo_menopausia:e.target.value}))}>
                    <option value="">—</option><option value="NATURAL">Natural</option><option value="QUIRURGICA">Quirúrgica</option><option value="PREMATURA">Prematura</option>
                  </select>
                </Campo>
                <Campo label="TRH (terapia reemplazo hormonal)">
                  <select value={ago.trh||""} onChange={e=>setAgo(f=>({...f,trh:e.target.value}))}>
                    <option value="">—</option><option>SI</option><option>NO</option>
                  </select>
                </Campo>
              </>}
            </div>
          </div>
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Embarazos Previos</h3>
            <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 160px 100px", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:12, color:"#94a3b8" }}>#</span>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Desenlace</span>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Fecha</span>
              <span style={{ fontSize:12, color:"#94a3b8" }}>DM</span>
            </div>
            {[1,2,3,4,5,6,7,8,9,10].map(i=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"40px 1fr 160px 100px", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#64748b", paddingTop:4 }}>{i}</span>
                <select value={ago[`emb_previo${i}_des`]||""} onChange={e=>setAgo(f=>({...f,[`emb_previo${i}_des`]:e.target.value}))}>
                  <option value="">—</option>
                  <option value="P">Parto</option><option value="C">Cesárea</option>
                  <option value="A">Aborto</option><option value="O">Otro</option>
                </select>
                <input type="date" value={ago[`emb_previo${i}_fecha`]||""} onChange={e=>setAgo(f=>({...f,[`emb_previo${i}_fecha`]:e.target.value}))} />
                <select value={ago[`emb_previo${i}_diabetes`]||""} onChange={e=>setAgo(f=>({...f,[`emb_previo${i}_diabetes`]:e.target.value}))}>
                  <option value="">—</option><option>SI</option><option>NO</option>
                </select>
              </div>
            ))}
          </div>
          <Feedback ok={agoOk} error={agoErr} />
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={agoLoad}>
              {agoLoad ? "Guardando…" : "Guardar Ant. G.O."}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: EVENTOS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Eventos" && (
        <div>
          <form onSubmit={guardarEv}>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Nuevo Evento</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
                <Campo label="Hipoglucemia leve">
                  <select value={ev.hipo_leve||""} onChange={e=>setEv(f=>({...f,hipo_leve:e.target.value}))}>
                    {SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}
                  </select>
                </Campo>
                {ev.hipo_leve==="SI" && <Campo label="Número episodios"><input type="number" value={ev.hipo_leve_num||""} onChange={e=>setEv(f=>({...f,hipo_leve_num:e.target.value}))} min="1" /></Campo>}
                <Campo label="Hipoglucemia severa">
                  <select value={ev.hipo_severa||""} onChange={e=>setEv(f=>({...f,hipo_severa:e.target.value}))}>
                    {SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}
                  </select>
                </Campo>
                {ev.hipo_severa==="SI" && <>
                  <Campo label="Fecha"><input type="date" value={ev.hipo_severa_fecha||""} onChange={e=>setEv(f=>({...f,hipo_severa_fecha:e.target.value}))} /></Campo>
                  <Campo label="Convulsiones"><select value={ev.convulsiones||""} onChange={e=>setEv(f=>({...f,convulsiones:e.target.value}))}>{SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}</select></Campo>
                  <Campo label="Coma"><select value={ev.coma||""} onChange={e=>setEv(f=>({...f,coma:e.target.value}))}>{SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}</select></Campo>
                  <Campo label="Glucagón disponible"><select value={ev.glucagon_disp||""} onChange={e=>setEv(f=>({...f,glucagon_disp:e.target.value}))}>{SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}</select></Campo>
                  <Campo label="Causa" colSpan={2}><input type="text" value={ev.hipo_severa_causa||""} onChange={e=>setEv(f=>({...f,hipo_severa_causa:e.target.value}))} /></Campo>
                </>}
                <Campo label="Cetoacidosis">
                  <select value={ev.cetoacidosis||""} onChange={e=>setEv(f=>({...f,cetoacidosis:e.target.value}))}>
                    {SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}
                  </select>
                </Campo>
                {ev.cetoacidosis==="SI" && <>
                  <Campo label="Fecha cetoacidosis"><input type="date" value={ev.cetoacidosis_fecha||""} onChange={e=>setEv(f=>({...f,cetoacidosis_fecha:e.target.value}))} /></Campo>
                  <Campo label="Causa" colSpan={2}><input type="text" value={ev.cetoacidosis_causa||""} onChange={e=>setEv(f=>({...f,cetoacidosis_causa:e.target.value}))} /></Campo>
                </>}
                <Campo label="Hospitalización">
                  <select value={ev.hospitalizacion||""} onChange={e=>setEv(f=>({...f,hospitalizacion:e.target.value}))}>
                    {SINON_EV.map(v=><option key={v} value={v}>{v||"—"}</option>)}
                  </select>
                </Campo>
                {ev.hospitalizacion==="SI" && <>
                  <Campo label="Fecha"><input type="date" value={ev.hospitalizacion_fecha||""} onChange={e=>setEv(f=>({...f,hospitalizacion_fecha:e.target.value}))} /></Campo>
                  <Campo label="Días"><input type="number" value={ev.hospitalizacion_dias||""} onChange={e=>setEv(f=>({...f,hospitalizacion_dias:e.target.value}))} min="1" /></Campo>
                  <Campo label="Causa" colSpan={2}><input type="text" value={ev.hospitalizacion_causa||""} onChange={e=>setEv(f=>({...f,hospitalizacion_causa:e.target.value}))} /></Campo>
                </>}
              </div>
              <Feedback ok={evOk} error={evErr} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                <button type="submit" className="btn btn-primary" disabled={evLoad}>{evLoad?"Guardando…":"Registrar Evento"}</button>
              </div>
            </div>
          </form>
          {eventos.length > 0 && (
            <div className="card">
              <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Eventos Registrados</h3>
              <table className="tabla"><thead><tr><th>Fecha</th><th>Hipo Leve</th><th>Hipo Severa</th><th>Cetoacidosis</th><th>Hospitalización</th><th></th></tr></thead>
                <tbody>{eventos.map(e=>(
                  <tr key={e.id}>
                    <td style={{ fontSize:12 }}>{e.fecha_captura?.slice(0,10)}</td>
                    <td>{e.hipo_leve} {e.hipo_leve==="SI"?`(${e.hipo_leve_num||"?"} ep.)`:""}</td>
                    <td>{e.hipo_severa} {e.hipo_severa_fecha?`(${e.hipo_severa_fecha.slice(0,10)})`:""}</td>
                    <td>{e.cetoacidosis}</td>
                    <td>{e.hospitalizacion} {e.hospitalizacion_dias?`(${e.hospitalizacion_dias}d)`:""}</td>
                    <td><button className="btn btn-sm btn-outline" style={{ color:"#dc2626", borderColor:"#fecaca" }} onClick={async()=>{ await deleteEvento(pacienteId,e.id); getEventos(pacienteId).then(r=>setEventos(r.data)).catch(()=>{}); }}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ESTILO DE VIDA                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Estilo Vida" && (
        <div>
          <form onSubmit={guardarEvi}>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Nuevo Registro Estilo de Vida</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
                <Campo label="Fecha de registro" required><input type="date" value={evi.fecha_registro||""} onChange={e=>setEvi(f=>({...f,fecha_registro:e.target.value}))} required /></Campo>
                <Campo label="Plan de alimentación">
                  <select value={evi.plan_alimentacion||""} onChange={e=>setEvi(f=>({...f,plan_alimentacion:e.target.value}))}>
                    <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                  </select>
                </Campo>
                {evi.plan_alimentacion==="SI" && <Campo label="Calorías/día"><input type="number" value={evi.plan_calorias||""} onChange={e=>setEvi(f=>({...f,plan_calorias:e.target.value}))} min="500" max="5000" /></Campo>}
                <Campo label="Ejercicio">
                  <select value={evi.ejercicio||""} onChange={e=>setEvi(f=>({...f,ejercicio:e.target.value}))}>
                    <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                  </select>
                </Campo>
                {evi.ejercicio==="SI" && <Campo label="Minutos/semana"><input type="number" value={evi.min_ejer_semana||""} onChange={e=>setEvi(f=>({...f,min_ejer_semana:e.target.value}))} min="0" /></Campo>}
                <Campo label="Conteo de CHOs">
                  <select value={evi.conteo_chos||""} onChange={e=>setEvi(f=>({...f,conteo_chos:e.target.value}))}>
                    <option value="">—</option><option>SI</option><option>NO</option><option>SD</option>
                  </select>
                </Campo>
              </div>
              <Feedback ok={eviOk} error={eviErr} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                <button type="submit" className="btn btn-primary" disabled={eviLoad}>{eviLoad?"Guardando…":"Registrar"}</button>
              </div>
            </div>
          </form>
          {eviList.length > 0 && (
            <div className="card">
              <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Registros</h3>
              <table className="tabla"><thead><tr><th>Fecha</th><th>Alimentación</th><th>Calorías</th><th>Ejercicio</th><th>Min/sem</th><th>Conteo CHOs</th><th></th></tr></thead>
                <tbody>{eviList.map(r=>(
                  <tr key={r.id}>
                    <td>{r.fecha_registro?.slice(0,10)}</td>
                    <td>{r.plan_alimentacion}</td>
                    <td>{r.plan_calorias||"—"}</td>
                    <td>{r.ejercicio}</td>
                    <td>{r.min_ejer_semana||"—"}</td>
                    <td>{r.conteo_chos}</td>
                    <td><button className="btn btn-sm btn-outline" style={{ color:"#dc2626", borderColor:"#fecaca" }} onClick={async()=>{ await deleteEstiloVida(pacienteId,r.id); getEstiloVida(pacienteId).then(x=>setEviList(x.data)).catch(()=>{}); }}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: TOXICOMANÍAS                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Toxicomanías" && (
        <div>
          <form onSubmit={guardarTox}>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Nuevo Registro Toxicomanías</h3>
              <Campo label="Fecha de registro" required><input type="date" value={tox.fecha_registro||""} onChange={e=>setTox(f=>({...f,fecha_registro:e.target.value}))} required /></Campo>
              <div style={{ marginTop:14 }}>
                {SUSTANCIAS_LIST.map(([label,campo,unidad])=>(
                  <div key={campo} style={{ display:"grid", gridTemplateColumns:"180px 90px 120px 120px", gap:10, alignItems:"center", marginBottom:8, padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
                    <span style={{ fontWeight:500, fontSize:13 }}>{label}</span>
                    <select value={tox[campo]||"NO"} onChange={e=>setTox(f=>({...f,[campo]:e.target.value}))}>
                      <option value="NO">NO</option><option value="SI">SI</option><option value="EX">Ex-usuario</option>
                    </select>
                    {tox[campo]!=="NO" && <>
                      <input type="number" placeholder={`Cantidad (${unidad})`} value={tox[`${campo}_num`]||""} onChange={e=>setTox(f=>({...f,[`${campo}_num`]:e.target.value}))} min="0" />
                      <select value={tox[`${campo}_periodo`]||""} onChange={e=>setTox(f=>({...f,[`${campo}_periodo`]:e.target.value}))}>
                        <option value="">— Periodo —</option>
                        <option value="1">Diario</option><option value="2">Semanal</option><option value="3">Mensual</option><option value="4">Ocasional</option>
                      </select>
                    </>}
                  </div>
                ))}
              </div>
              <Feedback ok={toxOk} error={toxErr} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                <button type="submit" className="btn btn-primary" disabled={toxLoad}>{toxLoad?"Guardando…":"Registrar"}</button>
              </div>
            </div>
          </form>
          {toxList.length > 0 && (
            <div className="card">
              <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Registros</h3>
              <table className="tabla"><thead><tr><th>Fecha</th><th>Tabaco</th><th>Alcohol</th><th>Marihuana</th><th>Otras</th><th></th></tr></thead>
                <tbody>{toxList.map(r=>(
                  <tr key={r.id}>
                    <td>{r.fecha_registro?.slice(0,10)}</td>
                    <td>{r.tabaco}</td><td>{r.alcohol}</td><td>{r.marihuana}</td>
                    <td style={{ fontSize:11, color:"#64748b" }}>{[r.cocaina!=="NO"?"Coc":"",r.crack!=="NO"?"Crack":"",r.meta!=="NO"?"Meta":""].filter(Boolean).join(", ")||"—"}</td>
                    <td><button className="btn btn-sm btn-outline" style={{ color:"#dc2626", borderColor:"#fecaca" }} onClick={async()=>{ await deleteToxicomanias(pacienteId,r.id); getToxicomanias(pacienteId).then(x=>setToxList(x.data)).catch(()=>{}); }}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: RECLASIFICACIÓN                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Reclasificación" && (
        <div>
          <form onSubmit={guardarRecl}>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Nueva Reclasificación</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14 }}>
                <Campo label="Glucosa ayuno (mg/dl)"><input type="number" value={recl.glucosa_ayuno||""} onChange={e=>setRecl(f=>({...f,glucosa_ayuno:e.target.value}))} /></Campo>
                <Campo label="Fecha glucosa"><input type="date" value={recl.fecha_glucosa||""} onChange={e=>setRecl(f=>({...f,fecha_glucosa:e.target.value}))} /></Campo>
                <Campo label="Insulina ayuno (µU/ml)"><input type="number" value={recl.insulina_ayuno||""} onChange={e=>setRecl(f=>({...f,insulina_ayuno:e.target.value}))} /></Campo>
                <Campo label="Fecha insulina"><input type="date" value={recl.fecha_insulina||""} onChange={e=>setRecl(f=>({...f,fecha_insulina:e.target.value}))} /></Campo>
                <Campo label="HbA1c (%)"><input type="number" step="0.01" value={recl.hba1c||""} onChange={e=>setRecl(f=>({...f,hba1c:e.target.value}))} /></Campo>
                <Campo label="Fecha HbA1c"><input type="date" value={recl.fecha_hba1c||""} onChange={e=>setRecl(f=>({...f,fecha_hba1c:e.target.value}))} /></Campo>
              </div>
              <h4 style={{ margin:"14px 0 10px", fontSize:"0.85rem", color:"#64748b" }}>CTOG 75g (mg/dl)</h4>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
                {[["Ayuno","ctog_ayuno"],["30 min","ctog_30min"],["60 min","ctog_60min"],["90 min","ctog_90min"],["120 min","ctog_120min"],["Fecha","ctog_fecha","date"]].map(([label,campo,tipo])=>(
                  <Campo key={campo} label={label}><input type={tipo||"number"} value={recl[campo]||""} onChange={e=>setRecl(f=>({...f,[campo]:e.target.value}))} /></Campo>
                ))}
              </div>
              <h4 style={{ margin:"14px 0 10px", fontSize:"0.85rem", color:"#64748b" }}>Insulina en CTOG (µU/ml)</h4>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
                {[["Ayuno","ctog_ayuno_insul"],["30 min","ctog_30min_insul"],["60 min","ctog_60min_insul"],["90 min","ctog_90min_insul"],["120 min","ctog_120min_insul"]].map(([label,campo])=>(
                  <Campo key={campo} label={label}><input type="number" value={recl[campo]||""} onChange={e=>setRecl(f=>({...f,[campo]:e.target.value}))} /></Campo>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:14, marginTop:14 }}>
                <Campo label="Resultado reclasificación" required>
                  <select value={recl.resultado||"SI"} onChange={e=>setRecl(f=>({...f,resultado:e.target.value}))}>
                    <option value="SI">SI (reclasificado)</option>
                    <option value="NO">NO</option>
                    <option value="SD">Se desconoce</option>
                  </select>
                </Campo>
              </div>
              <Feedback ok={reclOk} error={reclErr} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                <button type="submit" className="btn btn-primary" disabled={reclLoad}>{reclLoad?"Guardando…":"Guardar Reclasificación"}</button>
              </div>
            </div>
          </form>
          {reclList.length > 0 && (
            <div className="card">
              <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Reclasificaciones</h3>
              <table className="tabla"><thead><tr><th>Fecha</th><th>Glucosa</th><th>HbA1c</th><th>CTOG 75g ayuno</th><th>Resultado</th><th></th></tr></thead>
                <tbody>{reclList.map(r=>(
                  <tr key={r.id}>
                    <td>{r.fecha_captura?.slice(0,10)}</td>
                    <td>{r.glucosa_ayuno||"—"} mg/dl</td>
                    <td>{r.hba1c||"—"}%</td>
                    <td>{r.ctog_ayuno||"—"} mg/dl</td>
                    <td><span style={{ background:r.resultado==="SI"?"#dcfce7":"#fef2f2", color:r.resultado==="SI"?"#166534":"#dc2626", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{r.resultado}</span></td>
                    <td><button className="btn btn-sm btn-outline" style={{ color:"#dc2626", borderColor:"#fecaca" }} onClick={async()=>{ await deleteReclasificacion(pacienteId,r.id); getReclasificaciones(pacienteId).then(x=>setReclList(x.data)).catch(()=>{}); }}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: EMBARAZO                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "Embarazo" && (
        <div>
          <form onSubmit={guardarEmb}>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:"0.9rem", color:"#6366f1" }}>Nuevo Embarazo</h3>
              {/* Datos generales */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
                <Campo label="FUM"><input type="date" value={emb.fecha_um||""} onChange={e=>setEmb(f=>({...f,fecha_um:e.target.value}))} /></Campo>
                <Campo label="Fecha probable de parto"><input type="date" value={emb.fecha_pp||""} onChange={e=>setEmb(f=>({...f,fecha_pp:e.target.value}))} /></Campo>
                <Campo label="Tipo de embarazo">
                  <select value={emb.tipo_embarazo||""} onChange={e=>setEmb(f=>({...f,tipo_embarazo:e.target.value}))}>
                    <option value="">—</option><option value="UNICO">Único</option><option value="MULTIPLE">Múltiple</option>
                  </select>
                </Campo>
                <Campo label="Logro del embarazo">
                  <select value={emb.logro_embarazo||""} onChange={e=>setEmb(f=>({...f,logro_embarazo:e.target.value}))}>
                    <option value="">—</option><option value="ESPONTANEO">Espontáneo</option><option value="ASISTIDO">Asistido (FIV/ICSI)</option>
                  </select>
                </Campo>
                <Campo label="Estatus">
                  <select value={emb.estatus_embarazo||""} onChange={e=>setEmb(f=>({...f,estatus_embarazo:e.target.value}))}>
                    <option value="">—</option><option value="EN_CURSO">En curso</option><option value="TERMINADO">Terminado</option>
                  </select>
                </Campo>
              </div>
              {/* Diagnóstico glucémico */}
              <h4 style={{ margin:"0 0 10px", fontSize:"0.85rem", color:"#64748b" }}>Diagnóstico Glucémico</h4>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:12, marginBottom:16 }}>
                <Campo label="HbA1c (%)"><input type="number" step="0.01" value={emb.hba1c_dx||""} onChange={e=>setEmb(f=>({...f,hba1c_dx:e.target.value}))} /></Campo>
                <Campo label="Fecha HbA1c"><input type="date" value={emb.fecha_hba1c_dx||""} onChange={e=>setEmb(f=>({...f,fecha_hba1c_dx:e.target.value}))} /></Campo>
                <Campo label="Glucosa ayunas (mg/dl)"><input type="number" value={emb.glucosa_ayunas||""} onChange={e=>setEmb(f=>({...f,glucosa_ayunas:e.target.value}))} /></Campo>
                <Campo label="Glucosa 50g (mg/dl)"><input type="number" value={emb.glucosa_50gr||""} onChange={e=>setEmb(f=>({...f,glucosa_50gr:e.target.value}))} /></Campo>
                {["75g","100g"].map(tipo=>{
                  const prefix = tipo==="75g"?"ctog75":"ctog100";
                  const timepoints = tipo==="75g"?[["Ayuno","ayuno"],["1 hr","1hr"],["2 hr","2hr"]]:[["Ayuno","ayuno"],["1 hr","1hr"],["2 hr","2hr"],["3 hr","3hr"]];
                  return timepoints.map(([tLabel,suffix])=>(
                    <Campo key={`${prefix}_${suffix}`} label={`CTOG ${tipo} ${tLabel}`}><input type="number" value={emb[`${prefix}_${suffix}`]||""} onChange={e=>setEmb(f=>({...f,[`${prefix}_${suffix}`]:e.target.value}))} /></Campo>
                  ));
                })}
              </div>
              {/* Complicaciones */}
              <h4 style={{ margin:"0 0 10px", fontSize:"0.85rem", color:"#64748b" }}>Complicaciones Obstétricas</h4>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10, marginBottom:16 }}>
                {[["Hipertensión","hipertension"],["Preeclampsia","preeclampsia"],["Eclampsia","eclampsia"],["HELLP","hellp"],["Oligohidramnios","oligohidramnios"],["Polihidramnios","polihidramnios"],["Desprendimiento placenta","desprendimiento_placenta"],["Insuficiencia placentaria","insuficiencia_placentaria"],["Placenta previa","placenta_previa"],["Placenta acreta","placenta_acreta"]].map(([label,campo])=>(
                  <div key={campo} style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ flex:1, fontSize:13 }}>{label}</span>
                    <select value={emb[campo]||""} onChange={e=>setEmb(f=>({...f,[campo]:e.target.value}))} style={{ width:70 }}>
                      <option value="">—</option><option value="SI">SI</option><option value="NO">NO</option>
                    </select>
                  </div>
                ))}
              </div>
              {/* Desenlace */}
              {emb.estatus_embarazo==="TERMINADO" && <>
                <h4 style={{ margin:"0 0 10px", fontSize:"0.85rem", color:"#64748b" }}>Desenlace</h4>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:12 }}>
                  <Campo label="Semanas gestación"><input type="number" value={emb.semanas_gestacion||""} onChange={e=>setEmb(f=>({...f,semanas_gestacion:e.target.value}))} min="20" max="45" /></Campo>
                  <Campo label="Vía de parto">
                    <select value={emb.via_parto||""} onChange={e=>setEmb(f=>({...f,via_parto:e.target.value}))}>
                      <option value="">—</option><option value="VAGINAL">Vaginal</option><option value="CESAREA">Cesárea</option>
                    </select>
                  </Campo>
                  <Campo label="Peso RN (kg)"><input type="number" step="0.01" value={emb.peso_rn||""} onChange={e=>setEmb(f=>({...f,peso_rn:e.target.value}))} /></Campo>
                  {[["Macrosomía","macrosomia"],["Hipoglucemia RN","hipoglucemia_rn"],["SDR","sdr"],["Ictericia","ictericia"],["Malformación","malformacion"],["Óbito","obito"]].map(([label,campo])=>(
                    <div key={campo} style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ flex:1, fontSize:13 }}>{label}</span>
                      <select value={emb[campo]||""} onChange={e=>setEmb(f=>({...f,[campo]:e.target.value}))} style={{ width:70 }}>
                        <option value="">—</option><option value="SI">SI</option><option value="NO">NO</option>
                      </select>
                    </div>
                  ))}
                  {emb.malformacion==="SI" && <Campo label="Descripción malformación" colSpan={2}><input type="text" value={emb.malformacion_desc||""} onChange={e=>setEmb(f=>({...f,malformacion_desc:e.target.value}))} /></Campo>}
                </div>
              </>}
              <Feedback ok={embOk} error={embErr} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
                <button type="submit" className="btn btn-primary" disabled={embLoad}>{embLoad?"Guardando…":"Registrar Embarazo"}</button>
              </div>
            </div>
          </form>
          {embList.length > 0 && (
            <div className="card">
              <h3 style={{ margin:"0 0 12px", fontSize:"0.9rem", color:"#6366f1" }}>Embarazos Registrados</h3>
              <table className="tabla"><thead><tr><th>FUM</th><th>Tipo</th><th>Estatus</th><th>Semanas</th><th>Vía parto</th><th>HbA1c dx</th><th></th></tr></thead>
                <tbody>{embList.map(r=>(
                  <tr key={r.id}>
                    <td>{r.fecha_um?.slice(0,10)||"—"}</td>
                    <td>{r.tipo_embarazo||"—"}</td>
                    <td><span style={{ background:r.estatus_embarazo==="EN_CURSO"?"#dbeafe":"#f1f5f9", color:r.estatus_embarazo==="EN_CURSO"?"#1d4ed8":"#475569", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{r.estatus_embarazo||"—"}</span></td>
                    <td>{r.semanas_gestacion||"—"}</td>
                    <td>{r.via_parto||"—"}</td>
                    <td>{r.hba1c_dx||"—"}%</td>
                    <td><button className="btn btn-sm btn-outline" style={{ color:"#dc2626", borderColor:"#fecaca" }} onClick={async()=>{ await deleteEmbarazo(pacienteId,r.id); getEmbarazos(pacienteId).then(x=>setEmbList(x.data)).catch(()=>{}); }}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </RenacedLayout>
  );
}
