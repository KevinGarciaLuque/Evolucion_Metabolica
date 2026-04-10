import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const menu = [
  { to: "/dashboard",  icon: "📊", label: "Dashboard" },
  { to: "/pacientes",  icon: "🧍", label: "Pacientes" },
  { to: "/analisis/subir", icon: "📄", label: "Subir PDF" },
  { to: "/consolidado", icon: "📈", label: "Consolidado" },
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
      <div className="sidebar-brand">
        <span className="sidebar-logo">🩺</span>
        <div className="sidebar-brand-text">
          <p className="sidebar-title">Evolución</p>
          <p className="sidebar-subtitle">Metabólica</p>
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            title={item.label}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" title={usuario?.nombre}>{usuario?.nombre?.[0]?.toUpperCase()}</div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{usuario?.nombre}</p>
            <p className="sidebar-user-role">{usuario?.rol}</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </aside>
  );
}

