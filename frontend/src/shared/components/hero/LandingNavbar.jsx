import { useEffect, useRef, useState } from "react";
import { FiMenu, FiX, FiChevronDown } from "react-icons/fi";
import FlagIcon from "../FlagIcon";
import "./LandingNavbar.css";

// Enlaces del menú. Para sumar una sección nueva: agrega aquí { label, href } y ponle ese id a la sección.
const ENLACES = [
  { label: "Inicio", href: "#inicio" },
  { label: "Sobre el registro", href: "#sobre-nosotros" },
  { label: "Contacto", href: "#contacto" },
];

// Navbar fijo de la página principal: marca, enlaces, menú de países y acceso.
// Props: paises [{codigo, pais}], onPaisClick(pais), loginSlot (botón "Iniciar sesión")
export default function LandingNavbar({ paises = [], onPaisClick, loginSlot }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [paisesAbierto, setPaisesAbierto] = useState(false);
  const paisesRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const cerrar = (e) => {
      if (paisesRef.current && !paisesRef.current.contains(e.target)) setPaisesAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  const irA = () => setMenu(false);

  return (
    <header className={`lnav${scrolled ? " lnav--scrolled" : ""}${menu ? " lnav--open" : ""}`}>
      <div className="lnav__inner">
        <a className="mh__brand" href="#inicio" aria-label="Evolución Metabólica — inicio" onClick={irA}>
          <span className="mh__logo" aria-hidden="true">
            {/* Doble hélice completa, dentro del recuadro (no se corta en los extremos). */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#062038" strokeWidth="1.9" strokeLinecap="round">
              <path d="M7 2.5C7 7 17 7 17 12S7 17 7 21.5" />
              <path d="M17 2.5C17 7 7 7 7 12S17 17 17 21.5" />
              <path d="M9 4.6h6M9 9.6h6M9 14.4h6M9 19.4h6" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="mh__brand-text">
            <span className="mh__brand-name">Evolución Metabólica</span>
            <span className="mh__brand-sub">Registro Latinoamericano de Diabetes</span>
          </span>
        </a>

        <nav className="lnav__links" aria-label="Principal">
          {ENLACES.map((l) => (
            <a key={l.href} href={l.href} onClick={irA}>{l.label}</a>
          ))}

          <div className="lnav__drop" ref={paisesRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={paisesAbierto}
              onClick={() => setPaisesAbierto((o) => !o)}>
              Países <FiChevronDown className={paisesAbierto ? "lnav__chev lnav__chev--up" : "lnav__chev"} />
            </button>
            {paisesAbierto && (
              <div className="lnav__menu" role="menu">
                {paises.length === 0 && <span className="lnav__vacio">Sin países disponibles</span>}
                {paises.map((p) => (
                  <button key={p.codigo} type="button" role="menuitem"
                    onClick={() => { setPaisesAbierto(false); setMenu(false); onPaisClick?.(p); }}>
                    <FlagIcon codigo={p.codigo} size={18} /> {p.pais}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="lnav__right">
          {loginSlot}
          <button type="button" className="lnav__burger" aria-label={menu ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {menu ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
