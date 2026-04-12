import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineDocumentArrowUp,
  HiOutlinePresentationChartLine,
  HiOutlineArrowRightOnRectangle,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi2";
import { RiHeartPulseFill } from "react-icons/ri";
import "./Sidebar.css";

const menu = [
  { to: "/dashboard",       icon: HiOutlineSquares2X2,            label: "Dashboard"   },
  { to: "/pacientes",       icon: HiOutlineUsers,                 label: "Pacientes"   },
  { to: "/analisis/subir",  icon: HiOutlineDocumentArrowUp,       label: "Subir PDF"   },
  { to: "/consolidado",     icon: HiOutlinePresentationChartLine, label: "Consolidado" },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

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
          {menu.map(({ to, icon: Icon, label }) => (
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

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" title={usuario?.nombre}>
              {usuario?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{usuario?.nombre}</p>
              <p className="sidebar-user-role">{usuario?.rol}</p>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <HiOutlineArrowRightOnRectangle size={18} />
            <span className="sidebar-logout-label">Cerrar sesión</span>
          </button>
        </div>

      </div>
    </aside>
  );
}

