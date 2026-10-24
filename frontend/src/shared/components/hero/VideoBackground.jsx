import { useEffect, useRef, useState } from "react";
import frameInicial from "../../assets/ADN.png";
import frameFinal from "../../assets/ADN2.png";

// Ruta del loop ping-pong (7 s forward + 7 s reversed) colocado en /public/hero/.
// Mientras el archivo no exista se usa un crossfade ADN ⇄ ADN2 con el mismo ritmo (14 s).
// En móvil se sirve una versión más liviana (960px) para no gastar datos de más.
const VIDEO_WEBM = "/hero/adn-loop.webm";
const VIDEO_MP4 = "/hero/adn-loop.mp4";
const VIDEO_WEBM_MOBILE = "/hero/adn-loop-mobile.webm";
const VIDEO_MP4_MOBILE = "/hero/adn-loop-mobile.mp4";

export default function VideoBackground() {
  const videoRef = useRef(null);
  const mediaRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [ready, setReady] = useState(false);
  const [animar] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [esMovil] = useState(() => window.matchMedia("(max-width: 640px)").matches);
  const [tieneMouse] = useState(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  const srcWebm = esMovil ? VIDEO_WEBM_MOBILE : VIDEO_WEBM;
  const srcMp4 = esMovil ? VIDEO_MP4_MOBILE : VIDEO_MP4;

  // Con prefers-reduced-motion queda el frame 1 estático (sin descargar nada más).
  useEffect(() => {
    if (!animar) return;
    const probe = () =>
      fetch(srcMp4, { method: "HEAD" })
        .then((r) => setHasVideo(r.ok && (r.headers.get("content-type") || "").startsWith("video")))
        .catch(() => setHasVideo(false));
    // no compite con el primer render
    const id = "requestIdleCallback" in window ? requestIdleCallback(probe) : setTimeout(probe, 300);
    return () => ("cancelIdleCallback" in window ? cancelIdleCallback(id) : clearTimeout(id));
  }, [animar, srcMp4]);

  // Pausa el video cuando la pestaña no está visible
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onVis = () => (document.hidden ? v.pause() : v.play().catch(() => {}));
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [hasVideo]);

  // Parallax suave: el fondo sigue el mouse con inercia (solo con mouse real, no en touch).
  useEffect(() => {
    if (!animar || !tieneMouse) return;
    const el = mediaRef.current;
    if (!el) return;
    const MAX_PX = 16;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;

    function onMove(e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function step() {
      raf = requestAnimationFrame(step);
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const x = (-mouse.x * MAX_PX).toFixed(2);
      const y = (-mouse.y * MAX_PX * 0.7).toFixed(2);
      el.style.transform = `scale(1.06) translate3d(${x}px, ${y}px, 0)`;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [animar, tieneMouse]);

  return (
    <div className="mh__media" aria-hidden="true" ref={mediaRef}>
      {/* Frame 1: poster / LCP / versión móvil / movimiento reducido */}
      <img className="mh__media-el" src={frameInicial} alt="" fetchPriority="high" decoding="async" />

      {animar && !hasVideo && (
        <img className="mh__media-el mh__media-el--pingpong" src={frameFinal} alt="" loading="lazy" decoding="async" />
      )}

      {animar && hasVideo && (
        <video
          ref={videoRef}
          className={`mh__media-el mh__media-el--video${ready ? " is-ready" : ""}`}
          autoPlay muted loop playsInline preload="auto"
          poster={frameInicial}
          onCanPlay={() => setReady(true)}
        >
          <source src={srcWebm} type="video/webm" />
          <source src={srcMp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
