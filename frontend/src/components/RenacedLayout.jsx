import { useState, useRef, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useRenacedAuth } from "../context/RenacedAuthContext";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineArrowRightOnRectangle, HiChevronDown,
  HiOutlineSquares2X2, HiOutlineUsers, HiOutlineDocumentArrowDown,
  HiChevronLeft, HiChevronRight, HiOutlineUserGroup,
  HiOutlineClipboardDocumentList, HiOutlineDocumentArrowUp, HiOutlineMapPin,
  HiOutlineBuildingOffice2,
} from "react-icons/hi2";
import FlagIcon from "./FlagIcon";
import Layout from "./Layout";
import "./Layout.css";
import "./Sidebar.css";

const MENU_BASE = [
  { to: "/renaced/dashboard",  clave: "dashboard", icon: HiOutlineSquares2X2,            label: "Dashboard" },
  { to: "/renaced/pacientes",  clave: "pacientes", icon: HiOutlineUsers,                  label: "Pacientes" },
  { to: "/renaced/consultas",  clave: "consultas", icon: HiOutlineClipboardDocumentList,  label: "Consultas" },
  { to: "/renaced/reportes",   clave: "reportes",  icon: HiOutlineDocumentArrowDown,      label: "Reportes"  },
  { to: "/renaced/mapa",       clave: "mapa",      icon: HiOutlineMapPin,                 label: "Mapa"      },
];
const MENU_ADMIN = [
  { to: "/renaced/clinicas",  clave: "clinicas", icon: HiOutlineBuildingOffice2,   label: "Clínicas"  },
  { to: "/renaced/usuarios",  clave: "usuarios", icon: HiOutlineUserGroup,         label: "Usuarios"  },
];

const PERFIL_LABEL = { 1: "Administrador", 2: "Médico", 3: "Asistente", 4: "Enfermera", 5: "Investigador de Clínica" };

export default function RenacedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(() => localStorage.getItem("renaced_sidebar_collapsed") === "true");
  const [menuOpen, setMenuOpen]       = useState(false);
  const { usuario, logout }           = useRenacedAuth();
  const { usuario: usuarioSuperAdmin } = useAuth();
  const navigate                      = useNavigate();
  const menuRef                       = useRef(null);
  const esSuperAdmin                  = usuarioSuperAdmin?.rol === "SUPER_ADMIN" || !!usuario?.super_admin;

  const modulosActivos = Array.isArray(usuario?.modulos) ? usuario.modulos : null;
  const menuBaseVisible  = MENU_BASE.filter((m) => !modulosActivos || modulosActivos.includes(m.clave));
  let menuAdminVisible = MENU_ADMIN.filter((m) => !modulosActivos || modulosActivos.includes(m.clave));
  // Importar base de datos: exclusivo de México, no aplica a otros países RENACED,
  // y respeta el mismo toggle de módulos que el resto del sidebar.
  if (usuario?.tenant === "mx" && (!modulosActivos || modulosActivos.includes("importar_bd"))) {
    menuAdminVisible = [
      ...menuAdminVisible,
      { to: "/renaced/importar-bd", clave: "importar_bd", icon: HiOutlineDocumentArrowUp, label: "Importar BD" },
    ];
  }

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    // Regresa al login del mismo país donde estaba (hoy solo existe /renaced/login
    // para México; si se agregan más países RENACED, cada uno necesitará su propio
    // login y esta ruta deberá resolverse según usuario.tenant).
    navigate("/renaced/login");
  }

  // El Super Admin navega con el sidebar único (Sidebar.jsx), que ya lista
  // Honduras y todos los países RENACED juntos — así nunca "sale" a un
  // sidebar aparte al entrar a un país.
  if (esSuperAdmin) {
    return <Layout>{children}</Layout>;
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
            {menuBaseVisible.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} title={label}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <span className="sidebar-icon"><Icon size={20} /></span>
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
            ))}
            {usuario?.perfil_id === 1 && menuAdminVisible.length > 0 && (
              <>
                <div className="sidebar-section-label" style={{ marginTop: 12 }}>
                  {!collapsed && <span>ADMINISTRACIÓN</span>}
                  {collapsed && <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />}
                </div>
                {menuAdminVisible.map(({ to, icon: Icon, label }) => (
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
