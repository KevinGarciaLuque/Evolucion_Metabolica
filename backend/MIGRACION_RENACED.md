# RENACED México — flujos de importación de base de datos

Hay **dos flujos distintos** para meter datos a `renaced_mexico`. No mezclarlos.

## 1. Dump nuevo del sistema PHP viejo (`renaced1.sql`)

Úsalo cuando tengas una exportación nueva del sistema PHP original (`RENACED PHP/renaced1.sql`),
con el esquema viejo (67 tablas tipo `paciente_cve`, `ccronica`, `tratamiento_hist_dosis`, etc).
**Nunca subas este archivo directo al módulo "Importar BD"** — tiene un esquema distinto al que
usa la app hoy, y el módulo web asume el esquema moderno.

Pasos:

1. Importar el dump a una base MySQL local (XAMPP), en un contenedor de trabajo:
   ```
   "/c/xampp/mysql/bin/mysql.exe" -u root -p123456789 -e "CREATE DATABASE IF NOT EXISTS renaced1 CHARACTER SET utf8mb4;"
   "/c/xampp/mysql/bin/mysql.exe" -u root -p123456789 renaced1 < ruta/al/renaced1.sql
   ```
   (Todos los scripts de este repo apuntan a `localhost` / base `renaced1` / usuario `root` / password `123456789` — si cambias alguno de esos datos, hay que actualizar el `CFG_ORIGEN` de cada script.)

2. Correr los scripts ETL **en este orden exacto** desde `backend/`:
   ```
   node scripts/mexico/migrate_renaced_mexico.cjs          # solo la primera vez (crea el esquema, CREATE TABLE IF NOT EXISTS)
   node scripts/mexico/migrate_renaced_datos.cjs
   node scripts/mexico/migrate_renaced_datos2.cjs
   node scripts/mexico/migrate_renaced_datos3.cjs
   node scripts/mexico/migrate_renaced_datos4.cjs
   node scripts/mexico/migrate_renaced_datos5.cjs
   node scripts/mexico/migrate_renaced_diagnostico_full.cjs
   node scripts/mexico/migrate_renaced_laboratorio_full.cjs
   node scripts/mexico/migrate_renaced_evento_completo.cjs
   node scripts/mexico/migrate_renaced_evaluacion_complementaria.cjs
   node scripts/mexico/migrate_renaced_monitoreo_periodo.cjs
   node scripts/mexico/migrate_renaced_tratamiento_otx.cjs
   node scripts/mexico/migrate_renaced_ajuste_dosis.cjs
   node scripts/mexico/migrate_fix_terapia.cjs
   ```
   Todos escriben directo a **Railway (producción)** — el destino sale de `DB_HOST`/`RENACED_MX_DB_NAME` en `.env`, no de una base local.

3. La mayoría de estos scripts ya son seguros de reejecutar (usan `id` explícito + `ON DUPLICATE KEY UPDATE`,
   o tienen una guarda que aborta si detecta que ya corrieron antes — verás un mensaje tipo
   `⛔ ya tiene N filas. Aborto para no duplicar.`). Si ves ese mensaje, es informativo, no un error: significa
   que ese paso ya estaba hecho y no hizo falta repetirlo.

### Notas de bugs ya corregidos (julio 2026)
- `migrate_renaced_datos.cjs` (paso diagnóstico) no tenía `ON DUPLICATE KEY UPDATE` → se corrigió
  para insertar con `id = paciente_id` (1 diagnóstico por paciente, igual que el resto del esquema).
- `migrate_renaced_datos2.cjs` (paso `evaluacion`) usaba `String(fecha)` sobre un objeto `Date` de JS
  sin `dateStrings: true` en la conexión de origen, produciendo `fecha_evaluacion = '0000-00-00'` en
  reejecuciones → se agregó `dateStrings: true` y una `UNIQUE KEY (paciente_id, fecha_evaluacion)` en
  la tabla `evaluacion` para blindarla contra el mismo bug en el futuro.
- Conexiones a Railway sin `keepAlive` podían colgarse en silencio en corridas largas → se agregó
  `enableKeepAlive` + `connectTimeout` a `migrate_renaced_datos.cjs`.

### Alternativa desde la app (solo Super Admin)
En **Importar BD** (`/renaced/importar-bd`), el Super Admin ve la tarjeta "Migrar base del sistema anterior (PHP)".
Ahí sí se sube `renaced1.sql` directo: el servidor hace backup, lo carga en una base temporal
(`renaced1_import_tmp`), corre los mismos scripts del paso 2 en el mismo orden y borra la base temporal.
Los scripts leen el origen de [migrate_origen.cjs](scripts/mexico/migrate_origen.cjs) (variables `ORIGEN_DB_*`; por defecto el MySQL local de siempre).
Código: [utils/migracionLegacy.js](modules/mexico/utils/migracionLegacy.js), endpoints `POST/GET /api/renaced/importar-bd/php`.

## 2. Restaurar/reemplazar un backup del sistema actual (esquema moderno)

Para esto es el módulo **"Importar BD"** dentro de la app (`/renaced/importar-bd`, solo visible
para un usuario con perfil Administrador del tenant México).

- El archivo `.sql` que subas debe ser un dump del **esquema moderno** (`renaced_mexico`), por ejemplo
  generado con `mysqldump` o con el mismo backup automático que genera este módulo antes de importar.
- Antes de aplicar el archivo subido, el módulo genera un backup completo de `renaced_mexico` en
  `backend/uploads/renaced_backups/` (esa carpeta está en `.gitignore`, no se sube a git).
- El `.sql` se ejecuta tal cual: si trae `DROP TABLE` + `CREATE TABLE` + `INSERT`, reemplaza esas
  tablas puntuales; las que no toque el dump quedan intactas.
- Restringido solo al tenant México — no aplica a otros países RENACED.

Código relevante: [controllers/renaced/importarBD.controller.js](modules/mexico/controllers/importarBD.controller.js),
[routes/renaced/importarBD.routes.js](modules/mexico/routes/importarBD.routes.js),
[utils/sqlDump.js](shared/utils/sqlDump.js),
frontend: [RenacedImportarBD.jsx](../frontend/src/pages/Renaced/RenacedImportarBD.jsx).
