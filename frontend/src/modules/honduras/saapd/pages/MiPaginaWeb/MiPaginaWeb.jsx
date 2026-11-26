// Editor de la página web pública de Honduras: las doctoras (rol admin) publican su equipo,
// proyectos, servicios y talleres. El Super Admin decide cuándo la página queda activa.
import { useEffect, useState } from "react";
import Layout from "../../../../../shared/components/Layout";
import api from "../../../../../shared/api/axios";
import PaginaWebVista from "../../../../../shared/pages/PaginaWebVista";
import { FOTOS } from "../../../../../shared/pages/fotosPagina";

const campo = { width: "100%", padding: "9px 11px", border: "1px solid #cbd5e1", borderRadius: 8, font: "inherit", boxSizing: "border-box" };
const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", margin: "10px 0 4px" };

function Campo({ label, value, onChange, area, ...rest }) {
  const Tag = area ? "textarea" : "input";
  return (
    <label>
      <span style={etiqueta}>{label}</span>
      <Tag style={{ ...campo, ...(area ? { minHeight: 80, resize: "vertical" } : {}) }} value={value ?? ""}
        onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

// Lista editable de tarjetas: agregar, quitar y mover.
function Lista({ titulo, items, onChange, vacio, nuevo, render }) {
  const set = (i, patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items]; [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  };
  return (
    <section className="card" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>{titulo}</h3>
        <button type="button" className="btn btn-primary" onClick={() => onChange([...items, nuevo])}>+ Agregar</button>
      </div>
      {items.length === 0 && <p style={{ color: "#94a3b8", margin: "8px 0 0" }}>{vacio}</p>}
      {items.map((it, i) => (
        <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginTop: 12, background: "#f8fafc" }}>
          {render(it, (patch) => set(i, patch))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" disabled={i === 0} onClick={() => mover(i, -1)}>↑ Subir</button>
            <button type="button" className="btn" disabled={i === items.length - 1} onClick={() => mover(i, 1)}>↓ Bajar</button>
            <button type="button" className="btn" style={{ marginLeft: "auto", color: "#b91c1c" }}
              onClick={() => onChange(items.filter((_, j) => j !== i))}>Quitar</button>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function MiPaginaWeb() {
  const [pagina, setPagina] = useState(null);
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState(false);

  useEffect(() => {
    api.get("/mi-pagina-web")
      .then((r) => { setPagina(r.data); setC(r.data.contenido); })
      .catch((e) => setMsg({ ok: false, t: e.response?.data?.error || "No se pudo cargar la página" }));
  }, []);

  const set = (patch) => setC((x) => ({ ...x, ...patch }));

  const guardar = async () => {
    setGuardando(true); setMsg(null);
    try {
      await api.put("/mi-pagina-web", { contenido: c });
      setMsg({ ok: true, t: "Cambios guardados" });
      setPagina((p) => ({ ...p, creada: true }));
    } catch (e) {
      setMsg({ ok: false, t: e.response?.data?.error || "No se pudo guardar" });
    } finally {
      setGuardando(false);
    }
  };

  if (!c) return <Layout><div style={{ padding: 24 }}>{msg ? msg.t : "Cargando…"}</div></Layout>;

  if (vista) {
    return (
      <div>
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "8px 16px", fontSize: 13, display: "flex", justifyContent: "space-between", position: "relative", zIndex: 100 }}>
          <span>Vista previa de tus cambios (aún sin guardar si no pulsaste Guardar)</span>
          <button className="btn" onClick={() => setVista(false)}>← Volver al editor</button>
        </div>
        <PaginaWebVista pagina={{ ...pagina, contenido: c }} onIniciarSesion={() => {}} />
      </div>
    );
  }

  const ct = c.contacto || {};
  return (
    <Layout>
      <div style={{ padding: 24, maxWidth: 900 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, flex: 1 }}>Mi página web</h1>
          <button className="btn" onClick={() => setVista(true)}>Vista previa</button>
          <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
        </div>
        <p style={{ color: "#64748b" }}>
          Aquí editas lo que ve el público en {window.location.origin}{pagina.ruta}. Estado:{" "}
          <strong style={{ color: pagina.activa ? "#16a34a" : "#b45309" }}>{pagina.activa ? "publicada" : "aún no publicada (la activa el Super Admin)"}</strong>.
        </p>
        {msg && <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", color: msg.ok ? "#15803d" : "#b91c1c", padding: 10, borderRadius: 8, marginBottom: 12 }}>{msg.t}</div>}

        <section className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Portada</h3>
          <Campo label="Título" value={c.titulo} onChange={(v) => set({ titulo: v })} />
          <Campo label="Frase principal" value={c.eslogan} onChange={(v) => set({ eslogan: v })} />
          <Campo label="Quiénes somos (texto de introducción)" area value={c.sobre_nosotros} onChange={(v) => set({ sobre_nosotros: v })} />
          <label>
            <span style={etiqueta}>Color de acento</span>
            <input type="color" value={c.color || "#0b3a6b"} onChange={(e) => set({ color: e.target.value })} style={{ width: 60, height: 36, border: "none", background: "none" }} />
          </label>
        </section>

        <section className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Nuestra historia</h3>
          <Campo label="Historia" area value={c.historia} onChange={(v) => set({ historia: v })} />
        </section>

        <Lista titulo="Nuestro camino (hitos)" items={c.hitos} onChange={(hitos) => set({ hitos })}
          vacio="Sin hitos." nuevo={{ anio: "", texto: "" }}
          render={(h, up) => (<>
            <Campo label="Año (opcional)" value={h.anio} onChange={(v) => up({ anio: v })} />
            <Campo label="Qué pasó" value={h.texto} onChange={(v) => up({ texto: v })} />
          </>)} />

        <Lista titulo="Nuestro equipo" items={c.equipo} onChange={(equipo) => set({ equipo })}
          vacio="Aún no hay integrantes." nuevo={{ nombre: "", cargo: "", bio: "", foto: "" }}
          render={(m, up) => (<>
            <Campo label="Nombre" value={m.nombre} onChange={(v) => up({ nombre: v })} />
            <Campo label="Cargo o especialidad" value={m.cargo} onChange={(v) => up({ cargo: v })} />
            <Campo label="Presentación breve" area value={m.bio} onChange={(v) => up({ bio: v })} />
            <label>
              <span style={etiqueta}>Foto</span>
              <select style={campo} value={FOTOS[m.foto] ? m.foto : (m.foto ? "otra" : "")}
                onChange={(e) => up({ foto: e.target.value === "otra" ? "https://" : e.target.value })}>
                <option value="">Sin foto</option>
                {Object.keys(FOTOS).map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                <option value="otra">Otra (dirección de imagen)</option>
              </select>
            </label>
            {m.foto && !FOTOS[m.foto] && <Campo label="Dirección de la imagen (https://…)" value={m.foto} onChange={(v) => up({ foto: v })} />}
          </>)} />

        <Lista titulo="Proyectos" items={c.proyectos} onChange={(proyectos) => set({ proyectos })}
          vacio="Aún no hay proyectos." nuevo={{ titulo: "", texto: "", estado: "en_curso", fecha: "" }}
          render={(p, up) => (<>
            <Campo label="Título" value={p.titulo} onChange={(v) => up({ titulo: v })} />
            <Campo label="Descripción" area value={p.texto} onChange={(v) => up({ texto: v })} />
            <label>
              <span style={etiqueta}>Estado</span>
              <select style={campo} value={p.estado} onChange={(e) => up({ estado: e.target.value })}>
                <option value="en_curso">En curso</option>
                <option value="proximo">Próximo</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </label>
            <Campo label="Fecha (texto libre, p. ej. “Marzo 2027”)" value={p.fecha} onChange={(v) => up({ fecha: v })} />
          </>)} />

        <Lista titulo="Servicios" items={c.servicios} onChange={(servicios) => set({ servicios })}
          vacio="Aún no hay servicios." nuevo={{ titulo: "", texto: "" }}
          render={(s, up) => (<>
            <Campo label="Nombre del servicio" value={s.titulo} onChange={(v) => up({ titulo: v })} />
            <Campo label="Descripción" area value={s.texto} onChange={(v) => up({ texto: v })} />
          </>)} />

        <Lista titulo="Talleres y eventos" items={c.talleres} onChange={(talleres) => set({ talleres })}
          vacio="Aún no hay talleres." nuevo={{ titulo: "", texto: "", fecha: "", lugar: "" }}
          render={(t, up) => (<>
            <Campo label="Título" value={t.titulo} onChange={(v) => up({ titulo: v })} />
            <Campo label="Descripción" area value={t.texto} onChange={(v) => up({ texto: v })} />
            <Campo label="Fecha y hora" value={t.fecha} onChange={(v) => up({ fecha: v })} />
            <Campo label="Lugar o modalidad (p. ej. Virtual)" value={t.lugar} onChange={(v) => up({ lugar: v })} />
          </>)} />

        <section className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Contacto</h3>
          <Campo label="Correo" value={ct.correo} onChange={(v) => set({ contacto: { ...ct, correo: v } })} />
          <Campo label="Teléfono" value={ct.telefono} onChange={(v) => set({ contacto: { ...ct, telefono: v } })} />
          <Campo label="WhatsApp (con código de país)" value={ct.whatsapp} onChange={(v) => set({ contacto: { ...ct, whatsapp: v } })} />
          <Campo label="Dirección" value={ct.direccion} onChange={(v) => set({ contacto: { ...ct, direccion: v } })} />
        </section>

        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </Layout>
  );
}
