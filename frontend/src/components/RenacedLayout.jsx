import { useState, useRef, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useRenacedAuth } from "../context/RenacedAuthContext";
import {
  HiOutlineArrowRightOnRectangle, HiChevronDown,
  HiOutlineSquares2X2, HiOutlineUsers, HiOutlineDocumentArrowDown,
  HiChevronLeft, HiChevronRight, HiOutlineUserGroup,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2";
import FlagIcon from "./FlagIcon";
import "./Layout.css";
import "./Sidebar.css";

const MENU_BASE = [
  { to: "/renaced/dashboard",  icon: HiOutlineSquares2X2,            label: "Dashboard" },
  { to: "/renaced/pacientes",  icon: HiOutlineUsers,                  label: "Pacientes" },
  { to: "/renaced/consultas",  icon: HiOutlineClipboardDocumentList,  label: "Consultas" },
  { to: "/renaced/reportes",   icon: HiOutlineDocumentArrowDown,      label: "Reportes"  },
];
const MENU_ADMIN = [
  { to: "/renaced/usuarios",  icon: HiOutlineUserGroup,         label: "Usuarios"  },
];

const PERFIL_LABEL = { 1: "Administrador", 2: "Médico", 3: "Asistente", 4: "Enfermera" };

export default function RenacedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(() => localStorage.getItem("renaced_sidebar_collapsed") === "true");
  const [menuOpen, setMenuOpen]       = useState(false);
  const { usuario, logout }           = useRenacedAuth();
  const navigate                      = useNavigate();
  const menuRef                       = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className={`topbar${collapsed ? " topbar--collapsed" : ""}`}>
        <button className="hamburger" onClick={() => setSidebarOpen((o) => !o)} aria-label="Abrir menú">
          <span /><span /><span />
        </button>
        <span className="mobile-brand" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FlagIcon codigo={usuario?.tenant} size={14} /> RENACED
        </span>
        <div style={{ flex: 1 }} />

        <div className="topbar-user" ref={menuRef}>
          <button className={`topbar-user-btn${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen((o) => !o)}>
            <div className="topbar-avatar" style={{ background: "#1a4a7a" }}>
              {usuario?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{usuario?.nombre}</span>
              <span className="topbar-user-role">{PERFIL_LABEL[usuario?.perfil_id] || "Usuario"}</span>
            </div>
            <HiChevronDown size={16} className={`topbar-chevron${menuOpen ? " rotated" : ""}`} />
          </button>
          {menuOpen && (
            <div className="topbar-dropdown">
              <button className="topbar-dropdown-item danger" onClick={handleLogout}>
                <HiOutlineArrowRightOnRectangle size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? " sidebar--open" : ""}${collapsed ? " sidebar--collapsed" : ""}`}>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => { const n = !c; localStorage.setItem("renaced_sidebar_collapsed", String(n)); return n; })}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <HiChevronRight size={13} /> : <HiChevronLeft size={13} />}
        </button>

        <div className="sidebar-content">
          <div className="sidebar-brand">
            <div className="sidebar-logo-wrap" style={{ background: "#1a4a7a" }}>
              <FlagIcon codigo={usuario?.tenant} size={18} />
            </div>
            <div className="sidebar-brand-text">
              <p className="sidebar-title">RENACED</p>
              <p className="sidebar-subtitle">{usuario?.tenant_nombre || "—"}</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section-label">
              {!collapsed && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FlagIcon codigo={usuario?.tenant} size={12} />
                  RENACED {(usuario?.tenant || "").toUpperCase()}
                </span>
              )}
              {collapsed && <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />}
            </div>
            {MENU_BASE.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} title={label}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <span className="sidebar-icon"><Icon size={20} /></span>
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
            ))}
            {usuario?.perfil_id === 1 && (
              <>
                <div className="sidebar-section-label" style={{ marginTop: 12 }}>
                  {!collapsed && <span>ADMINISTRACIÓN</span>}
                  {collapsed && <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />}
                </div>
                {MENU_ADMIN.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} title={label}
                    className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                    <span className="sidebar-icon"><Icon size={20} /></span>
                    <span className="sidebar-link-label">{label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <div className="sidebar-version">
            <span className="sidebar-version-label">v1.0.0</span>
            <span className="sidebar-version-name">RENACED México</span>
            <span className="sidebar-version-copy">© {new Date().getFullYear()} Kevin Garcia</span>
          </div>
        </div>
      </aside>

      <main className={`layout-main${collapsed ? " layout-main--collapsed" : ""}`}>
        {children}
      </main>
    </div>
  );
}
