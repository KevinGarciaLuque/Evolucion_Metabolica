import { useEffect, useMemo, useState } from "react";
import FlagIcon from "../../../shared/components/FlagIcon";
import { updateTenant, getUsuariosTenant, actualizarPermisosUsuarioTenant } from "../api/adminApi";
import {
  HiOutlineGlobeAmericas, HiOutlineUsers, HiOutlineMagnifyingGlass, HiOutlineLockClosed,
  HiOutlineShieldCheck, HiChevronDown, HiOutlineXMark,
} from "react-icons/hi2";
import { catalogoModulos, agruparModulos, PERFIL_LABELS } from "./permisosCatalogo";
import "./PermisosPaisModal.css";

const POR_PAGINA = 25;
const mismoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const iniciales = (n) => (n || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
const sinTildes = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Interruptor({ activo, onChange, deshabilitado, etiqueta }) {
  return (
    <button
      type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado}
      className={`pm-switch${activo ? " on" : ""}`}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
    ><span /></button>
  );
}

function FilaModulo({ modulo, activo, onChange, bloqueado, compacto }) {
  return (
    <div
      className={`pm-mod${activo && !bloqueado ? " on" : ""}${bloqueado ? " locked" : ""}${compacto ? " compact" : ""}`}
      onClick={() => !bloqueado && onChange()}
      title={bloqueado ? "Este módulo está deshabilitado para todo el país" : modulo.desc}
    >
      <div className="pm-mod-txt">
        <span className="pm-mod-nombre">
          {bloqueado && <HiOutlineLockClosed size={12} />} {modulo.nombre}
        </span>
        {!compacto && <span className="pm-mod-desc">{modulo.desc}</span>}
      </div>
      <Interruptor activo={activo && !bloqueado} onChange={onChange} deshabilitado={bloqueado} etiqueta={modulo.nombre} />
    </div>
  );
}

export default function PermisosPaisModal({ tenant, onClose, onGuardado }) {
  const catalogo = useMemo(() => catalogoModulos(tenant.codigo), [tenant.codigo]);
  const claves = useMemo(() => catalogo.map((m) => m.clave), [catalogo]);
  const grupos = useMemo(() => agruparModulos(catalogo), [catalogo]);

  const paisInicial = useMemo(() => {
    const act = Array.isArray(tenant.modulos) ? tenant.modulos : claves;
    return act.filter((m) => claves.includes(m));
  }, [tenant.modulos, claves]);

  const [tab, setTab] = useState("pais");
  const [pais, setPais] = useState(paisInicial);
  const [paisBase, setPaisBase] = useState(paisInicial);
  const [guardandoPais, setGuardandoPais] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [sel, setSel] = useState({});      // { [id]: string[] } — lo que se ve en pantalla
  const [base, setBase] = useState({});    // { [id]: string[] } — lo guardado
  const [estado, setEstado] = useState({}); // { [id]: "guardando" | "ok" | "error" }
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [perfil, setPerfil] = useState("todos");
  const [abiertos, setAbiertos] = useState(() => new Set());
  const [limite, setLimite] = useState(POR_PAGINA);
  const [aviso, setAviso] = useState(null); // { tipo: "ok" | "error", texto }

  useEffect(() => {
    let vivo = true;
    getUsuariosTenant(tenant.id)
      .then((res) => {
        if (!vivo) return;
        const s = {};
        res.data.forEach((u) => { s[u.id] = (u.modulos ?? claves).filter((m) => claves.includes(m)); });
        setUsuarios(res.data); setSel(s); setBase(s);
      })
      .catch(() => vivo && setAviso({ tipo: "error", texto: "No se pudo cargar la lista de usuarios." }))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [tenant.id, claves]);

  const paisSucio = !mismoConjunto(pais, paisBase);
  const usuariosSucios = usuarios.filter((u) => !mismoConjunto(sel[u.id] ?? [], base[u.id] ?? []));
  const haySinGuardar = paisSucio || usuariosSucios.length > 0;

  function cerrar() {
    if (haySinGuardar && !window.confirm("Hay cambios sin guardar. ¿Cerrar y descartarlos?")) return;
    onClose();
  }

  function avisar(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 3500);
  }

  async function guardarPais() {
    setGuardandoPais(true);
    try {
      await updateTenant(tenant.id, { modulos: pais });
      setPaisBase(pais);
      await onGuardado?.();
      avisar("ok", "Módulos del país guardados.");
    } catch (err) {
      avisar("error", err.response?.data?.error || "No se pudieron guardar los módulos del país.");
    } finally { setGuardandoPais(false); }
  }

  async function guardarUsuario(id) {
    setEstado((e) => ({ ...e, [id]: "guardando" }));
    try {
      await actualizarPermisosUsuarioTenant(tenant.id, id, sel[id] ?? []);
      setBase((b) => ({ ...b, [id]: sel[id] ?? [] }));
      setEstado((e) => ({ ...e, [id]: "ok" }));
      setTimeout(() => setEstado((e) => (e[id] === "ok" ? { ...e, [id]: undefined } : e)), 2000);
      return true;
    } catch {
      setEstado((e) => ({ ...e, [id]: "error" }));
      return false;
    }
  }

  async function guardarTodosUsuarios() {
    let ok = 0;
    for (const u of usuariosSucios) if (await guardarUsuario(u.id)) ok++;
    avisar(ok === usuariosSucios.length ? "ok" : "error",
      ok === usuariosSucios.length ? `${ok} usuario${ok === 1 ? "" : "s"} guardado${ok === 1 ? "" : "s"}.` : `Se guardaron ${ok} de ${usuariosSucios.length}; revisa los que marcan error.`);
  }

  const alternarPais = (c) => setPais((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const alternarUsuario = (id, c) => setSel((s) => {
    const a = s[id] ?? [];
    return { ...s, [id]: a.includes(c) ? a.filter((x) => x !== c) : [...a, c] };
  });
  const alternarAbierto = (id) => setAbiertos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Usuarios filtrados
  const perfilesPresentes = useMemo(() => [...new Set(usuarios.map((u) => u.perfil_id))].sort(), [usuarios]);
  const filtrados = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return usuarios.filter((u) =>
      (perfil === "todos" || String(u.perfil_id) === perfil) &&
      (!q || sinTildes(u.nombre_completo).includes(q) || sinTildes(u.email).includes(q)));
  }, [usuarios, busqueda, perfil]);
  useEffect(() => { setLimite(POR_PAGINA); }, [busqueda, perfil]);

  const efectivos = (id) => (sel[id] ?? []).filter((m) => pais.includes(m));

  return (
    <div className="pm-overlay" onClick={cerrar}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Encabezado */}
        <div className="pm-head">
          <div>
            <h3><FlagIcon codigo={tenant.codigo} size={18} /> Permisos — {tenant.nombre}</h3>
            <p>Define qué módulos tiene el país y cuáles ve cada usuario dentro de él.</p>
          </div>
          <button type="button" className="pm-x" onClick={cerrar} aria-label="Cerrar"><HiOutlineXMark size={20} /></button>
        </div>

        <div className="pm-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "pais"} className={tab === "pais" ? "on" : ""} onClick={() => setTab("pais")}>
            <HiOutlineGlobeAmericas size={15} /> Módulos del país
            {paisSucio && <i className="pm-dot" title="Cambios sin guardar" />}
          </button>
          <button role="tab" aria-selected={tab === "usuarios"} className={tab === "usuarios" ? "on" : ""} onClick={() => setTab("usuarios")}>
            <HiOutlineUsers size={15} /> Usuarios {usuarios.length > 0 && <span className="pm-count">{usuarios.length}</span>}
            {usuariosSucios.length > 0 && <i className="pm-dot" title="Cambios sin guardar" />}
          </button>
        </div>

        {aviso && <div className={`pm-aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

        {/* Cuerpo */}
        <div className="pm-body">
          {tab === "pais" ? (
            <>
              <div className="pm-resumen">
                <div>
                  <strong>{pais.length} de {claves.length}</strong> módulos habilitados
                  <span className="pm-sub">Es el máximo que puede ver cualquier usuario del país; los permisos individuales solo pueden reducirlo.</span>
                </div>
                <div className="pm-acciones">
                  <button type="button" className="pm-link" onClick={() => setPais(claves)}>Habilitar todos</button>
                  <button type="button" className="pm-link" onClick={() => setPais([])}>Deshabilitar todos</button>
                </div>
              </div>
              {grupos.map((g) => (
                <section key={g.id} className="pm-grupo">
                  <h4>{g.nombre}</h4>
                  <div className="pm-grid">
                    {g.modulos.map((m) => (
                      <FilaModulo key={m.clave} modulo={m} activo={pais.includes(m.clave)} onChange={() => alternarPais(m.clave)} />
                    ))}
                  </div>
                </section>
              ))}
              <div className="pm-nota">
                <HiOutlineShieldCheck size={16} />
                <span><strong>Importar BD</strong> no aparece aquí: es una herramienta exclusiva del Super Admin y no se puede asignar a ningún usuario.</span>
              </div>
            </>
          ) : (
            <>
              <div className="pm-filtros">
                <label className="pm-buscar">
                  <HiOutlineMagnifyingGlass size={16} />
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o correo…" />
                </label>
                <select value={perfil} onChange={(e) => setPerfil(e.target.value)} aria-label="Filtrar por perfil">
                  <option value="todos">Todos los perfiles</option>
                  {perfilesPresentes.map((p) => <option key={p} value={p}>{PERFIL_LABELS[p] || `Perfil ${p}`}</option>)}
                </select>
              </div>
              <p className="pm-sub" style={{ margin: "0 0 12px" }}>
                Un usuario solo ve un módulo si está habilitado para el país <strong>y</strong> para él. Los módulos con candado están apagados en el país.
                {" "}Mostrando {Math.min(limite, filtrados.length)} de {filtrados.length}.
              </p>

              {cargando ? <p className="pm-vacio">Cargando usuarios…</p>
                : filtrados.length === 0 ? <p className="pm-vacio">No hay usuarios que coincidan.</p>
                : (
                  <div className="pm-lista">
                    {filtrados.slice(0, limite).map((u) => {
                      const abierto = abiertos.has(u.id);
                      const sucio = !mismoConjunto(sel[u.id] ?? [], base[u.id] ?? []);
                      const st = estado[u.id];
                      const habilitablesPais = claves.filter((c) => pais.includes(c));
                      const todos = habilitablesPais.every((c) => (sel[u.id] ?? []).includes(c));
                      return (
                        <article key={u.id} className={`pm-user${sucio ? " sucio" : ""}`}>
                          <header onClick={() => alternarAbierto(u.id)}>
                            <div className="pm-avatar">{iniciales(u.nombre_completo)}</div>
                            <div className="pm-user-info">
                              <div className="pm-user-nombre">
                                {u.nombre_completo}
                                <span className="pm-badge">{PERFIL_LABELS[u.perfil_id] || "Usuario"}</span>
                                {sucio && <span className="pm-badge warn">Sin guardar</span>}
                              </div>
                              <div className="pm-user-mail">{u.email}</div>
                            </div>
                            <span className="pm-user-cuenta">{efectivos(u.id).length}/{claves.length} módulos</span>
                            <HiChevronDown size={16} className={`pm-chev${abierto ? " open" : ""}`} />
                          </header>
                          {abierto && (
                            <div className="pm-user-body">
                              <div className="pm-grid compact">
                                {catalogo.map((m) => (
                                  <FilaModulo key={m.clave} modulo={m} compacto
                                    bloqueado={!pais.includes(m.clave)}
                                    activo={(sel[u.id] ?? []).includes(m.clave)}
                                    onChange={() => alternarUsuario(u.id, m.clave)} />
                                ))}
                              </div>
                              <div className="pm-user-pie">
                                <button type="button" className="pm-link"
                                  onClick={() => setSel((s) => ({ ...s, [u.id]: todos ? [] : [...new Set([...(s[u.id] ?? []), ...habilitablesPais])] }))}>
                                  {todos ? "Quitar todos" : "Dar todos los del país"}
                                </button>
                                <button type="button" className="pm-link"
                                  disabled={!sucio} onClick={() => setSel((s) => ({ ...s, [u.id]: base[u.id] }))}>Deshacer</button>
                                <span style={{ flex: 1 }} />
                                {st === "error" && <span className="pm-err">No se pudo guardar</span>}
                                {st === "ok" && <span className="pm-ok">✓ Guardado</span>}
                                <button type="button" className="btn btn-primary btn-sm" disabled={!sucio || st === "guardando"} onClick={() => guardarUsuario(u.id)}>
                                  {st === "guardando" ? "Guardando…" : "Guardar"}
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {filtrados.length > limite && (
                      <button type="button" className="btn btn-outline" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                        Mostrar {Math.min(POR_PAGINA, filtrados.length - limite)} más
                      </button>
                    )}
                  </div>
                )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="pm-foot">
          <span className="pm-sub">{haySinGuardar ? "Tienes cambios sin guardar." : "Todo guardado."}</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-outline" onClick={cerrar}>Cerrar</button>
          {tab === "pais" ? (
            <button type="button" className="btn btn-primary" disabled={!paisSucio || guardandoPais} onClick={guardarPais}>
              {guardandoPais ? "Guardando…" : "Guardar módulos del país"}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={usuariosSucios.length === 0} onClick={guardarTodosUsuarios}>
              Guardar cambios{usuariosSucios.length > 0 ? ` (${usuariosSucios.length})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
