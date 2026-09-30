import { useEffect, useRef } from "react";
import AnimatedNumber from "./AnimatedNumber";
import FlagIcon from "../FlagIcon";
import GenomeBackground from "./GenomeBackground";
import VideoBackground from "./VideoBackground";
import "./MetabolicHero.css";

const fmt = (n) => (n != null ? n.toLocaleString("es-MX") : "—");

// Hero reutilizable: fondo genómico + encabezado + total + tarjetas por país.
// Props:
//  paises: [{ codigo, pais, total_pacientes }]   cargando: bool
//  loginSlot: nodo del botón/selector "Iniciar sesión" (lo controla la página)
//  onPaisClick: (pais) => void  (opcional; vuelve clicables las tarjetas)
export default function MetabolicHero({ paises = [], cargando = false, loginSlot, onPaisClick, variant = "genome" }) {
  const video = variant === "video";
  const total = paises.reduce((acc, p) => acc + (p.total_pacientes || 0), 0);
  const max = Math.max(1, ...paises.map((p) => p.total_pacientes || 0));
  const bodyRef = useRef(null);

  // Parallax sutil del texto: sigue al mouse con menos intensidad que el fondo,
  // dando sensación de profundidad. Solo con mouse real y sin reduced-motion.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tieneMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce || !tieneMouse) return;
    const el = bodyRef.current;
    if (!el) return;
    const MAX_PX = 7;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;

    function onMove(e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function step() {
      raf = requestAnimationFrame(step);
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      const x = (mouse.x * MAX_PX).toFixed(2);
      const y = (mouse.y * MAX_PX * 0.6).toFixed(2);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className={`mh${video ? " mh--video" : ""}`}>
      {video ? (
        <VideoBackground />
      ) : (
        <GenomeBackground className="mh__bg" />
      )}

      <header className="mh__header">
        <a className="mh__brand" href="/" aria-label="Evolución Metabólica — inicio">
          <span className="mh__logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#062038" strokeWidth="2.2" strokeLinecap="round">
              <path d="M7 3c0 6 10 6 10 12s-10 6-10 6" /><path d="M17 3c0 6-10 6-10 12s10 6 10 6" />
              <path d="M8.5 7.5h7M8.5 16.5h7" />
            </svg>
          </span>
          <span className="mh__brand-text">
            <span className="mh__brand-name">Evolución Metabólica</span>
            <span className="mh__brand-sub">Registro Nacional de Diabetes</span>
          </span>
        </a>
        {loginSlot}
      </header>

      <main className="mh__body" ref={bodyRef}>
        <span className="mh__eyebrow"><i /> Investigación clínica · Latinoamérica</span>
        <h1 className="mh__title">
          Registro Nacional de <span>Diabetes</span>
        </h1>
        <p className="mh__subtitle">
          Datos agregados de los países participantes en el registro
          SAAPD (Honduras) y RENACED (México): metabolismo, genética y análisis clínico
          al servicio de la investigación regional.
        </p>

        {!cargando && paises.length > 0 && (
          <div className="mh__total" role="status">
            <div className="mh__total-num">
              <AnimatedNumber end={total} />
            </div>
            <div className="mh__total-label">
              pacientes registrados en {paises.length} país{paises.length !== 1 ? "es" : ""}
            </div>
          </div>
        )}

        {cargando && <div className="mh__status">Cargando estadísticas…</div>}

        {!cargando && paises.length > 0 && (
          <section className="mh__countries" aria-label="Pacientes por país">
            {paises.map((p, i) => {
              const Tag = onPaisClick ? "button" : "div";
              return (
                <Tag
                  key={p.codigo}
                  className="mh__country"
                  style={{ animationDelay: `${i * 90}ms`, cursor: onPaisClick ? "pointer" : undefined }}
                  onClick={onPaisClick ? () => onPaisClick(p) : undefined}
                >
                  <div className="mh__country-top">
                    <FlagIcon codigo={p.codigo} size={26} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }} />
                    <span className="mh__country-name">{p.pais}</span>
                  </div>
                  <div className="mh__country-num">{fmt(p.total_pacientes)}</div>
                  <div className="mh__country-label">pacientes registrados</div>
                  <div className="mh__country-bar" aria-hidden="true">
                    <b style={{ width: `${((p.total_pacientes || 0) / max) * 100}%` }} />
                  </div>
                </Tag>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
