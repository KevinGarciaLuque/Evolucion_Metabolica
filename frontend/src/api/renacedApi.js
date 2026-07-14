import api from "./axiosRenaced";

const BASE = "/renaced";

// ── Pacientes ─────────────────────────────────────────────────────────────────
export const getPacientes    = (params)  => api.get(`${BASE}/pacientes`, { params });
export const getPaciente     = (id)      => api.get(`${BASE}/pacientes/${id}`);
export const createPaciente  = (data)    => api.post(`${BASE}/pacientes`, data);
export const updatePaciente  = (id, data) => api.put(`${BASE}/pacientes/${id}`, data);

// ── Diagnóstico clínico ───────────────────────────────────────────────────────
export const getDiagnosticoClinico  = (pacId)       => api.get(`${BASE}/diagnostico/${pacId}`);
export const saveDiagnosticoClinico = (pacId, data) => api.put(`${BASE}/diagnostico/${pacId}`, data);

// ── Consultas ─────────────────────────────────────────────────────────────────
export const getConsultas    = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/consultas`);
export const createConsulta  = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/consultas`, data);

// ── Laboratorio ───────────────────────────────────────────────────────────────
export const getLaboratorios  = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/laboratorio`);
export const createLaboratorio = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/laboratorio`, data);

// ── Tratamiento ───────────────────────────────────────────────────────────────
export const getTratamiento    = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/tratamiento`);
export const createTratamiento = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/tratamiento`, data);
export const createTratamientoOtx = (pacId, data)        => api.post(`${BASE}/pacientes/${pacId}/tratamiento/otros`, data);
export const updateTratamientoOtx = (pacId, otxId, data) => api.put(`${BASE}/pacientes/${pacId}/tratamiento/otros/${otxId}`, data);
export const deleteTratamientoOtx = (pacId, otxId)       => api.delete(`${BASE}/pacientes/${pacId}/tratamiento/otros/${otxId}`);
export const createAjusteDosis    = (pacId, data)           => api.post(`${BASE}/pacientes/${pacId}/tratamiento/ajustes`, data);
export const updateAjusteDosis    = (pacId, ajusteId, data) => api.put(`${BASE}/pacientes/${pacId}/tratamiento/ajustes/${ajusteId}`, data);
export const deleteAjusteDosis    = (pacId, ajusteId)       => api.delete(`${BASE}/pacientes/${pacId}/tratamiento/ajustes/${ajusteId}`);

// ── Evaluación ────────────────────────────────────────────────────────────────
export const getEvaluaciones   = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/evaluacion`);
export const createEvaluacion  = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/evaluacion`, data);
export const getEvaluacionesComplementarias = (pacId) => api.get(`${BASE}/pacientes/${pacId}/evaluacion/complementarias`);
export const createEvaluacionComplementaria = (pacId, data)         => api.post(`${BASE}/pacientes/${pacId}/evaluacion/complementarias`, data);
export const updateEvaluacionComplementaria = (pacId, compId, data) => api.put(`${BASE}/pacientes/${pacId}/evaluacion/complementarias/${compId}`, data);
export const deleteEvaluacionComplementaria = (pacId, compId)       => api.delete(`${BASE}/pacientes/${pacId}/evaluacion/complementarias/${compId}`);

// ── Monitoreo ─────────────────────────────────────────────────────────────────
export const getMonitoreo      = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/monitoreo`);
export const createMonitoreo   = (pacId, data)        => api.post(`${BASE}/pacientes/${pacId}/monitoreo`, data);
export const updateMonitoreo   = (pacId, monId, data) => api.put(`${BASE}/pacientes/${pacId}/monitoreo/${monId}`, data);
export const deleteMonitoreo   = (pacId, monId)       => api.delete(`${BASE}/pacientes/${pacId}/monitoreo/${monId}`);

// ── Educación ─────────────────────────────────────────────────────────────────
export const getEducacion      = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/educacion`);
export const createEducacion   = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/educacion`, data);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardResumen = (params) => api.get(`${BASE}/dashboard/resumen`, { params });

// ── Catálogos ─────────────────────────────────────────────────────────────────
export const getCatalogosEvaluacion = () => api.get(`${BASE}/catalogos/evaluacion`);

// ── Usuarios (solo Admin) ─────────────────────────────────────────────────────
export const getUsuariosRenaced    = ()          => api.get(`${BASE}/usuarios`);
export const getUsuarioRenaced     = (id)        => api.get(`${BASE}/usuarios/${id}`);
export const createUsuarioRenaced  = (data)      => api.post(`${BASE}/usuarios`, data);
export const updateUsuarioRenaced  = (id, data)  => api.put(`${BASE}/usuarios/${id}`, data);
export const toggleUsuarioRenaced  = (id)        => api.patch(`${BASE}/usuarios/${id}/toggle`);

// ── Comorbilidades crónicas ───────────────────────────────────────────────────
export const getComorbilidad  = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/comorbilidad`);
export const saveComorbilidad = (pacId, data) => api.put(`${BASE}/pacientes/${pacId}/comorbilidad`, data);

// ── Patologías asociadas ──────────────────────────────────────────────────────
export const getPatologia  = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/patologia`);
export const savePatologia = (pacId, data) => api.put(`${BASE}/pacientes/${pacId}/patologia`, data);

// ── Antecedentes Gineco-Obstétricos ──────────────────────────────────────────
export const getAntecedentesGO  = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/antecedentes-go`);
export const saveAntecedentesGO = (pacId, data) => api.put(`${BASE}/pacientes/${pacId}/antecedentes-go`, data);

// ── Eventos (hipoglucemia, cetoacidosis, hospitalización) ─────────────────────
export const getEventos    = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/eventos`);
export const createEvento  = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/eventos`, data);
export const deleteEvento  = (pacId, id)   => api.delete(`${BASE}/pacientes/${pacId}/eventos/${id}`);

// ── Estilo de vida ────────────────────────────────────────────────────────────
export const getEstiloVida    = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/estilovida`);
export const createEstiloVida = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/estilovida`, data);
export const deleteEstiloVida = (pacId, id)   => api.delete(`${BASE}/pacientes/${pacId}/estilovida/${id}`);

// ── Toxicomanías ──────────────────────────────────────────────────────────────
export const getToxicomanias    = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/toxicomanias`);
export const createToxicomanias = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/toxicomanias`, data);
export const deleteToxicomanias = (pacId, id)   => api.delete(`${BASE}/pacientes/${pacId}/toxicomanias/${id}`);

// ── Reclasificación diagnóstica ───────────────────────────────────────────────
export const getReclasificaciones    = (pacId)       => api.get(`${BASE}/pacientes/${pacId}/reclasificacion`);
export const createReclasificacion   = (pacId, data) => api.post(`${BASE}/pacientes/${pacId}/reclasificacion`, data);
export const deleteReclasificacion   = (pacId, id)   => api.delete(`${BASE}/pacientes/${pacId}/reclasificacion/${id}`);

// ── Embarazo ──────────────────────────────────────────────────────────────────
export const getEmbarazos    = (pacId)           => api.get(`${BASE}/pacientes/${pacId}/embarazos`);
export const createEmbarazo  = (pacId, data)     => api.post(`${BASE}/pacientes/${pacId}/embarazos`, data);
export const updateEmbarazo  = (pacId, id, data) => api.put(`${BASE}/pacientes/${pacId}/embarazos/${id}`, data);
export const deleteEmbarazo  = (pacId, id)       => api.delete(`${BASE}/pacientes/${pacId}/embarazos/${id}`);

// ── Reportes / Exportación ────────────────────────────────────────────────────
export const descargarExcel = () => api.get(`${BASE}/reportes/excel`, { responseType: "blob" });
export const descargarCSV   = () => api.get(`${BASE}/reportes/csv`,   { responseType: "blob" });
export const descargarPDF   = () => api.get(`${BASE}/reportes/pdf`,   { responseType: "blob" });
