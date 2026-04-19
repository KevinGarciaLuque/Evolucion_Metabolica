import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { HiOutlineArrowRightOnRectangle, HiChevronDown, HiOutlineInformationCircle, HiOutlineXMark } from "react-icons/hi2";
import "./Layout.css";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [infoOpen, setInfoOpen]       = useState(false);
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
              <button className="topbar-dropdown-item" onClick={() => { setInfoOpen(true); setMenuOpen(false); }}>
                <HiOutlineInformationCircle size={16} />
                Acerca del sistema
              </button>
              <div className="topbar-dropdown-divider" />
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

      {/* ── Modal: Acerca del sistema ─────────────────────────────────── */}
      {infoOpen && (
        <div className="info-modal-overlay" onClick={() => setInfoOpen(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <HiOutlineInformationCircle size={22} color="#6366f1" />
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Acerca del Sistema</h2>
              </div>
              <button className="info-modal-close" onClick={() => setInfoOpen(false)}>
                <HiOutlineXMark size={20} />
              </button>
            </div>
            <div className="info-modal-body">
              <p className="info-modal-lead">
                <strong>Evolución Metabólica</strong> es un sistema clínico especializado en el seguimiento de pacientes con diabetes mellitus tipo 1 y condiciones metabólicas relacionadas.
              </p>

              <div className="info-section">
                <h3>Módulos del sistema</h3>
                <ul className="info-list">
                  <li>
                    <span className="info-badge info-badge-blue">Dashboard</span>
                    Resumen general con estadísticas de pacientes activos, alertas de riesgo y próximas citas del día.
                  </li>
                  <li>
                    <span className="info-badge info-badge-purple">Consolidado</span>
                    Vista global de todos los pacientes con sus indicadores ISPAD (TIR, TAR, TBR, GMI), semáforo de riesgo y última clasificación glucémica.
                  </li>
                  <li>
                    <span className="info-badge info-badge-green">Pacientes</span>
                    Gestión completa de pacientes: datos clínicos, historial de análisis MCG (monitor continuo de glucosa), insulina, alimentación y evolución gráfica de indicadores.
                  </li>
                  <li>
                    <span className="info-badge info-badge-yellow">Subir PDF</span>
                    Carga y procesamiento automático de reportes PDF del MCG. El sistema extrae los valores de TIR, TAR, TBR, GMI y HbA1c mediante inteligencia artificial.
                  </li>
                  <li>
                    <span className="info-badge info-badge-teal">Registro Clínico</span>
                    Registro de consultas médicas por paciente: peso, talla, glucosa en ayunas, HbA1c, tensión arterial, medicamentos, observaciones y plan de tratamiento.
                  </li>
                  <li>
                    <span className="info-badge info-badge-gray">Usuarios</span>
                    Administración de cuentas del sistema con roles: Administrador, Doctor y Asistente. Solo visible para administradores.
                  </li>
                  <li>
                    <span className="info-badge info-badge-red">Auditoría</span>
                    Registro de todas las acciones realizadas en el sistema: inicios de sesión, creación, edición y eliminación de registros. Solo visible para administradores.
                  </li>
                </ul>
              </div>

              <div className="info-footer">
                <span>v1.0.0 · © {new Date().getFullYear()} Kevin Garcia · Todos los derechos reservados</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
