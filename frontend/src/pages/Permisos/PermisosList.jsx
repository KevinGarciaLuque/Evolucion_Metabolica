import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const MODULOS = [
  { key: "dashboard",   label: "Dashboard" },
  { key: "consolidado", label: "Consolidado" },
  { key: "pacientes",   label: "Pacientes" },
  { key: "analisis",    label: "Subir PDF" },
  { key: "consultas",   label: "Consultas" },
  { key: "mapa",        label: "Mapa" },
  { key: "mensajes",    label: "Mensajes" },
];

const ROL_BADGE = {
  doctor:    "badge-blue",
  asistente: "badge-pink",
  enfermera: "badge-teal",
};

const ROL_LABEL = {
  doctor:    "Doctor",
  asistente: "Asistente",
  enfermera: "Enfermera",
};

export default function PermisosList() {
  const [usuarios, setUsuarios]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);
  const [buscar, setBuscar]       = useState("");
  // { [usuarioId]: string[] | null }
  const [permisos, setPermisos]   = useState({});
  // { [usuarioId]: "idle" | "guardando" | "ok" | "error" }
  const [estados, setEstados]     = useState({});

  useEffect(() => {
    setCargando(true);
    api.get("/permisos")
      .then((r) => {
        setUsuarios(r.data);
        const inicial = {};
        r.data.forEach((u) => {
          // null significa "sin configurar" → mostramos todos marcados por defecto
          inicial[u.id] = u.modulos ?? MODULOS.map((m) => m.key);
        });
        setPermisos(inicial);
      })
      .catch((err) => setError(err.response?.data?.error || "Error al cargar permisos"))
      .finally(() => setCargando(false));
  }, []);

  function toggleModulo(usuarioId, key) {
    setPermisos((prev) => {
      const actuales = prev[usuarioId] ?? [];
      const nuevo = actuales.includes(key)
        ? actuales.filter((m) => m !== key)
        : [...actuales, key];
      return { ...prev, [usuarioId]: nuevo };
    });
  }

  function toggleTodos(usuarioId, marcarTodos) {
    setPermisos((prev) => ({
      ...prev,
      [usuarioId]: marcarTodos ? MODULOS.map((m) => m.key) : [],
    }));
  }

  async function guardar(usuarioId) {
    setEstados((prev) => ({ ...prev, [usuarioId]: "guardando" }));
    try {
      await api.put(`/permisos/${usuarioId}`, { modulos: permisos[usuarioId] ?? [] });
      setEstados((prev) => ({ ...prev, [usuarioId]: "ok" }));
      setTimeout(() => setEstados((prev) => ({ ...prev, [usuarioId]: "idle" })), 2000);
    } catch (err) {
      setEstados((prev) => ({ ...prev, [usuarioId]: "error" }));
      setTimeout(() => setEstados((prev) => ({ ...prev, [usuarioId]: "idle" })), 3000);
    }
  }

  const filtrados = usuarios.filter((u) =>
    u.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    u.email.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Permisos</h1>
          <p className="page-subtitle">Controla el acceso a módulos por usuario</p>
        </div>
      </div>

      <div className="card filtros-card">
        <div className="form-group" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
      </div>

      {cargando ? (
        <div className="loading">Cargando usuarios...</div>
      ) : error ? (
        <div style={{ padding: "20px", color: "#ef4444", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠️</span> {error}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
          No se encontraron usuarios
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtrados.map((u) => {
            const modulosUsuario = permisos[u.id] ?? [];
            const todos = modulosUsuario.length === MODULOS.length;
            const ninguno = modulosUsuario.length === 0;
            const estado = estados[u.id] || "idle";

            return (
              <div key={u.id} className="card" style={{ padding: "20px 24px" }}>
                {/* Cabecera del usuario */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: "1rem",
                    }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>{u.nombre}</p>
                      <p style={{ color: "#64748b", margin: 0, fontSize: "0.8rem" }}>{u.email}</p>
                    </div>
                    <span className={`badge ${ROL_BADGE[u.rol] || "badge-blue"}`}>
                      {ROL_LABEL[u.rol] || u.rol}
                    </span>
                  </div>

                  {/* Botones de atajos */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => toggleTodos(u.id, !todos)}
                      title={todos ? "Desmarcar todos" : "Marcar todos"}
                    >
                      {todos ? "Quitar todos" : "Dar todos"}
                    </button>
                    <button
                      className={`btn btn-sm ${estado === "guardando" ? "btn-outline" : "btn-primary"}`}
                      onClick={() => guardar(u.id)}
                      disabled={estado === "guardando"}
                    >
                      {estado === "guardando" ? "Guardando..." :
                       estado === "ok"        ? "✓ Guardado"  :
                       estado === "error"     ? "Error"       : "Guardar"}
                    </button>
                  </div>
                </div>

                {/* Grid de módulos */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "10px",
                }}>
                  {MODULOS.map(({ key, label }) => {
                    const activo = modulosUsuario.includes(key);
                    return (
                      <label
                        key={key}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                          border: `1.5px solid ${activo ? "#6366f1" : "#e2e8f0"}`,
                          background: activo ? "#eef2ff" : "#f8fafc",
                          transition: "all 0.15s",
                          fontSize: "0.88rem", fontWeight: activo ? 600 : 400,
                          color: activo ? "#4338ca" : "#475569",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={() => toggleModulo(u.id, key)}
                          style={{ accentColor: "#6366f1", width: 15, height: 15 }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>

                {ninguno && (
                  <p style={{ marginTop: 10, color: "#ef4444", fontSize: "0.82rem", margin: "10px 0 0" }}>
                    ⚠️ Sin módulos habilitados — el usuario no podrá acceder a ninguna sección.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
