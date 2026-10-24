# Reglas del proyecto

## Versión y novedades en cada push
Antes de cada `git push` (o cuando el usuario pida subir cambios):
1. Agrega una entrada NUEVA al inicio del arreglo `NOVEDADES` en `frontend/src/data/novedades.js`
   con `version`, `fecha` (YYYY-MM-DD), `titulo` y `cambios` (frases cortas, en español, para el usuario final).
2. Sube la versión según el tipo de cambio: patch = correcciones, minor = funciones nuevas, major = cambios grandes.
3. Incluye ese archivo en el commit. La versión del pie del menú lateral y el botón ✨ de Novedades salen de ahí; no hay que tocar nada más.
