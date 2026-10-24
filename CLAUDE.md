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
