# Reglas del proyecto

## Versión y novedades en cada push
Antes de cada `git push` (o cuando el usuario pida subir cambios):
1. Agrega una entrada NUEVA al inicio del arreglo `NOVEDADES` en `frontend/src/data/novedades.js`
   con `version`, `fecha` (YYYY-MM-DD), `titulo` y `cambios` (frases cortas, en español, para el usuario final).
2. Sube la versión según el tipo de cambio: patch = correcciones, minor = funciones nuevas, major = cambios grandes.
3. Incluye ese archivo en el commit. La versión del pie del menú lateral y el botón ✨ de Novedades salen de ahí; no hay que tocar nada más.

## Estructura del código
Todo se organiza por módulo (país / área). Un país nuevo = una carpeta nueva en `modules/`.

- `backend/server.js` — arranque y montaje de rutas (`/api/...` no cambia).
- `backend/modules/honduras/` — Evolución Metabólica (config, controllers, routes, services).
- `backend/modules/mexico/` — RENACED México (+ `middlewares/` de tenant y `utils/migracionLegacy.js`).
- `backend/modules/admin|auth|public|notificaciones/` — Super Admin, login unificado, landing, campana.
- `backend/shared/` — lo común: `middlewares/auth.js`, `config/db.master.js`, `utils/`, `paths.js` (uploads y carpetas base).
- `backend/scripts/{honduras,mexico,admin}/` — migraciones, seeds y utilidades `.cjs`. Se ejecutan desde `backend/`: `node scripts/mexico/migrate_x.cjs`.
- `frontend/src/modules/{honduras,mexico,admin}/` — `pages/`, `components/`, `api/`, `context/`, `utils/` de cada área.
- `frontend/src/shared/` — Layout, Sidebar, modales, AuthContext, `api/axios.js`, landing/login, `data/novedades.js`.
