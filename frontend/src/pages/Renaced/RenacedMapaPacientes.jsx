import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import RenacedLayout from "../../components/RenacedLayout";
import { getMapaPacientes } from "../../api/renacedApi";
import "./RenacedMapaPacientes.css";

const C = {
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444", indigo: "#6366f1", slate: "#64748b",
};

const CLASIFICACIONES = [
  { key: "optimo",    label: "Óptimo < 7%",   color: C.green },
  { key: "moderado",  label: "Moderado 7–9%", color: C.amber },
  { key: "alto",      label: "Alto > 9%",     color: C.red },
  { key: "sin_datos", label: "Sin HbA1c",     color: C.indigo },
];

function dominante(p) {
  const entradas = [["optimo", p.optimo], ["moderado", p.moderado], ["alto", p.alto], ["sin_datos", p.sin_datos]];
  entradas.sort((a, b) => b[1] - a[1]);
  return entradas[0][1] > 0 ? entradas[0][0] : "sin_datos";
}

function colorDe(key) {
  return CLASIFICACIONES.find((c) => c.key === key)?.color || C.slate;
}

function crearIconoPunto(p) {
  const color = colorDe(dominante(p));
  const size = Math.max(24, Math.min(58, 18 + Math.sqrt(p.total) * 5.5));
  const fontSize = size > 32 ? 13 : 10.5;
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color}d9;border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;font-size:${fontSize}px;font-family:inherit;
    ">${p.total}</div>`;
  const icon = L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
  // Guardamos el total real de pacientes en el icono para que el clúster
  // pueda sumar personas (no solo contar cuántos puntos se agruparon).
  icon.options.total = p.total;
  return icon;
}

function crearIconoCluster(cluster) {
  const totalPacientes = cluster.getAllChildMarkers()
    .reduce((s, m) => s + (m.options.icon?.options?.total ?? 1), 0);
  const size = Math.max(38, Math.min(72, 30 + Math.sqrt(totalPacientes) * 4));
  return L.divIcon({
    html: `<div class="renaced-cluster-icon" style="width:${size}px;height:${size}px;background:${C.indigo}e6;font-size:${size > 50 ? 15 : 13}px;">${totalPacientes}</div>`,
    className: "",
    iconSize: [size, size],
  });
}

// Leaflet mide el contenedor al montar; si el layout aún no terminó de
// asentarse (cards/filtros arriba), lo mide mal y el mapa aparece
// desalineado / con zoom incorrecto. Forzamos un recálculo tras el primer paint.
function ArreglarTamano() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function BotonCentrar({ centro, zoom }) {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right" style={{ pointerEvents: "auto", marginBottom: 24, marginRight: 10 }}>
      <button
        title="Centrar mapa"
        onClick={() => map.setView(centro, zoom)}
        style={{
          width: 34, height: 34, background: "#fff", border: "2px solid rgba(0,0,0,0.2)",
          borderRadius: 6, cursor: "pointer", fontSize: 16, display: "flex",
          alignItems: "center", justifyContent: "center", boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
        }}
      >
        🏠
      </button>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = C.indigo, icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "18px 18px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
      borderLeft: `4px solid ${accent}`, display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1.1 }}>{value ?? "—"}</span>
        {icon && <span style={{ fontSize: 20, marginBottom: 2, opacity: 0.5 }}>{icon}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

const CENTRO_MX = [23.6345, -102.5528];
// Caja que cubre México con margen — evita ver el mapa mundi repetido al alejar
const LIMITES_MX = [[3, -135], [37, -75]];

const VISTAS = [
  { key: "residencia", label: "Estado de Residencia", desc: "Dónde vive el paciente — granularidad de municipio" },
  { key: "atencion",   label: "Estado de Atención",   desc: "Dónde recibe atención médica — granularidad de estado" },
];

export default function RenacedMapaPacientes() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");
  const [vista, setVista] = useState("residencia");

  useEffect(() => {
    getMapaPacientes()
      .then((r) => setData(r.data))
      .catch(() => setData({
        total_pacientes: 0,
        residencia: { puntos: [], total_georreferenciados: 0, top_estados: [] },
        atencion: { puntos: [], total_georreferenciados: 0, top_estados: [] },
      }))
      .finally(() => setCargando(false));
  }, []);

  const vistaActual = data?.[vista] || { puntos: [], total_georreferenciados: 0, top_estados: [] };
  const puntos = vistaActual.puntos;

  const filtrados = useMemo(() => {
    if (filtro === "TODOS") return puntos;
    return puntos.filter((p) => dominante(p) === filtro.toLowerCase());
  }, [puntos, filtro]);

  const conteos = useMemo(() => {
    const acc = { optimo: 0, moderado: 0, alto: 0, sin_datos: 0 };
    for (const p of puntos) acc[dominante(p)] += 1;
    return acc;
  }, [puntos]);

  const totalesGlobales = useMemo(() => {
    return puntos.reduce((acc, p) => {
      acc.optimo += p.optimo; acc.moderado += p.moderado;
      acc.alto += p.alto; acc.sin_datos += p.sin_datos;
      return acc;
    }, { optimo: 0, moderado: 0, alto: 0, sin_datos: 0 });
  }, [puntos]);

  const pieData = CLASIFICACIONES.map((c) => ({ name: c.label, value: totalesGlobales[c.key], fill: c.color }));

  const totalPacientes = data?.total_pacientes || 0;
  const sinGeo = totalPacientes - (vistaActual.total_georreferenciados || 0);
  const pctGeo = totalPacientes ? Math.round((vistaActual.total_georreferenciados * 100) / totalPacientes) : 0;
  const topEstado = vistaActual.top_estados?.[0];

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Mapa de Pacientes — RENACED México</h1>
          <p className="page-subtitle">{VISTAS.find((v) => v.key === vista)?.desc}</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
          {VISTAS.map((v) => (
            <button
              key={v.key}
              onClick={() => { setVista(v.key); setFiltro("TODOS"); }}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700,
                background: vista === v.key ? "#fff" : "transparent",
                color: vista === v.key ? C.indigo : "#64748b",
                boxShadow: vista === v.key ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                transition: "all 0.15s",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando mapa…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12, marginBottom: 16 }}>
            <KpiCard label="Total Pacientes" value={totalPacientes.toLocaleString()} icon="👥" />
            <KpiCard label="Georreferenciados" value={`${pctGeo}%`} accent={pctGeo >= 70 ? C.green : C.amber}
              sub={`${vistaActual.total_georreferenciados.toLocaleString()} de ${totalPacientes.toLocaleString()}`} icon="📍" />
            <KpiCard label="Sin Ubicación" value={sinGeo.toLocaleString()} accent={C.slate} icon="❔" sub="Sin dato o sin geocodificar" />
            <KpiCard label={vista === "residencia" ? "Estado con más Residentes" : "Estado con más Atenciones"}
              value={topEstado?.nombre || "—"} accent={C.indigo} icon="🏆"
              sub={topEstado ? `${topEstado.total.toLocaleString()} pacientes` : ""} />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="mapa-filtros" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Filtrar por control glucémico dominante:</span>
              {[{ key: "TODOS", label: `Todos (${puntos.length})`, color: C.slate }, ...CLASIFICACIONES.map((c) => ({ ...c, label: `${c.label} (${conteos[c.key] || 0})` }))].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key === "TODOS" ? "TODOS" : f.key.toUpperCase())}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                    border: filtro === (f.key === "TODOS" ? "TODOS" : f.key.toUpperCase()) ? `2px solid ${f.color}` : "2px solid transparent",
                    background: filtro === (f.key === "TODOS" ? "TODOS" : f.key.toUpperCase()) ? f.color + "18" : "#f1f5f9",
                    color: filtro === (f.key === "TODOS" ? "TODOS" : f.key.toUpperCase()) ? f.color : "#64748b",
                    fontWeight: 600, fontSize: 12.5,
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: f.color, display: "inline-block" }} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {puntos.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
              <p style={{ fontSize: "2rem", marginBottom: 8 }}>📍</p>
              <p>Aún no hay ubicaciones geocodificadas para esta vista.</p>
            </div>
          ) : (
            <div className="renaced-mapa-wrapper">
              <MapContainer
                key={vista}
                center={CENTRO_MX}
                zoom={5}
                minZoom={4}
                maxBounds={LIMITES_MX}
                maxBoundsViscosity={1.0}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  noWrap
                />
                <ArreglarTamano />
                <BotonCentrar centro={CENTRO_MX} zoom={5} />
                <MarkerClusterGroup iconCreateFunction={crearIconoCluster} maxClusterRadius={60} spiderfyOnMaxZoom>
                  {filtrados.map((p, i) => (
                    <Marker key={`${vista}-${p.estado}-${p.municipio_nombre || "sm"}-${i}`} position={[p.lat, p.lng]} icon={crearIconoPunto(p)}>
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                        <strong>{p.municipio_nombre || p.estado_nombre}</strong>
                      </Tooltip>
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>
                            {p.municipio_nombre || `Estado de ${p.estado_nombre}`}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8 }}>{p.estado_nombre}</div>
                          <div style={{ fontSize: "0.85rem", marginBottom: 8 }}>
                            <strong>{p.total}</strong> paciente{p.total !== 1 ? "s" : ""}
                            {p.promedio_hba1c != null && <> · HbA1c prom. <strong>{p.promedio_hba1c}%</strong></>}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                            {CLASIFICACIONES.filter((c) => p[c.key] > 0).map((c) => (
                              <span key={c.key} style={{ background: c.color + "22", color: c.color, borderRadius: 12, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                                {c.label.split(" ")[0]}: {p[c.key]}
                              </span>
                            ))}
                          </div>
                          {vista === "residencia" && (
                            <button
                              onClick={() => {
                                const params = new URLSearchParams({ estado_residencia: p.estado });
                                if (p.municipio) params.set("municipio_residencia", p.municipio);
                                navigate(`/renaced/pacientes?${params.toString()}`);
                              }}
                              style={{ width: "100%", padding: "6px 0", background: C.indigo, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                            >
                              Ver pacientes de esta zona →
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 20px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
                Top 10 Estados de {vista === "residencia" ? "Residencia" : "Atención"}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vistaActual.top_estados} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={110} />
                  <RTooltip formatter={(v) => [v.toLocaleString(), "Pacientes"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="total" fill={C.indigo} radius={[0, 6, 6, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 20px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>Control Glucémico por Zona</h3>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <RTooltip formatter={(v, n) => [`${Number(v).toLocaleString()} pacientes`, n]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </RenacedLayout>
  );
}
