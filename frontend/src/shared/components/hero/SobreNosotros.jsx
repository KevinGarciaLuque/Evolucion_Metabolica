import { useEffect, useRef } from "react";
import { FiShield, FiGlobe, FiTool, FiLock } from "react-icons/fi";
import "./SobreNosotros.css";

const tarjetas = [
  {
    icon: <FiTool />,
    titulo: "Sistema a la medida",
    texto:
      "No es un software genérico: la plataforma se diseña y adapta a la forma de trabajo de cada país e institución, para que el registro se ajuste a su realidad clínica y no al revés.",
  },
  {
    icon: <FiLock />,
    titulo: "Seguridad de datos por país",
    texto:
      "La información de cada país se mantiene separada y protegida. Cada institución accede únicamente a sus propios pacientes, y solo se comparten datos agregados para la investigación regional.",
  },
  {
    icon: <FiShield />,
    titulo: "Estándar ISPAD",
    texto:
      "Cada paciente se clasifica con los criterios internacionales de la ISPAD (International Society for Pediatric and Adolescent Diabetes), lo que permite comparar resultados clínicos entre países de forma consistente.",
  },
  {
    icon: <FiGlobe />,
    titulo: "Una red que crece",
    texto:
      "Un mismo estándar de datos para todos los países participantes, con la flexibilidad de sumar nuevos países e instituciones de la región sin perder el control local de la información.",
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
    <section id="sobre-nosotros" className="sn" aria-labelledby="sn-titulo" ref={ref}>
      <div className="sn__inner">
        <div className="sn__head" data-reveal>
          <span className="sn__eyebrow"><i /> Sobre el registro</span>
          <h2 id="sn-titulo" className="sn__title">
            Investigación clínica que cruza <span>fronteras</span>
          </h2>
          <p className="sn__lead">
            En <strong>GLAK</strong> estamos desarrollando Evolución Metabólica, la plataforma
            que da vida al Registro Latinoamericano de Diabetes: un sistema creado a la medida
            para que los países de la región registren, protejan y analicen la información
            clínica de sus pacientes, y la conviertan en investigación conjunta.
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
