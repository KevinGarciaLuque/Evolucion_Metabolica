import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { HiOutlineArrowRightOnRectangle, HiChevronDown } from "react-icons/hi2";
import "./Layout.css";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const { usuario, logout }           = useAuth();
  const navigate                      = useNavigate();
  const menuRef                       = useRef(null);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const ROL_LABEL = { admin: "Administrador", doctor: "Doctor", asistente: "Asistente" };

  return (
    <div className="layout">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Topbar desktop ───────────────────────────────────────────── */}
      <header className={`topbar${collapsed ? " topbar--collapsed" : ""}`}>
        {/* Barra móvil: hamburguesa + brand */}
        <button
          className="hamburger"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Abrir menú"
        >
          <span /><span /><span />
        </button>
        <span className="mobile-brand">🩺 Evolución Metabólica</span>

        {/* Espaciador */}
        <div style={{ flex: 1 }} />

        {/* Nombre centrado solo en móvil */}
        <span className="topbar-mobile-brand">Evolución Metabólica</span>

        <div style={{ flex: 1 }} />

        {/* Perfil de usuario */}
        <div className="topbar-user" ref={menuRef}>
          <button
            className={`topbar-user-btn${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div className="topbar-avatar">
              {usuario?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{usuario?.nombre}</span>
              <span className="topbar-user-role">{ROL_LABEL[usuario?.rol] || usuario?.rol}</span>
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

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <main className={`layout-main${collapsed ? " layout-main--collapsed" : ""}`}>
        {children}
      </main>
    </div>
  );
}
