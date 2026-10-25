import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiOutlineBell, HiOutlineSparkles, HiOutlineXMark, HiOutlineTrash, HiOutlinePlus,
} from "react-icons/hi2";
import { novedadesDe } from "../data/novedades";
import "./TopbarAvisos.css";

// Campana de notificaciones + botón de novedades para la barra superior.
// `api` es la instancia de axios del contexto actual (EM o RENACED) y
// `basePacientes` la ruta base para abrir un paciente.
const TIPO_LABEL = { riesgo: "Alto riesgo", escaneo: "Escaneo", actividad: "Actividad", aviso: "Aviso" };

const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin storage */ } };

function fechaCorta(f) {
  if (!f) return "";
  const d = new Date(String(f).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(f).slice(0, 10);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TopbarAvisos({ api, esSuperAdmin, basePacientes, storageKey, alcance }) {
  const novedades = novedadesDe(alcance);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [totalRiesgo, setTotalRiesgo] = useState(0);
  const [panel, setPanel] = useState(null); // "campana" | null
  const [novOpen, setNovOpen] = useState(false);
  const [visto, setVisto] = useState(() => leer(`notif_visto_${storageKey}`) || "");
  const [novVisto, setNovVisto] = useState(() => leer(`novedades_version_${storageKey}`) || "");
  const [formAviso, setFormAviso] = useState(null);
  const [error, setError] = useState("");
  const campanaRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const n = await api.get("/notificaciones");
      setItems(n.data.items || []);
      setTotalRiesgo(n.data.totalRiesgo || 0);
    } catch { /* la barra sigue funcionando sin avisos */ }
  }, [api]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 120000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    function fuera(e) {
      if (campanaRef.current && !campanaRef.current.contains(e.target)) setPanel(null);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  useEffect(() => {
    if (!novOpen) return undefined;
    const alTeclear = (e) => { if (e.key === "Escape") setNovOpen(false); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [novOpen]);

  const sinLeer = items.filter((i) => String(i.fecha || "") > visto).length;
  const hayNovedades = !!novedades[0] && novedades[0].version !== novVisto;

  function abrirCampana() {
    setPanel((p) => (p ? null : "campana"));
  }
  function marcarLeidas() {
    const ahora = items.reduce((m, i) => (String(i.fecha || "") > m ? String(i.fecha) : m), visto);
    setVisto(ahora);
    guardar(`notif_visto_${storageKey}`, ahora);
  }
  function abrirNovedades() {
    setNovOpen(true);
    setPanel(null);
    if (!novedades[0]) return;
    setNovVisto(novedades[0].version);
    guardar(`novedades_version_${storageKey}`, novedades[0].version);
  }

  async function publicarAviso(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/notificaciones/avisos", formAviso);
      setFormAviso(null);
      cargar();
    } catch (err) { setError(err.response?.data?.error || "No se pudo publicar el aviso"); }
  }
  async function borrarAviso(id) {
    try { await api.delete(`/notificaciones/avisos/${id}`); cargar(); } catch { /* ignorar */ }
  }
  return (
    <div className="tba">
      <button className="tba-btn" onClick={abrirNovedades} title="Novedades" aria-label="Novedades">
        <HiOutlineSparkles size={19} />
        {hayNovedades && <span className="tba-dot" />}
      </button>

      <div className="tba-wrap" ref={campanaRef}>
        <button className={`tba-btn${panel ? " open" : ""}`} onClick={abrirCampana} title="Notificaciones" aria-label="Notificaciones">
          <HiOutlineBell size={19} />
          {sinLeer > 0 && <span className="tba-badge">{sinLeer > 9 ? "9+" : sinLeer}</span>}
        </button>

        {panel && (
          <div className="tba-panel">
            <div className="tba-panel-head">
              <strong>Notificaciones</strong>
              {sinLeer > 0 && <button className="tba-link" onClick={marcarLeidas}>Marcar como leídas</button>}
            </div>

            {totalRiesgo > 0 && (
              <div className="tba-resumen">{totalRiesgo} paciente{totalRiesgo === 1 ? "" : "s"} con último reporte en alto riesgo</div>
            )}

            <div className="tba-lista">
              {items.length === 0 && <p className="tba-vacio">Sin notificaciones por ahora.</p>}
              {items.map((i) => (
                <div
                  key={i.clave}
                  className={`tba-item tba-${i.tipo}${String(i.fecha || "") > visto ? " nuevo" : ""}${i.paciente_id ? " clic" : ""}`}
                  onClick={() => { if (i.paciente_id) { setPanel(null); navigate(`${basePacientes}/${i.paciente_id}`); } }}
                >
                  <span className="tba-tag">{TIPO_LABEL[i.tipo]}</span>
                  <div className="tba-item-body">
                    <div className="tba-item-title">{i.titulo}</div>
                    {i.detalle && <div className="tba-item-det">{i.detalle}</div>}
                    <div className="tba-item-fecha">{fechaCorta(i.fecha)}</div>
                  </div>
                  {esSuperAdmin && i.tipo === "aviso" && (
                    <button className="tba-icon" title="Eliminar aviso" onClick={(e) => { e.stopPropagation(); borrarAviso(i.id); }}>
                      <HiOutlineTrash size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {esSuperAdmin && (
              <div className="tba-foot">
                {formAviso ? (
                  <form onSubmit={publicarAviso} className="tba-form">
                    <input placeholder="Título del aviso" value={formAviso.titulo} maxLength={150}
                      onChange={(e) => setFormAviso({ ...formAviso, titulo: e.target.value })} required />
                    <textarea placeholder="Mensaje (opcional)" rows={2} value={formAviso.mensaje}
                      onChange={(e) => setFormAviso({ ...formAviso, mensaje: e.target.value })} />
                    <label className="tba-small">Vence el (opcional)
                      <input type="date" value={formAviso.vence_en}
                        onChange={(e) => setFormAviso({ ...formAviso, vence_en: e.target.value })} />
                    </label>
                    {error && <p className="tba-error">{error}</p>}
                    <div className="tba-actions">
                      <button type="button" className="tba-sec" onClick={() => { setFormAviso(null); setError(""); }}>Cancelar</button>
                      <button type="submit" className="tba-pri">Publicar</button>
                    </div>
                  </form>
                ) : (
                  <button className="tba-link" onClick={() => setFormAviso({ titulo: "", mensaje: "", vence_en: "" })}>
                    <HiOutlinePlus size={14} /> Publicar aviso para todos
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {novOpen && (
          <>
            <motion.div
              className="tba-drawer-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setNovOpen(false)}
            />
            <motion.aside
              className="tba-drawer"
              role="dialog" aria-label="Novedades"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="tba-drawer-head">
                <h3><HiOutlineSparkles size={20} /> Novedades</h3>
                <button className="tba-drawer-x" onClick={() => setNovOpen(false)} aria-label="Cerrar">
                  <HiOutlineXMark size={20} />
                </button>
              </div>

              <div className="tba-drawer-body">
                {novedades.map((n, i) => (
                  <article key={n.version} className="tba-nov">
                    <header>
                      <span className="tba-ver">v{n.version}</span>
                      {i === 0 && <span className="tba-nuevo">Nuevo</span>}
                      <time>{fechaCorta(n.fecha)}</time>
                    </header>
                    <h4>{n.titulo}</h4>
                    <ul>
                      {n.cambios.map((c, idx) => <li key={idx}>{c}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
