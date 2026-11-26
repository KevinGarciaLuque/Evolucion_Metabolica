// Plantilla visual única de la página web de un país. Recibe el contenido (JSON) y lo dibuja:
// portada, sobre nosotros (historia + equipo), proyectos, servicios, talleres y contacto.
// Estilo de vidrio sobre fondo genómico, igual que la página principal.
import { useEffect, useMemo, useRef, useState } from "react";
import { FiMenu, FiX, FiMapPin, FiCalendar } from "react-icons/fi";
import FlagIcon from "../components/FlagIcon";
import logoRenaced from "../../assets/RENACED1.png";
import fondoGrande from "../../assets/moleculas-fondo.jpg";
import fondoMovil from "../../assets/moleculas-fondo-movil.jpg";
import { urlFoto } from "./fotosPagina";
import "./PaginaWebVista.css";

// Logo propio de cada sistema (si no hay, se usa la bandera + título).
const LOGOS = { renaced: logoRenaced };

const ESTADOS = [
  ["todos", "Todos"], ["en_curso", "En curso"], ["proximo", "Próximos"], ["finalizado", "Finalizados"],
];
const ETIQUETA = { en_curso: "En curso", proximo: "Próximo", finalizado: "Finalizado" };

const TIPOS = [["todos", "Todas"], ["articulo", "Artículos"], ["congreso", "Congresos y posters"], ["libro", "Libros"]];
const TIPO_ETIQUETA = { articulo: "Artículo", congreso: "Congreso", libro: "Libro" };
const POR_PAGINA = 8;

const iniciales = (n = "") => n.replace(/^dra?\.?\s+/i, "").trim().slice(0, 1).toUpperCase();

export default function PaginaWebVista({ pagina, onIniciarSesion }) {
  const logo = LOGOS[pagina.sistema];
  const c = pagina.contenido || {};
  const contacto = c.contacto || {};
  const equipo = c.equipo || [];
  const proyectos = c.proyectos || [];
  const servicios = c.servicios || [];
  const talleres = c.talleres || [];
  const publicaciones = c.publicaciones || [];
  const hitos = (c.hitos || []).filter((h) => h.texto);
  const wa = (contacto.whatsapp || "").replace(/\D/g, "");
  const datosContacto = [
    contacto.correo && { k: "Correo", v: contacto.correo, href: `mailto:${contacto.correo}` },
    contacto.telefono && { k: "Teléfono", v: contacto.telefono, href: `tel:${contacto.telefono.replace(/[^\d+]/g, "")}` },
    wa && { k: "WhatsApp", v: contacto.whatsapp, href: `https://wa.me/${wa}` },
    contacto.direccion && { k: "Dirección", v: contacto.direccion },
  ].filter(Boolean);

  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [tipoPub, setTipoPub] = useState("todos");
  const [verPub, setVerPub] = useState(POR_PAGINA);
  const raiz = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Aparición suave al hacer scroll (se re-engancha si cambia el contenido).
  useEffect(() => {
    const els = raiz.current?.querySelectorAll("[data-pwr]") || [];
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("pw-in"));
      return;
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("pw-in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pagina, filtro, tipoPub, verPub]);

  const visibles = useMemo(
    () => (filtro === "todos" ? proyectos : proyectos.filter((p) => p.estado === filtro)),
    [proyectos, filtro]
  );
  const pubs = useMemo(
    () => publicaciones
      .filter((x) => tipoPub === "todos" || x.tipo === tipoPub)
      .sort((a, b) => String(b.anio).localeCompare(String(a.anio))),
    [publicaciones, tipoPub]
  );
  const rostros = equipo.filter((m) => urlFoto(m.foto)).slice(0, 3);

  const enlaces = [
    ["#inicio", "Inicio"], ["#sobre-nosotros", "Sobre nosotros"], ["#proyectos", "Proyectos"],
    ...(publicaciones.length ? [["#publicaciones", "Publicaciones"]] : []),
    ["#servicios", "Servicios"], ["#talleres", "Talleres"], ["#contacto", "Contacto"],
  ];

  return (
    <div className="pw" ref={raiz} style={{ "--pw-accent": c.color || "#0b3a6b", scrollBehavior: "smooth" }}>
      <div className="pw__bg" aria-hidden="true">
        <img className="pw__molec" src={fondoGrande} srcSet={`${fondoMovil} 960w, ${fondoGrande} 1920w`} sizes="100vw" alt="" decoding="async" />
        <i className="pw__veil" />
      </div>

      <header className={`pw-nav${scrolled ? " pw-nav--s" : ""}${menu ? " pw-nav--o" : ""}`}>
        <div className="pw-nav__in">
          <a className="pw-brand" href="#inicio" onClick={() => setMenu(false)}>
            {logo ? <img src={logo} alt={c.titulo} /> : <><FlagIcon codigo={pagina.codigo} size={22} /> {c.titulo}</>}
          </a>
          <nav className="pw-links" aria-label="Principal">
            {enlaces.map(([h, l]) => <a key={h} href={h} onClick={() => setMenu(false)}>{l}</a>)}
          </nav>
          <button className="pw-login" onClick={onIniciarSesion}>Iniciar sesión</button>
          <button className="pw-burger" aria-label={menu ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenu((m) => !m)}>
            {menu ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      <section id="inicio" className={`pw-hero${rostros.length ? "" : " pw-hero--solo"}`}>
        <div>
          {logo && <div className="pw-logo-hero"><img src={logo} alt={c.titulo} /></div>}
          <span className="pw-eyebrow"><i /> {pagina.pais}</span>
          <h1>{c.titulo}</h1>
          <p>{c.eslogan}</p>
          <div className="pw-cta">
            <button className="pw-login" onClick={onIniciarSesion}>Acceder al sistema</button>
            <a className="pw-btn2" href="#proyectos">Ver proyectos</a>
          </div>
        </div>
        {rostros.length > 0 && (
          <div className="pw-faces" data-pwr>
            {rostros.map((m, i) => (
              <figure className="pw-face" key={i}>
                <img src={urlFoto(m.foto)} alt={m.nombre} />
                <figcaption>{m.nombre}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section id="sobre-nosotros" className="pw-sec">
        <div className="pw-head" data-pwr>
          <span className="pw-eyebrow"><i /> Sobre nosotros</span>
          <h2 className="pw-h2">Quiénes <span>somos</span></h2>
          <p className="pw-lead">{c.sobre_nosotros}</p>
        </div>

        {(c.historia || hitos.length > 0) && (
          <div className="pw-about">
            <div className="pw-glass pw-card" data-pwr>
              <h3>Nuestra historia</h3>
              <p>{c.historia}</p>
            </div>
            {hitos.length > 0 && (
              <div className="pw-glass pw-card" data-pwr>
                <h3>Nuestro camino</h3>
                <ul className="pw-time">
                  {hitos.map((h, i) => <li key={i}>{h.anio && <b>{h.anio}</b>}{h.texto}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {equipo.length > 0 && (
          <>
            <h3 className="pw-sub" data-pwr>Nuestro equipo</h3>
            <div className="pw-team">
              {equipo.map((m, i) => (
                <article className="pw-glass pw-member" key={i} data-pwr style={{ transitionDelay: `${i * 90}ms` }}>
                  <div className="pw-member__img">
                    {urlFoto(m.foto) ? <img src={urlFoto(m.foto)} alt={m.nombre} /> : <span className="pw-member__ini">{iniciales(m.nombre)}</span>}
                  </div>
                  <div className="pw-member__body">
                    <h4>{m.nombre}</h4>
                    {m.cargo && <div className="pw-member__cargo">{m.cargo}</div>}
                    {m.bio && <p>{m.bio}</p>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section id="proyectos" className="pw-sec">
        <div className="pw-head" data-pwr>
          <span className="pw-eyebrow"><i /> Investigación</span>
          <h2 className="pw-h2">Proyectos <span>en marcha y por venir</span></h2>
          <p className="pw-lead">Lo que estamos desarrollando hoy y lo que viene para seguir mejorando la atención de la diabetes.</p>
        </div>
        {proyectos.length > 0 && (
          <div className="pw-chips">
            {ESTADOS.map(([k, l]) => (
              <button key={k} className={`pw-chip${filtro === k ? " pw-chip--on" : ""}`} onClick={() => setFiltro(k)}>{l}</button>
            ))}
          </div>
        )}
        {visibles.length ? (
          <div className="pw-grid">
            {visibles.map((p, i) => (
              <article className="pw-glass pw-item" key={`${filtro}-${i}`} data-pwr style={{ transitionDelay: `${i * 70}ms` }}>
                <span className={`pw-badge pw-badge--${p.estado}`}>{ETIQUETA[p.estado]}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
                {p.fecha && <div className="pw-meta"><span><FiCalendar /> {p.fecha}</span></div>}
              </article>
            ))}
          </div>
        ) : (
          <div className="pw-glass pw-empty">Próximamente publicaremos nuestros proyectos.</div>
        )}
      </section>

      {publicaciones.length > 0 && (
        <section id="publicaciones" className="pw-sec">
          <div className="pw-head" data-pwr>
            <span className="pw-eyebrow"><i /> Producción científica</span>
            <h2 className="pw-h2">Nuestras <span>publicaciones</span></h2>
            <p className="pw-lead">Artículos en revistas indexadas, presentaciones en congresos y capítulos de libros del equipo.</p>
          </div>
          <div className="pw-chips">
            {TIPOS.map(([k, l]) => (
              <button key={k} className={`pw-chip${tipoPub === k ? " pw-chip--on" : ""}`}
                onClick={() => { setTipoPub(k); setVerPub(POR_PAGINA); }}>{l}</button>
            ))}
          </div>
          <div className="pw-pubs">
            {pubs.slice(0, verPub).map((x, i) => (
              <article className="pw-glass pw-pub" key={`${tipoPub}-${i}`} data-pwr>
                <div className="pw-pub__top">
                  <span className={`pw-badge pw-badge--${x.tipo === "articulo" ? "en_curso" : x.tipo === "libro" ? "finalizado" : "proximo"}`}>{TIPO_ETIQUETA[x.tipo]}</span>
                  {x.anio && <span className="pw-pub__anio">{x.anio}</span>}
                </div>
                {x.titulo ? (
                  <>
                    <h3 className="pw-pub__titulo">{x.titulo}</h3>
                    {x.revista && <div className="pw-pub__rev">{x.revista}</div>}
                    {x.resumen && <p className="pw-pub__resumen">{x.resumen}</p>}
                    <details className="pw-pub__cita"><summary>Ver cita completa</summary><p>{x.cita}</p></details>
                  </>
                ) : <p>{x.cita}</p>}
                {(x.enlace || x.pubmed) && (
                  <div className="pw-pub__links">
                    {x.enlace && <a href={x.enlace} target="_blank" rel="noopener noreferrer">Ver publicación ↗</a>}
                    {x.pubmed && <a href={x.pubmed} target="_blank" rel="noopener noreferrer">PubMed ↗</a>}
                  </div>
                )}
              </article>
            ))}
          </div>
          {pubs.length > verPub && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button className="pw-chip" onClick={() => setVerPub((n) => n + POR_PAGINA)}>
                Ver más ({pubs.length - verPub} restantes)
              </button>
            </div>
          )}
        </section>
      )}

      <section id="servicios" className="pw-sec">
        <div className="pw-head" data-pwr>
          <span className="pw-eyebrow"><i /> Qué hacemos</span>
          <h2 className="pw-h2">Nuestros <span>servicios</span></h2>
        </div>
        {servicios.length ? (
          <div className="pw-grid">
            {servicios.map((s, i) => (
              <article className="pw-glass pw-item" key={i} data-pwr style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="pw-ico">{i + 1}</div>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
              </article>
            ))}
          </div>
        ) : <div className="pw-glass pw-empty">Próximamente publicaremos nuestros servicios.</div>}
      </section>

      <section id="talleres" className="pw-sec">
        <div className="pw-head" data-pwr>
          <span className="pw-eyebrow"><i /> Educación</span>
          <h2 className="pw-h2">Talleres y <span>eventos</span></h2>
          <p className="pw-lead">Espacios para aprender, compartir y acompañarnos entre pacientes, familias y profesionales.</p>
        </div>
        {talleres.length ? (
          <div className="pw-grid">
            {talleres.map((t, i) => (
              <article className="pw-glass pw-item" key={i} data-pwr style={{ transitionDelay: `${i * 70}ms` }}>
                <h3 style={{ marginTop: 0 }}>{t.titulo}</h3>
                <p>{t.texto}</p>
                {(t.fecha || t.lugar) && (
                  <div className="pw-meta">
                    {t.fecha && <span><FiCalendar /> {t.fecha}</span>}
                    {t.lugar && <span><FiMapPin /> {t.lugar}</span>}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : <div className="pw-glass pw-empty">Próximamente publicaremos nuestros talleres.</div>}
      </section>

      <section id="contacto" className="pw-sec">
        <div className="pw-head" data-pwr>
          <span className="pw-eyebrow"><i /> Contacto</span>
          <h2 className="pw-h2">Hablemos</h2>
        </div>
        {datosContacto.length ? (
          <div className="pw-contact">
            {datosContacto.map((d) => {
              const Tag = d.href ? "a" : "div";
              return (
                <Tag key={d.k} className="pw-glass" data-pwr {...(d.href ? { href: d.href, target: "_blank", rel: "noopener noreferrer" } : {})}>
                  <small>{d.k}</small><span>{d.v}</span>
                </Tag>
              );
            })}
          </div>
        ) : <div className="pw-glass pw-empty">Próximamente publicaremos los datos de contacto.</div>}
      </section>

      <footer className="pw-foot">© {new Date().getFullYear()} {c.titulo} · Todos los derechos reservados</footer>
    </div>
  );
}
