import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiOutlineUser, HiOutlineLifebuoy, HiOutlineArrowRightOnRectangle, HiOutlineInformationCircle,
  HiOutlineXMark, HiOutlineEnvelope, HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";
import InstalarApp from "./InstalarApp";
import "./MenuUsuario.css";

// Contacto de soporte (opcional): se configura con variables de entorno de Vite, p. ej.
//   VITE_SOPORTE_EMAIL=soporte@midominio.com   VITE_SOPORTE_WHATSAPP=5215512345678
// Si no están definidas, la ayuda no muestra datos de contacto.
const SOPORTE_EMAIL = import.meta.env.VITE_SOPORTE_EMAIL;
const SOPORTE_WHATSAPP = import.meta.env.VITE_SOPORTE_WHATSAPP;

function iniciales(nombre = "") {
  const p = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function Avatar({ nombre, grande }) {
  return <div className={`mu-avatar${grande ? " mu-avatar--grande" : ""}`}>{iniciales(nombre)}</div>;
}

function Modal({ titulo, icono: Icono, onClose, children }) {
  // Se pinta en <body> para que no lo recorte la barra superior
  return createPortal(
    <motion.div className="mu-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="mu-modal" role="dialog" aria-label={titulo}
        initial={{ y: 24, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mu-modal-head">
          <h3><Icono size={20} /> {titulo}</h3>
          <button type="button" className="mu-x" onClick={onClose} aria-label="Cerrar"><HiOutlineXMark size={18} /></button>
        </div>
        <div className="mu-modal-body">{children}</div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/**
 * Menú desplegable del usuario (barra superior). Se monta dentro de `.topbar-user`.
 *  - usuario: { nombre, subtitulo, rol, datos: [[etiqueta, valor], …] }
 *  - abierto / onCerrar: controlan el desplegable
 *  - onAcerca: (opcional) agrega "Acerca del sistema"
 */
export default function MenuUsuario({ abierto, onCerrar, usuario, onLogout, onAcerca, nombreApp = "la app" }) {
  const [modal, setModal] = useState(null); // "perfil" | "ayuda" | null
  const abrir = (m) => { setModal(m); onCerrar(); };

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.div
            className="mu-panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
          >
            <div className="mu-cabecera">
              <Avatar nombre={usuario.nombre} />
              <div className="mu-cabecera-texto">
                <div className="mu-nombre">{usuario.nombre}</div>
                {usuario.subtitulo && <div className="mu-sub">{usuario.subtitulo}</div>}
                {usuario.rol && <span className="mu-rol">{usuario.rol}</span>}
              </div>
            </div>

            <div className="mu-lista">
              <button type="button" className="mu-item" onClick={() => abrir("perfil")}>
                <span className="mu-icono"><HiOutlineUser size={18} /></span> Mi perfil
              </button>
              <button type="button" className="mu-item" onClick={() => abrir("ayuda")}>
                <span className="mu-icono"><HiOutlineLifebuoy size={18} /></span> Ayuda y soporte
              </button>
              {onAcerca && (
                <button type="button" className="mu-item" onClick={() => { onCerrar(); onAcerca(); }}>
                  <span className="mu-icono"><HiOutlineInformationCircle size={18} /></span> Acerca del sistema
                </button>
              )}
              <div className="mu-separador" />
              <button type="button" className="mu-item mu-item--salir" onClick={onLogout}>
                <span className="mu-icono"><HiOutlineArrowRightOnRectangle size={18} /></span> Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal === "perfil" && (
          <Modal titulo="Mi perfil" icono={HiOutlineUser} onClose={() => setModal(null)}>
            <div className="mu-perfil-cab">
              <Avatar nombre={usuario.nombre} grande />
              <div>
                <div className="mu-perfil-nombre">{usuario.nombre}</div>
                {usuario.rol && <span className="mu-rol mu-rol--claro">{usuario.rol}</span>}
              </div>
            </div>
            <dl className="mu-datos">
              {usuario.subtitulo && <><dt>Usuario / correo</dt><dd>{usuario.subtitulo}</dd></>}
              {(usuario.datos || []).filter(([, v]) => v).map(([k, v]) => (<span key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></span>))}
            </dl>
            <p className="mu-nota">Para cambiar tu nombre, correo, contraseña o permisos, pídeselo a un administrador.</p>
          </Modal>
        )}

        {modal === "ayuda" && (
          <Modal titulo="Ayuda y soporte" icono={HiOutlineLifebuoy} onClose={() => setModal(null)}>
            <ul className="mu-ayuda">
              <li><strong>Instalar {nombreApp} como app.</strong> Desde el login puedes instalarla para abrirla desde el inicio de tu celular o computadora. En iPhone: Safari → Compartir → Agregar a pantalla de inicio.</li>
              <li><strong>Actualizar.</strong> Cuando aparece “Hay una nueva versión”, toca <em>Actualizar ahora</em> para ver los últimos cambios.</li>
              <li><strong>Novedades.</strong> El botón ✨ de la barra superior muestra qué cambió en cada versión.</li>
              <li><strong>Algo no carga.</strong> Cierra la app por completo y vuelve a abrirla; si sigue igual, cierra sesión y entra de nuevo.</li>
            </ul>
            <InstalarApp nombre={nombreApp} />
            {(SOPORTE_EMAIL || SOPORTE_WHATSAPP) && (
              <div className="mu-contacto">
                {SOPORTE_EMAIL && <a href={`mailto:${SOPORTE_EMAIL}`}><HiOutlineEnvelope size={18} /> {SOPORTE_EMAIL}</a>}
                {SOPORTE_WHATSAPP && <a href={`https://wa.me/${String(SOPORTE_WHATSAPP).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><HiOutlineChatBubbleLeftRight size={18} /> WhatsApp</a>}
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
