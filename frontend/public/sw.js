// Service worker de la app (PWA).
//
// - Permite instalar la app y abrirla aunque la red falle (se muestra la última versión guardada).
// - NO guarda datos de la API ni archivos subidos: solo la app (HTML, JS, CSS e imágenes del mismo sitio).
// - Una versión nueva NO se activa sola: queda "en espera" hasta que la persona pulse "Actualizar"
//   en el aviso de la app (mensaje SKIP_WAITING). Así nadie pierde lo que estaba capturando.
//
// __BUILD_ID__ lo reemplaza vite.config.js en cada build; por eso cada despliegue cambia este archivo
// y el navegador detecta que hay una versión nueva.
const VERSION = "__BUILD_ID__";
const CACHE = `evolucion-metabolica-${VERSION}`;
const BASE = ["/", "/index.html", "/favicon.svg", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // API y otros sitios: sin intervenir
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;
  if (url.pathname === "/sw.js") return;

  // Páginas: primero la red (siempre la versión más nueva); sin red, la última guardada.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copia));
          return resp;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // Archivos con nombre único (assets/xxxx.js): una vez guardados no cambian.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((guardado) => guardado || fetch(req).then((resp) => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return resp;
      }))
    );
    return;
  }

  // Resto (íconos, imágenes, manifest): se sirve lo guardado y se refresca en segundo plano.
  event.respondWith(
    caches.match(req).then((guardado) => {
      const red = fetch(req).then((resp) => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return resp;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
