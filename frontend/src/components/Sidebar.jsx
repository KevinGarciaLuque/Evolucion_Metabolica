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
} from "react-icons/hi2";
import { RiHeartPulseFill } from "react-icons/ri";
import "./Sidebar.css";

const menu = [
  { to: "/dashboard",       icon: HiOutlineSquares2X2,            label: "Dashboard",   rol: null      },
  { to: "/consolidado",     icon: HiOutlinePresentationChartLine, label: "Consolidado", rol: null      },
  { to: "/pacientes",       icon: HiOutlineUsers,                 label: "Pacientes",   rol: null      },
  { to: "/analisis/subir",  icon: HiOutlineDocumentArrowUp,       label: "Subir PDF",   rol: null      },
  { to: "/bitacora",        icon: HiOutlineBookOpen,              label: "Registro Clínico", rol: null },
  { to: "/usuarios",        icon: HiOutlineUserGroup,             label: "Usuarios",    rol: "admin"   },  { to: "/mensajes",         icon: HiOutlineChatBubbleLeftEllipsis, label: "Mensajes",    rol: "admin"   },  { to: "/auditoria",       icon: HiOutlineShieldCheck,           label: "Auditoría",   rol: "admin"   },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const { usuario } = useAuth();

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
          {menu.filter(({ rol }) => !rol || usuario?.rol === rol).map(({ to, icon: Icon, label }) => (
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
          ))}
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

