import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRenacedAuth } from "../context/RenacedAuthContext";
import { impersonarTenant } from "../api/adminApi";
import FlagIcon from "./FlagIcon";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineDocumentArrowUp,
  HiOutlineDocumentArrowDown,
  HiOutlinePresentationChartLine,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlineShieldCheck,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineMapPin,
  HiOutlineLockOpen,
  HiOutlineGlobeAmericas,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2";
import "./Sidebar.css";

// modulo: clave para verificar permiso | rol: restringe a ese rol exacto | null = público
const menuHonduras = [
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
  { to: "/permisos",           icon: HiOutlineLockOpen,               label: "Permisos",         modulo: "permisos", rol: "admin"},
  { to: "/usuarios",           icon: HiOutlineUserGroup,              label: "Usuarios",         modulo: "usuarios", rol: "admin"},
  { to: "/auditoria",          icon: HiOutlineShieldCheck,            label: "Auditoría",        modulo: "auditoria", rol: "admin"},
];

const menuRenacedMx = [
  { to: "/renaced/dashboard",  icon: HiOutlineSquares2X2,             label: "Dashboard" },
  { to: "/renaced/pacientes",  icon: HiOutlineClipboardDocumentList,  label: "Pacientes" },
  { to: "/renaced/consultas",  icon: HiOutlineBookOpen,               label: "Consultas" },
  { to: "/renaced/reportes",   icon: HiOutlineDocumentArrowDown,      label: "Reportes"  },
  { to: "/renaced/usuarios",   icon: HiOutlineUserGroup,              label: "Usuarios"  },
];

function itemVisible(item, usuario, permisos) {
  const { rol, modulo } = item;
  // Gate a nivel de país: si el Super Admin deshabilitó el módulo para este país,
  // nadie lo ve — ni siquiera admin/SUPER_ADMIN.
  if (modulo && Array.isArray(usuario?.modulos) && !usuario.modulos.includes(modulo)) return false;
  if (rol) return usuario?.rol === rol || (rol === "admin" && usuario?.rol === "SUPER_ADMIN");
  if (usuario?.rol === "admin" || usuario?.rol === "SUPER_ADMIN") return true;
  if (permisos === null) return true;
  return modulo ? permisos.includes(modulo) : true;
}

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const { usuario, permisos } = useAuth();
  const { usuario: usuarioRenaced, setSession: setSessionRenaced } = useRenacedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const esSuperAdmin = usuario?.rol === "SUPER_ADMIN";
  const [entrandoTenant, setEntrandoTenant] = useState(null);

  async function entrarComoSuperAdmin(codigo, to) {
    try {
      if (usuarioRenaced?.tenant !== codigo) {
        setEntrandoTenant(codigo);
        const { data } = await impersonarTenant(codigo);
        setSessionRenaced(data.token, data.usuario);
      }
      onClose?.();
      navigate(to);
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo acceder al país");
    } finally {
      setEntrandoTenant(null);
    }
  }

  const [gruposAbiertos, setGruposAbiertos] = useState(() => {
    try {
      const guardado = localStorage.getItem("sidebar_grupos_abiertos");
      return guardado ? JSON.parse(guardado) : { honduras: true, mexico: true };
    } catch {
      return { honduras: true, mexico: true };
    }
  });

  function toggleGrupo(key) {
    setGruposAbiertos((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sidebar_grupos_abiertos", JSON.stringify(next));
      return next;
    });
  }

  const itemsHonduras = menuHonduras.filter((item) => itemVisible(item, usuario, permisos));

  function renderLink(item) {
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
  }

  function renderLinkTenant(item, codigo) {
    const { to, icon: Icon, label } = item;
    const activo = location.pathname === to || location.pathname.startsWith(`${to}/`);
    return (
      <button
        key={to}
        type="button"
        className={`sidebar-link${activo ? " active" : ""}`}
        disabled={entrandoTenant === codigo}
        onClick={() => entrarComoSuperAdmin(codigo, to)}
      >
        <span className="sidebar-icon"><Icon size={20} /></span>
        <span className="sidebar-link-label">{label}</span>
      </button>
    );
  }

  function renderSeccion(titulo) {
    return (
      <div className="sidebar-section-label">
        {!collapsed && <span>{titulo}</span>}
        {collapsed && <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />}
      </div>
    );
  }

  function renderGrupo(key, titulo, items, renderItem = renderLink, codigoBandera = null) {
    const abierto = gruposAbiertos[key] !== false;
    return (
      <div key={key} className="sidebar-group">
        <button
          type="button"
          className="sidebar-section-label sidebar-section-toggle"
          onClick={() => toggleGrupo(key)}
        >
          {!collapsed && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {codigoBandera && <FlagIcon codigo={codigoBandera} size={12} />}
              {titulo}
            </span>
          )}
          {collapsed && <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />}
          {!collapsed && <HiChevronDown size={13} className={`sidebar-section-chevron${abierto ? " open" : ""}`} />}
        </button>
        {(abierto || collapsed) && items.map(renderItem)}
      </div>
    );
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
            <FlagIcon codigo="hn" size={22} />
          </div>
          <div className="sidebar-brand-text">
            <p className="sidebar-title">SAAPD</p>
            <p className="sidebar-subtitle">Honduras</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {esSuperAdmin ? (
            <>
              {renderSeccion("SUPER ADMIN")}
              {renderLink({ to: "/admin/panel", icon: HiOutlineGlobeAmericas, label: "Panel Admin" })}
              {renderGrupo("honduras", "HONDURAS · SAAPD", itemsHonduras, renderLink, "hn")}
              {renderGrupo("mexico", "MÉXICO · RENACED", menuRenacedMx, (item) => renderLinkTenant(item, "mx"), "mx")}
            </>
          ) : (
            <>
              {renderSeccion("EVOLUCIÓN METABÓLICA")}
              {itemsHonduras.map(renderLink)}
            </>
          )}
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
