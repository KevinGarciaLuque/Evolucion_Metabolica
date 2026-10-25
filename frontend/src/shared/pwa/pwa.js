// Soporte de app instalable (PWA): registro del service worker, aviso de versión nueva
// e instalación. Es un módulo sencillo con suscriptores; React lo lee con usePWA().
import { useEffect, useState } from "react";

let promptDiferido = null;      // evento beforeinstallprompt (Chrome/Edge/Android), guardado para usarlo al pulsar "Instalar"
let registro = null;            // ServiceWorkerRegistration
let hayActualizacion = false;   // hay una versión nueva descargada y esperando
let actualizando = false;       // la persona pulsó "Actualizar": recargar al activarse
const oyentes = new Set();
const avisar = () => oyentes.forEach((fn) => fn());

export const esInstalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const esIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

/** Llamar una sola vez al arrancar (main.jsx), antes de montar React. */
export function iniciarPWA() {
  // Este evento puede llegar antes de que se pinte el login: se guarda aquí.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptDiferido = e;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    promptDiferido = null;
    avisar();
  });

  // El service worker solo se registra en producción (en desarrollo estorba al recargar).
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      registro = await navigator.serviceWorker.register("/sw.js");
    } catch {
      return;
    }
    const avisarNueva = () => { hayActualizacion = true; avisar(); };

    // Versión nueva ya descargada mientras la app estaba cerrada
    if (registro.waiting && navigator.serviceWorker.controller) avisarNueva();
    registro.addEventListener("updatefound", () => {
      const nuevo = registro.installing;
      nuevo?.addEventListener("statechange", () => {
        if (nuevo.state === "installed" && navigator.serviceWorker.controller) avisarNueva();
      });
    });

    // Buscar versión nueva al volver a la app y cada 30 minutos
    document.addEventListener("visibilitychange", () => { if (!document.hidden) registro.update().catch(() => {}); });
    setInterval(() => registro.update().catch(() => {}), 30 * 60 * 1000);
  });

  // Cuando la versión nueva toma el control (solo si la persona lo pidió), se recarga para verla
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (actualizando) window.location.reload();
  });
}

/** Activa la versión nueva y recarga la app. */
export function aplicarActualizacion() {
  actualizando = true;
  if (registro?.waiting) registro.waiting.postMessage({ type: "SKIP_WAITING" });
  else window.location.reload();
}

/** Abre el cuadro nativo de instalación. Devuelve "accepted" | "dismissed" | null. */
export async function instalarApp() {
  if (!promptDiferido) return null;
  promptDiferido.prompt();
  const { outcome } = await promptDiferido.userChoice;
  promptDiferido = null;
  avisar();
  return outcome;
}

const leer = () => ({
  puedeInstalar: !!promptDiferido,
  hayActualizacion,
  instalada: esInstalada(),
  ios: esIOS(),
});

export function usePWA() {
  const [estado, setEstado] = useState(leer);
  useEffect(() => {
    const fn = () => setEstado(leer());
    oyentes.add(fn);
    fn();
    return () => { oyentes.delete(fn); };
  }, []);
  return estado;
}
