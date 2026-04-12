# Manual de Despliegue — Evolución Metabólica

**Stack:** React + Vite (Vercel) · Express + Node.js (Railway) · MySQL (Railway)

---

## Estructura del Proyecto

```
Evolucion_Metabolica/
├── backend/        ← API REST con Express
└── frontend/       ← SPA con React + Vite
```

---

## PARTE 1 — Base de Datos MySQL en Railway

### 1.1 Crear el servicio MySQL

1. Ingresar a [railway.app](https://railway.app) e iniciar sesión.
2. Crear un nuevo proyecto o abrir el existente.
3. Clic en **+ New** → **Database** → **MySQL**.
4. Railway aprovisiona automáticamente una instancia MySQL con usuario `root`.

### 1.2 Obtener las credenciales

En el servicio **MySQL** → pestaña **Variables**, copiar:

| Variable            | Descripción              |
|---------------------|--------------------------|
| `MYSQLHOST`         | Host interno (privado)   |
| `MYSQLPORT`         | Puerto (usualmente 3306) |
| `MYSQLUSER`         | Usuario (`root`)         |
| `MYSQLPASSWORD`     | Contraseña               |
| `MYSQLDATABASE`     | Nombre de la base        |

> Para conexión externa (ej. desde local o MySQL Workbench): usar el host/puerto de la sección **Connect → Public Networking**.

### 1.3 Importar el esquema / datos

Desde tu máquina local con el archivo `backup.sql`:

```bash
mysql -h <HOST_PUBLICO> -P <PUERTO_PUBLICO> -u root -p railway < backup.sql
```

---

## PARTE 2 — Backend (Express) en Railway

### 2.1 Crear el servicio desde GitHub

1. En el proyecto de Railway clic en **+ New** → **GitHub Repo**.
2. Seleccionar el repositorio `KevinGarciaLuque/Evolucion_Metabolica`.
3. En **Settings → Source**:
   - **Root Directory:** `backend`
   - **Branch:** `main`
4. Railway detecta automáticamente Node.js y ejecuta `node server.js`.

### 2.2 Variables de entorno del Backend

En el servicio **Evolucion Backend** → pestaña **Variables**, agregar:

| Variable         | Valor                                          |
|------------------|------------------------------------------------|
| `PORT`           | `3001`                                         |
| `DB_HOST`        | Host **privado** del servicio MySQL en Railway |
| `DB_PORT`        | `3306`                                         |
| `DB_USER`        | `root`                                         |
| `DB_PASSWORD`    | Contraseña MySQL generada por Railway          |
| `DB_NAME`        | `railway`                                      |
| `JWT_SECRET`     | Cadena secreta larga y aleatoria               |
| `FRONTEND_URL`   | `https://evolucion-metabolica.vercel.app`      |
| `UPLOADS_PATH`   | `/app/uploads`                                 |

> **`DB_HOST` privado:** En el servicio MySQL → Variables → copiar el valor de `MYSQLHOST`. Esto permite comunicación interna sin exponer puertos públicos.

### 2.3 Volumen persistente para PDFs

Los archivos subidos por los usuarios deben sobrevivir entre redeployments. Railway reinicia el contenedor con el sistema de archivos vacío en cada deploy, por lo que se requiere un volumen.

1. En el proyecto Railway clic en **+ New** → **Volume**.
2. Vincularlo al servicio **Evolucion Backend**.
3. Configurar el **Mount Path:** `/app/uploads/pdfs`
4. Asegurarse de que la variable `UPLOADS_PATH=/app/uploads` esté definida (paso anterior).

Con esto:
- Multer guarda los PDFs en `/app/uploads/pdfs` (el volumen).
- Express sirve los archivos estáticos desde `/app/uploads`.
- Los PDFs persisten entre redeploys.

### 2.4 Dominio público (URL del Backend)

1. En el servicio Backend → **Settings → Networking → Generate Domain**.
2. Railway asigna una URL tipo: `https://evolucion-metabolica.up.railway.app`
3. Esa URL se usará como `VITE_API_URL` en el frontend.

---

## PARTE 3 — Frontend (React + Vite) en Vercel

### 3.1 Importar el proyecto

1. Ingresar a [vercel.com](https://vercel.com) e iniciar sesión.
2. Clic en **Add New → Project**.
3. Seleccionar el repositorio `KevinGarciaLuque/Evolucion_Metabolica`.
4. En la configuración del proyecto:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3.2 Variables de entorno del Frontend

En Vercel → **Project Settings → Environment Variables**:

| Variable        | Valor                                              |
|-----------------|----------------------------------------------------|
| `VITE_API_URL`  | `https://evolucion-metabolica.up.railway.app/api`  |

> El prefijo `VITE_` es obligatorio para que Vite exponga la variable al cliente.

### 3.3 Configuración de rutas (SPA)

React Router maneja las rutas en el cliente. Sin configuración adicional, Vercel devuelve 404 al acceder directamente a rutas como `/dashboard`.

El archivo `frontend/vercel.json` resuelve esto:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Este archivo ya está creado en el repositorio y se aplica automáticamente.

---

## PARTE 4 — Flujo de Despliegue Continuo

```
git commit + git push (rama main)
        │
        ├──► Railway detecta cambio → redeploy automático del Backend
        │
        └──► Vercel detecta cambio → redeploy automático del Frontend
```

Ambas plataformas monitorean la rama `main` y despliegan automáticamente en cada push.

---

## PARTE 5 — Variables Resumen

### Backend (.env local para desarrollo)

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_local
DB_NAME=evolucion_metabolica
JWT_SECRET=una_cadena_muy_larga_y_secreta
FRONTEND_URL=http://localhost:5173
UPLOADS_PATH=./uploads
```

### Frontend (.env.local para desarrollo)

```env
VITE_API_URL=http://localhost:3001/api
```

---

## PARTE 6 — Ejecución Local

### Backend

```bash
cd backend
npm install
node server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Arquitectura General

```
[Usuario]
    │
    ▼
[Vercel] evolucion-metabolica.vercel.app
  React + Vite (SPA)
    │
    │ HTTP (VITE_API_URL)
    ▼
[Railway] evolucion-metabolica.up.railway.app
  Express + Node.js
    │              │
    │              ▼
    │         [Volumen Railway]
    │         /app/uploads/pdfs
    │         (PDFs persistentes)
    │
    │ mysql2 (red interna Railway)
    ▼
[Railway MySQL]
  Base de datos railway
```
