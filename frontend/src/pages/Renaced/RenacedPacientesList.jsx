import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import RenacedLayout from "../../components/RenacedLayout";
import FlagIcon from "../../components/FlagIcon";
import { useRenacedAuth } from "../../context/RenacedAuthContext";
import { getPacientes } from "../../api/renacedApi";
import { HiOutlineMagnifyingGlass, HiOutlineFunnel, HiOutlineUserPlus } from "react-icons/hi2";

const ESTATUS_LABEL = { 1: "Activo", 2: "Baja", 3: "Inactivo" };
const ESTATUS_COLOR = {
  1: { bg: "#dcfce7", color: "#166534" },
  2: { bg: "#fee2e2", color: "#991b1b" },
  3: { bg: "#fef9c3", color: "#854d0e" },
};

export default function RenacedPacientesList() {
  const { usuario } = useRenacedAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [busqueda, setBusqueda]   = useState("");
  const [filtroSexo, setFiltroSexo] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState(searchParams.get("estatus_id") || "");
  const limit = 25;

  useEffect(() => {
    setCargando(true);
    const params = { page, limit };
    if (busqueda)      params.busqueda   = busqueda;
    if (filtroSexo)    params.sexo       = filtroSexo;
    if (filtroEstatus) params.estatus_id = filtroEstatus;

    getPacientes(params)
      .then((r) => { setPacientes(r.data.data); setTotal(r.data.total); })
      .catch(() => setPacientes([]))
      .finally(() => setCargando(false));
  }, [page, busqueda, filtroSexo, filtroEstatus]);

  function handleFiltroEstatus(value) {
    setFiltroEstatus(value);
    setPage(1);
    setSearchParams(value ? { estatus_id: value } : {});
  }

  // Debounce búsqueda
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
          <h1>Pacientes RENACED</h1>
          <p className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Registro Nacional de Diabetes — {usuario?.tenant_nombre} <FlagIcon codigo={usuario?.tenant} size={13} />
          </p>
        </div>
        <Link to="/renaced/pacientes/nuevo" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <HiOutlineUserPlus size={16} /> Nuevo Paciente
        </Link>
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
            <select
              value={filtroEstatus}
              onChange={(e) => handleFiltroEstatus(e.target.value)}
              style={{ minWidth: 110 }}
            >
              <option value="">Todos los estatus</option>
              <option value="1">Activo</option>
              <option value="2">Baja</option>
              <option value="3">Inactivo</option>
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
                  <th>Estatus</th>
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
                      <Link
                        to={`/renaced/pacientes/${p.id}`}
                        style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none" }}
                      >
                        {p.nombre} {p.ap_pat} {p.ap_mat || ""}
                      </Link>
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
                      {(() => {
                        const ec = ESTATUS_COLOR[p.estatus_id] || { bg: "#f1f5f9", color: "#475569" };
                        return (
                          <span style={{
                            padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: ec.bg, color: ec.color,
                          }}>
                            {p.estatus || ESTATUS_LABEL[p.estatus_id] || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="acciones">
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/renaced/pacientes/${p.id}`)}>Ver</button>
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/renaced/pacientes/${p.id}/editar`)}>Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!cargando && pacientes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty-cell">No se encontraron pacientes</td>
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
