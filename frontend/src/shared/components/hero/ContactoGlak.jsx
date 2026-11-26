import { FiMessageCircle } from "react-icons/fi";
import "./SobreNosotros.css";

// WhatsApp de contacto de GLAK (código de país + número, sin signos ni espacios).
const WHATSAPP = "50496065564";
const WHATSAPP_VISIBLE = "+504 9606 5564";
const MENSAJE = "Hola GLAK, me interesa conocer más sobre el Registro Latinoamericano de Diabetes.";

export default function ContactoGlak() {
  return (
    <section id="contacto" className="sn" aria-labelledby="ct-titulo" style={{ paddingTop: 64 }}>
      <div className="sn__inner">
        <div className="sn__head" style={{ marginBottom: 0 }}>
          <span className="sn__eyebrow"><i /> Contacto</span>
          <h2 id="ct-titulo" className="sn__title">
            Hablemos con <span>GLAK</span>
          </h2>
          <p className="sn__lead">
            ¿Quieres sumar tu país o institución al registro, o conocer cómo funciona la
            plataforma? Escríbenos y con gusto te contamos.
          </p>
          <a target="_blank" rel="noopener noreferrer"
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginTop: 24, textDecoration: "none",
              padding: "14px 28px", borderRadius: 14, fontWeight: 700, fontSize: 15, color: "#062038",
              background: "linear-gradient(135deg, #2dd4bf, #38bdf8)",
              border: "1px solid rgba(125, 211, 252, 0.45)",
              boxShadow: "0 10px 30px rgba(56, 189, 248, 0.28), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}>
            <FiMessageCircle /> Escríbenos por WhatsApp
          </a>
          <p className="sn__lead" style={{ marginTop: 14, fontSize: 14 }}>{WHATSAPP_VISIBLE}</p>
        </div>
      </div>
    </section>
  );
}
