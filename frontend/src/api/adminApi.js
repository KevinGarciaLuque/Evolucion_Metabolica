import api from "./axios";

const BASE = "/admin/tenants";

export const getTenants            = ()         => api.get(BASE);
export const getTenantById         = (id)       => api.get(`${BASE}/${id}`);
export const createTenant          = (data)     => api.post(BASE, data);
export const updateTenant          = (id, data) => api.put(`${BASE}/${id}`, data);
export const deleteTenant          = (id)       => api.delete(`${BASE}/${id}`);
export const getEstadisticasGlobales = ()       => api.get(`${BASE}/estadisticas-globales`);
