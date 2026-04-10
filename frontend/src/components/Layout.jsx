import { useState } from "react";
import Sidebar from "./Sidebar";
import "./Layout.css";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="layout">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Barra superior móvil */}
      <header className="mobile-topbar">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Abrir menú"
        >
          <span /><span /><span />
        </button>
        <span className="mobile-brand">🩺 Evolución Metabólica</span>
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
