# Reglas del proyecto

## Versión y novedades en cada push
Antes de cada `git push` (o cuando el usuario pida subir cambios):
1. Agrega una entrada NUEVA al inicio del arreglo `NOVEDADES` en `frontend/src/data/novedades.js`
   con `version`, `fecha` (YYYY-MM-DD), `titulo` y `cambios` (frases cortas, en español, para el usuario final).
2. Sube la versión según el tipo de cambio: patch = correcciones, minor = funciones nuevas, major = cambios grandes.
3. Incluye ese archivo en el commit. La versión del pie del menú lateral y el botón ✨ de Novedades salen de ahí; no hay que tocar nada más.

## Estructura del código
Se organiza por país y, dentro, por producto: `<pais>/<producto>` (México: RENACED, Honduras: SAAPD).
Un país nuevo = una carpeta nueva con el nombre del país.

- `backend/server.js` — arranque y montaje de rutas (`/api/...` no cambia).
- `backend/modules/mexico/renaced/` — RENACED México (config, controllers, routes, middlewares, services, utils).
- `backend/modules/honduras/saapd/` — SAAPD Honduras / Evolución Metabólica (config, controllers, routes, services).
- `backend/modules/admin|auth|public|notificaciones/` — Super Admin, login unificado, landing, campana.
- `backend/shared/` — lo común: `middlewares/auth.js`, `config/db.master.js`, `utils/`, `paths.js` (uploads y carpetas base).
- `backend/scripts/{mexico/renaced,honduras/saapd,admin}/` — migraciones, seeds y utilidades `.cjs`. Se ejecutan desde `backend/`: `node scripts/mexico/renaced/migrate_x.cjs`.
- `frontend/src/modules/{mexico/renaced,honduras/saapd,admin}/` — `pages/`, `components/`, `api/`, `context/`, `utils/` de cada producto.
- `frontend/src/shared/` — Layout, Sidebar, modales, AuthContext, `api/axios.js`, landing/login, `data/novedades.js`.

## Registro automático de módulos (agregar un país/sistema)
- Backend: crea `backend/modules/<pais>/<sistema>/index.js` que exporte `montar(app)` con sus `app.use(...)`. `server.js` lo descubre solo; no se edita.
- Frontend: crea `frontend/src/modules/<pais>/<sistema>/routes.jsx` que exporte por defecto un arreglo de `<Route key=...>` con las pantallas en `lazy(() => import(...))`. `App.jsx` lo descubre con `import.meta.glob`.

## Rendimiento (preparado para muchos registros)
- Exportaciones RENACED (`modules/mexico/renaced/services/exportacion.js`): CSV en streaming y Excel como trabajo en segundo plano (`POST /reportes/excel/iniciar` → `estado` → `descargar`). Nunca cargar un país completo en memoria.
- Dashboard RENACED: `services/resumenCache.js` guarda el resumen en la tabla `resumen_dashboard` (se sirve el guardado y se recalcula en segundo plano pasados `DASHBOARD_TTL_SEG`, 300 por defecto).
- Búsqueda de pacientes: `services/busquedaPacientes.js` (FULLTEXT por palabra; si falta el índice cae a LIKE). Páginas con tope de 100 filas.
- Campana: lee `alerta_riesgo` (triggers) si existe; si no, usa la consulta anterior.
- Migraciones a aplicar con `--aplicar` (por defecto solo simulan): `scripts/mexico/renaced/migrate_indices_rendimiento.cjs`, `scripts/mexico/renaced/migrate_alertas_riesgo.cjs`, `scripts/honduras/saapd/migrate_alertas_riesgo.cjs`.
