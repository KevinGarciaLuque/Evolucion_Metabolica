import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import { getPacientes } from "../../api/renacedApi";
import { HiOutlineMagnifyingGlass, HiOutlineFunnel } from "react-icons/hi2";

export default function RenacedConsultasHub() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [busqueda, setBusqueda]   = useState("");
  const [filtroSexo, setFiltroSexo] = useState("");
  const limit = 25;

  useEffect(() => {
    setCargando(true);
    const params = { page, limit };
    if (busqueda)   params.busqueda = busqueda;
    if (filtroSexo) params.sexo     = filtroSexo;

    getPacientes(params)
      .then((r) => { setPacientes(r.data.data); setTotal(r.data.total); })
      .catch(() => setPacientes([]))
      .finally(() => setCargando(false));
  }, [page, busqueda, filtroSexo]);

  const [inputBusqueda, setInputBusqueda] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(inputBusqueda); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [inputBusqueda]);

  const totalPages = Math.ceil(total / limit);

  const badgeSexo = (sexo) => (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: sexo === "F" ? "#fce7f3" : "#dbeafe",
      color: sexo === "F" ? "#be185d" : "#1d4ed8",
    }}>
      {sexo === "F" ? "Mujer" : "Hombre"}
    </span>
  );

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Consultas Clínicas</h1>
          <p className="page-subtitle">Selecciona un paciente para registrar datos clínicos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card filtros-card">
        <div className="filtros-topbar" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <HiOutlineMagnifyingGlass size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, CURP o expediente…"
              value={inputBusqueda}
              onChange={(e) => setInputBusqueda(e.target.value)}
              style={{ paddingLeft: 34, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <HiOutlineFunnel size={14} color="#94a3b8" />
            <select
              value={filtroSexo}
              onChange={(e) => { setFiltroSexo(e.target.value); setPage(1); }}
              style={{ minWidth: 110 }}
            >
              <option value="">Todos</option>
              <option value="F">Mujeres</option>
              <option value="M">Hombres</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: "0.9rem" }}>
            {total} paciente{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </h3>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Página {page} de {totalPages || 1}</span>
        </div>

        {cargando ? (
          <div className="loading">Cargando…</div>
        ) : (
          <div className="table-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Expediente</th>
                  <th>Nombre</th>
                  <th className="hide-mobile">CURP</th>
                  <th>Sexo</th>
                  <th className="hide-mobile">Edad</th>
                  <th className="hide-mobile">Tipo DM</th>
                  <th className="hide-mobile">Unidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ color: "#94a3b8", fontSize: 12 }}>{(page - 1) * limit + idx + 1}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "#6366f1" }}>
                      {p.expediente || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td>
                      <span
                        onClick={() => navigate(`/renaced/consultas/${p.id}`)}
                        style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }}
                      >
                        {p.nombre} {p.ap_pat} {p.ap_mat || ""}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                      {p.curp || "—"}
                    </td>
                    <td>{badgeSexo(p.sexo)}</td>
                    <td className="hide-mobile">
                      {p.edad != null ? `${p.edad} años` : "—"}
                    </td>
                    <td className="hide-mobile">
                      {p.tipo_diabetes
                        ? <span style={{ background: "#ede9fe", color: "#6d28d9", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{p.tipo_diabetes}</span>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: "#64748b" }}>
                      {p.unidad || "—"}
                    </td>
                    <td>
                      <div className="acciones">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/renaced/consultas/${p.id}`)}
                        >
                          Consulta
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!cargando && pacientes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty-cell">No se encontraron pacientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Anterior
            </button>
            <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "#64748b" }}>
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </RenacedLayout>
  );
}
