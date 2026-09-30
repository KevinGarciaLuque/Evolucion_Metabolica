import { useEffect, useRef } from "react";
import { FiShield, FiGlobe, FiActivity, FiLock } from "react-icons/fi";
import "./SobreNosotros.css";

const tarjetas = [
  {
    icon: <FiShield />,
    titulo: "Estándar ISPAD",
    texto:
      "Cada paciente se clasifica con los criterios internacionales de la ISPAD (International Society for Pediatric and Adolescent Diabetes), lo que permite comparar resultados clínicos entre países de forma consistente.",
  },
  {
    icon: <FiGlobe />,
    titulo: "Red multipaís",
    texto:
      "SAAPD (Honduras) y RENACED (México) comparten un mismo estándar de datos. La red está diseñada para seguir creciendo con más países e instituciones de la región.",
  },
  {
    icon: <FiActivity />,
    titulo: "Datos MCG en tiempo real",
    texto:
      "Los reportes de Monitoreo Continuo de Glucosa se procesan automáticamente: TIR, TAR, TBR, GMI y CV quedan listos para el análisis epidemiológico, sin transcripción manual.",
  },
  {
    icon: <FiLock />,
    titulo: "Privacidad por institución",
    texto:
      "Cada institución accede únicamente a sus propios pacientes, aun cuando los datos agregados alimentan la investigación regional conjunta.",
  },
];

// Revela un elemento (fade + slide-up) cuando entra en pantalla al hacer scroll.
function useRevealOnScroll() {
  const containerRef = useRef(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const targets = root.querySelectorAll("[data-reveal]");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return containerRef;
}

export default function SobreNosotros() {
  const ref = useRevealOnScroll();

  return (
    <section className="sn" aria-labelledby="sn-titulo" ref={ref}>
      <div className="sn__inner">
        <div className="sn__head" data-reveal>
          <span className="sn__eyebrow"><i /> Sobre el registro</span>
          <h2 id="sn-titulo" className="sn__title">
            Investigación clínica que cruza <span>fronteras</span>
          </h2>
          <p className="sn__lead">
            Evolución Metabólica es la plataforma detrás del registro: un sistema clínico
            especializado en el manejo integral de pacientes con diabetes que usan Monitoreo
            Continuo de Glucosa, hoy en producción con datos reales en Honduras y México, y
            pensado desde el inicio para crecer como una red regional de investigación.
          </p>
        </div>

        <div className="sn__grid">
          {tarjetas.map((t, i) => (
            <div
              className="sn__card"
              key={t.titulo}
              data-reveal
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="sn__icon">{t.icon}</div>
              <h3>{t.titulo}</h3>
              <p>{t.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
