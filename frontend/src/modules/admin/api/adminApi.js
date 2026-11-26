import api from "../../../shared/api/axios";

const BASE = "/admin/tenants";

export const getTenants            = ()         => api.get(BASE);
export const getTenantById         = (id)       => api.get(`${BASE}/${id}`);
export const createTenant          = (data)     => api.post(BASE, data);
export const updateTenant          = (id, data) => api.put(`${BASE}/${id}`, data);
export const deleteTenant          = (id)       => api.delete(`${BASE}/${id}`);
export const getEstadisticasGlobales = ()       => api.get(`${BASE}/estadisticas-globales`);
export const impersonarTenant        = (codigo) => api.post(`${BASE}/by-codigo/${codigo}/impersonate`);
export const getUsuariosTenant       = (id)     => api.get(`${BASE}/${id}/usuarios`);
export const actualizarPermisosUsuarioTenant = (id, usuarioId, modulos) =>
  api.put(`${BASE}/${id}/usuarios/${usuarioId}/permisos`, { modulos });
export const getBitacoraTenant             = (id, params) => api.get(`${BASE}/${id}/bitacora`, { params });
export const getBitacoraTenantEstadisticas = (id)         => api.get(`${BASE}/${id}/bitacora/estadisticas`);

// Páginas Web por país
export const getPaginasWeb          = ()             => api.get("/admin/paginas-web");
export const getPaginaWeb           = (codigo)       => api.get(`/admin/paginas-web/${codigo}`);
export const crearPaginaWeb         = (codigo)       => api.post(`/admin/paginas-web/${codigo}`);
export const cambiarEstadoPaginaWeb = (codigo, activa) => api.put(`/admin/paginas-web/${codigo}/estado`, { activa });
