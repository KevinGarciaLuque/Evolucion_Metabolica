import { useEffect, useRef, useState } from "react";
import frameInicial from "../../assets/ADN.png";
import frameFinal from "../../assets/ADN2.png";

// Ruta del loop ping-pong (7 s forward + 7 s reversed) colocado en /public/hero/.
// Mientras el archivo no exista se usa un crossfade ADN ⇄ ADN2 con el mismo ritmo (14 s).
const VIDEO_WEBM = "/hero/adn-loop.webm";
const VIDEO_MP4 = "/hero/adn-loop.mp4";

export default function VideoBackground() {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [ready, setReady] = useState(false);
  const [animar] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !window.matchMedia("(max-width: 640px)").matches
  );

  // Solo desktop/tablet y sin prefers-reduced-motion cargan el video; en móvil o con
  // movimiento reducido queda el frame 1 estático (sin descargar nada más).
  useEffect(() => {
    if (!animar) return;
    const probe = () =>
      fetch(VIDEO_MP4, { method: "HEAD" })
        .then((r) => setHasVideo(r.ok && (r.headers.get("content-type") || "").startsWith("video")))
        .catch(() => setHasVideo(false));
    // no compite con el primer render
    const id = "requestIdleCallback" in window ? requestIdleCallback(probe) : setTimeout(probe, 300);
    return () => ("cancelIdleCallback" in window ? cancelIdleCallback(id) : clearTimeout(id));
  }, [animar]);

  // Pausa el video cuando la pestaña no está visible
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onVis = () => (document.hidden ? v.pause() : v.play().catch(() => {}));
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [hasVideo]);

  return (
    <div className="mh__media" aria-hidden="true">
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
          <source src={VIDEO_WEBM} type="video/webm" />
          <source src={VIDEO_MP4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
