import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../../shared/components/Layout";
import FlagIcon from "../../../shared/components/FlagIcon";
import { getPaginasWeb, crearPaginaWeb, cambiarEstadoPaginaWeb } from "../api/adminApi";

export default function PaginasWeb() {
  const [paginas, setPaginas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(null);

  const cargar = () =>
    getPaginasWeb()
      .then((r) => setPaginas(r.data))
      .catch((e) => setError(e.response?.data?.error || "No se pudieron cargar las páginas"))
      .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  const accion = async (codigo, fn) => {
    setOcupado(codigo); setError("");
    try {
      const { data } = await fn();
      setPaginas((ps) => ps.map((p) => (p.codigo === codigo ? data : p)));
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo completar la acción");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Layout>
      <div style={{ padding: 24, maxWidth: 1000 }}>
        <h1 style={{ margin: "0 0 4px" }}>Páginas Web</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          Página pública de cada país, previa al inicio de sesión. Mientras esté inactiva, el país entra directo al login.
        </p>
        {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, marginBottom: 12 }}>{error}</div>}

        {cargando ? <p style={{ color: "#94a3b8" }}>Cargando…</p> : (
          <div style={{ display: "grid", gap: 12 }}>
            {paginas.map((p) => (
              <div key={p.codigo} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, flexWrap: "wrap" }}>
                <FlagIcon codigo={p.codigo} size={28} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong>{p.pais}</strong>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{window.location.origin}{p.ruta}</div>
                </div>

                {!p.creada ? (
                  <button className="btn btn-primary" disabled={ocupado === p.codigo}
                    onClick={() => accion(p.codigo, () => crearPaginaWeb(p.codigo))}>
                    Crear página
                  </button>
                ) : (
                  <>
                    <Link className="btn" to={`/admin/paginas-web/${p.codigo}/vista-previa`}>Vista previa</Link>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={p.activa} disabled={ocupado === p.codigo}
                        onChange={(e) => accion(p.codigo, () => cambiarEstadoPaginaWeb(p.codigo, e.target.checked))} />
                      <span style={{ fontWeight: 600, color: p.activa ? "#16a34a" : "#94a3b8" }}>
                        {p.activa ? "Activa" : "Inactiva"}
                      </span>
                    </label>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
