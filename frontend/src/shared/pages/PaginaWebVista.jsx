// Plantilla visual única de la página web de un país. Recibe el contenido (JSON) y lo dibuja:
// portada, sobre nosotros, servicios, contacto y botón de acceso al sistema.
import FlagIcon from "../components/FlagIcon";
import logoRenaced from "../../assets/RENACED1.png";

// Logo propio de cada sistema (si no hay, se usa la bandera + título).
const LOGOS = { renaced: logoRenaced };

export default function PaginaWebVista({ pagina, onIniciarSesion }) {
  const logo = LOGOS[pagina.sistema];
  const c = pagina.contenido || {};
  const color = c.color || "#0b3a6b";
  const contacto = c.contacto || {};
  const hayContacto = contacto.correo || contacto.telefono || contacto.direccion || contacto.whatsapp;

  const seccion = { maxWidth: 1000, margin: "0 auto", padding: "56px 24px" };
  const titulo = { fontSize: 26, fontWeight: 700, color, margin: "0 0 16px" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1e293b", background: "#fff", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 24px", background: logo ? "#fff" : color, color: logo ? color : "#fff", boxShadow: logo ? "0 1px 8px rgba(0,0,0,0.1)" : "none" }}>
        {logo ? (
          <img src={logo} alt={c.titulo} style={{ height: 48, width: "auto", display: "block" }} />
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
            <FlagIcon codigo={pagina.codigo} size={22} /> {c.titulo}
          </span>
        )}
        <nav style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 14 }}>
          <a href="#sobre-nosotros" style={{ color: "inherit", textDecoration: "none" }}>Sobre nosotros</a>
          <a href="#servicios" style={{ color: "inherit", textDecoration: "none" }}>Servicios</a>
          <a href="#contacto" style={{ color: "inherit", textDecoration: "none" }}>Contacto</a>
          <button onClick={onIniciarSesion} style={{ background: logo ? color : "#fff", color: logo ? "#fff" : color, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
            Iniciar sesión
          </button>
        </nav>
      </header>

      <section style={{ background: `linear-gradient(135deg, ${color}, #1d4ed8)`, color: "#fff", textAlign: "center", padding: "90px 24px" }}>
        {logo && (
          <div style={{ display: "inline-block", background: "#fff", borderRadius: 18, padding: "18px 28px", marginBottom: 22, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
            <img src={logo} alt={c.titulo} style={{ height: 120, width: "auto", display: "block" }} />
          </div>
        )}
        <h1 style={{ fontSize: 40, margin: "0 0 14px" }}>{c.titulo}</h1>
        <p style={{ fontSize: 18, opacity: 0.9, maxWidth: 640, margin: "0 auto 28px" }}>{c.eslogan}</p>
        <button onClick={onIniciarSesion} style={{ background: "#fff", color, border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          Acceder al sistema
        </button>
      </section>

      <section id="sobre-nosotros" style={seccion}>
        <h2 style={titulo}>Sobre nosotros</h2>
        <p style={{ lineHeight: 1.7, fontSize: 16, margin: 0 }}>{c.sobre_nosotros}</p>
      </section>

      {!!c.servicios?.length && (
        <section id="servicios" style={{ background: "#f1f5f9" }}>
          <div style={seccion}>
            <h2 style={titulo}>Servicios</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
              {c.servicios.map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ margin: "0 0 8px", color }}>{s.titulo}</h3>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{s.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="contacto" style={seccion}>
        <h2 style={titulo}>Contacto</h2>
        {hayContacto ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 2 }}>
            {contacto.correo && <li>✉️ {contacto.correo}</li>}
            {contacto.telefono && <li>📞 {contacto.telefono}</li>}
            {contacto.whatsapp && <li>💬 WhatsApp: {contacto.whatsapp}</li>}
            {contacto.direccion && <li>📍 {contacto.direccion}</li>}
          </ul>
        ) : (
          <p style={{ color: "#64748b", margin: 0 }}>Próximamente publicaremos los datos de contacto.</p>
        )}
      </section>

      <footer style={{ background: color, color: "#cbd5e1", textAlign: "center", padding: "18px 20px", fontSize: 13 }}>
        © {new Date().getFullYear()} {c.titulo} · Todos los derechos reservados
      </footer>
    </div>
  );
}
