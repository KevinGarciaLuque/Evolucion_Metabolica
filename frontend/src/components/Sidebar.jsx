import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineDocumentArrowUp,
  HiOutlinePresentationChartLine,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlineShieldCheck,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineMapPin,
  HiOutlineLockOpen,
  HiOutlineGlobeAmericas,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2";
import { RiHeartPulseFill } from "react-icons/ri";
import "./Sidebar.css";

// modulo: clave para verificar permiso | rol: restringe a ese rol exacto | null = público
// seccion: agrupa ítems con un separador visual
const menu = [
  // ── Evolucion Metabólica ────────────────────────────────────────────────────
  { seccion: "EVOLUCIÓN METABÓLICA" },
  { to: "/dashboard",          icon: HiOutlineSquares2X2,             label: "Dashboard",        modulo: "dashboard"       },
  { to: "/consolidado",        icon: HiOutlinePresentationChartLine,  label: "Consolidado",      modulo: "consolidado"     },
  { to: "/pacientes",          icon: HiOutlineUsers,                  label: "Pacientes",        modulo: "pacientes"       },
  { to: "/analisis/subir",     icon: HiOutlineDocumentArrowUp,        label: "Analizar PDF",     modulo: "analisis"        },
  { to: "/consultas",          icon: HiOutlineBookOpen,               label: "Consultas",        modulo: "consultas"       },
  { to: "/mapa",               icon: HiOutlineMapPin,                 label: "Mapa",             modulo: "mapa"            },
  { to: "/mensajes",           icon: HiOutlineChatBubbleLeftEllipsis, label: "Mensajes",         modulo: "mensajes"        },
  { to: "/reportes",           icon: HiOutlinePresentationChartLine,  label: "Reportes",         modulo: "reportes"        },
  { to: "/importaciones/heu",  icon: HiOutlineDocumentArrowUp,        label: "Importación HEU",  modulo: "importaciones"   },
  { to: "/backup-pacientes",   icon: HiOutlineDocumentArrowUp,        label: "Backup Pacientes", modulo: "backup_pacientes"},
  { to: "/permisos",           icon: HiOutlineLockOpen,               label: "Permisos",         modulo: null, rol: "admin"},
  { to: "/usuarios",           icon: HiOutlineUserGroup,              label: "Usuarios",         modulo: null, rol: "admin"},
  { to: "/auditoria",          icon: HiOutlineShieldCheck,            label: "Auditoría",        modulo: null, rol: "admin"},

  // ── Super Admin ─────────────────────────────────────────────────────────────
  { seccion: "SUPER ADMIN", rol: "SUPER_ADMIN" },
  { to: "/admin/panel", icon: HiOutlineGlobeAmericas, label: "Panel Admin", modulo: null, rol: "SUPER_ADMIN" },

  // ── RENACED México ──────────────────────────────────────────────────────────
  { seccion: "RENACED 🇲🇽" },
  { to: "/renaced/dashboard",  icon: HiOutlineGlobeAmericas,          label: "Dashboard",        modulo: "renaced"         },
  { to: "/renaced/pacientes",  icon: HiOutlineClipboardDocumentList,  label: "Pacientes",        modulo: "renaced"         },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const { usuario, permisos } = useAuth();

  const itemsVisibles = menu.filter((item) => {
    if (item.seccion) {
      // Ocultar sección SUPER ADMIN si no tiene ese rol
      if (item.rol) return usuario?.rol === item.rol;
      return true;
    }
    const { rol, modulo } = item;
    if (rol) return usuario?.rol === rol || (rol === "admin" && usuario?.rol === "SUPER_ADMIN");
    if (usuario?.rol === "admin" || usuario?.rol === "SUPER_ADMIN") return true;
    if (permisos === null) return true;
    return modulo ? permisos.includes(modulo) : true;
  });

  return (
    <aside className={`sidebar${isOpen ? " sidebar--open" : ""}${collapsed ? " sidebar--collapsed" : ""}`}>

      {/* Botón colapsar — flota en el borde derecho */}
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? <HiChevronRight size={13} /> : <HiChevronLeft size={13} />}
      </button>

      {/* Contenido con overflow:hidden para animar el colapso */}
      <div className="sidebar-content">

        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap">
            <RiHeartPulseFill size={22} color="#fff" />
          </div>
          <div className="sidebar-brand-text">
            <p className="sidebar-title">Evolución</p>
            <p className="sidebar-subtitle">Metabólica</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {itemsVisibles.map((item, idx) => {
            if (item.seccion) {
              return (
                <div key={`sec-${idx}`} className="sidebar-section-label">
                  {!collapsed && <span>{item.seccion}</span>}
                  {collapsed && <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />}
                </div>
              );
            }
            const { to, icon: Icon, label } = item;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                title={label}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                <span className="sidebar-icon"><Icon size={20} /></span>
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-version">
          <span className="sidebar-version-label">v1.0.0</span>
          <span className="sidebar-version-name">Evol. Metabólica</span>
          <span className="sidebar-version-copy">
            © {new Date().getFullYear()} Kevin Garcia
          </span>
          <span className="sidebar-version-rights">Todos los derechos reservados</span>
        </div>

      </div>
    </aside>
  );
}

