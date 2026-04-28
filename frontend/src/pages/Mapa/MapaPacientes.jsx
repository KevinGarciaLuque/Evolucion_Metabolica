import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import "./MapaPacientes.css";

// ─── Fix iconos Leaflet con Vite ─────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Colores por clasificación ISPAD ─────────────────────────────────────────
const COLORES = {
  OPTIMO:      "#16a34a",
  MODERADO:    "#d97706",
  ALTO_RIESGO: "#dc2626",
  SIN_DATOS:   "#6366f1",
};

const LABELS = {
  OPTIMO:      "Óptimo",
  MODERADO:    "Moderado",
  ALTO_RIESGO: "Alto Riesgo",
  SIN_DATOS:   "Sin análisis",
};

function crearIcono(clasificacion) {
  const color = COLORES[clasificacion] || COLORES.SIN_DATOS;

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36" style="display:block;position:relative;z-index:1"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24S24 21 24 12C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/></svg>`;

  if (clasificacion === "ALTO_RIESGO") {
    return L.divIcon({
      className: "",
      html: `<div class="marker-ar-wrapper"><span class="pulse-wave w1"></span><span class="pulse-wave w2"></span><span class="pulse-wave w3"></span>${svgStr}</div>`,
      iconSize:    [24, 36],
      iconAnchor:  [12, 36],
      popupAnchor: [0, -36],
    });
  }

  return L.icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(svgStr)}`,
    iconSize:    [24, 36],
    iconAnchor:  [12, 36],
    popupAnchor: [0, -36],
  });
}

function BotonCentrar() {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right" style={{ pointerEvents: "auto", marginBottom: 24, marginRight: 10 }}>
      <button
        title="Centrar mapa"
        onClick={() => map.setView(CENTRO_HN, 7)}
        style={{
          width: 34, height: 34, background: "#fff",
          border: "2px solid rgba(0,0,0,0.2)", borderRadius: 6,
          cursor: "pointer", fontSize: 16, display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
        }}
      >
        🏠
      </button>
    </div>
  );
}

// Centro de Honduras
const CENTRO_HN = [14.8628, -86.8731];

export default function MapaPacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [filtro,    setFiltro]    = useState("TODOS");
  const [busqueda,  setBusqueda]  = useState("");

  useEffect(() => {
    api.get("/pacientes/mapa")
      .then(r => setPacientes(r.data))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = (() => {
    let lista = filtro === "TODOS"
      ? pacientes
      : pacientes.filter(p => (p.clasificacion || "SIN_DATOS") === filtro);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(p => p.nombre?.toLowerCase().includes(q));
    }
    return lista;
  })();

  const conteos = pacientes.reduce((acc, p) => {
    const k = p.clasificacion || "SIN_DATOS";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Mapa de Pacientes</h1>
          <p className="page-subtitle">
            {cargando ? (
              "Cargando..."
            ) : (
              <span className="mapa-stat-badge">
                <span className="mapa-stat-dot" />
                <span className="mapa-stat-num">
                  {filtrados.length < pacientes.length
                    ? `${filtrados.length} / ${pacientes.length}`
                    : pacientes.length}
                </span>
                <span className="mapa-stat-text">pacientes georeferenciados</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Leyenda / filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mapa-filtros">
          <input
            type="text"
            className="mapa-busqueda"
            placeholder="🔍 Buscar paciente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <span className="mapa-filtro-sep" />
          <span className="mapa-filtro-label">Filtrar:</span>
          {[
            { key: "TODOS",      label: `Todos (${pacientes.length})`,                         color: "#6366f1" },
            { key: "OPTIMO",     label: `Óptimo (${conteos.OPTIMO || 0})`,                     color: COLORES.OPTIMO },
            { key: "MODERADO",   label: `Moderado (${conteos.MODERADO || 0})`,                 color: COLORES.MODERADO },
            { key: "ALTO_RIESGO",label: `Alto Riesgo (${conteos.ALTO_RIESGO || 0})`,           color: COLORES.ALTO_RIESGO },
            { key: "SIN_DATOS",  label: `Sin análisis (${conteos.SIN_DATOS || 0})`,            color: COLORES.SIN_DATOS },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                border: filtro === f.key ? `2px solid ${f.color}` : "2px solid transparent",
                background: filtro === f.key ? f.color + "18" : "#f1f5f9",
                color: filtro === f.key ? f.color : "#64748b",
                fontWeight: filtro === f.key ? 700 : 500,
                fontSize: "0.82rem", transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                background: f.color, display: "inline-block", flexShrink: 0,
              }} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="card" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
          Cargando mapa...
        </div>
      ) : pacientes.length === 0 ? (
        <div className="card" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
          <p style={{ fontSize: "2rem", marginBottom: 8 }}>📍</p>
          <p>No hay pacientes georeferenciados aún.</p>
          <p style={{ fontSize: "0.82rem", marginTop: 8 }}>
            Edita un paciente para que se geocodifique automáticamente,
            o ejecuta <code>node geocodificar_pacientes.cjs</code> en el backend.
          </p>
        </div>
      ) : (
        <div className="mapa-wrapper">
          <MapContainer
            center={CENTRO_HN}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <BotonCentrar />
            {filtrados.map(p => (
              <Marker
                key={p.id}
                position={[p.latitud, p.longitud]}
                icon={crearIcono(p.clasificacion || "SIN_DATOS")}
              >
                <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
                  <strong>{p.nombre}</strong>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>
                      {p.nombre}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 6 }}>
                      {[p.municipio, p.departamento].filter(Boolean).join(", ")}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      <span style={{
                        background: (COLORES[p.clasificacion] || COLORES.SIN_DATOS) + "22",
                        color: COLORES[p.clasificacion] || COLORES.SIN_DATOS,
                        borderRadius: 12, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700,
                      }}>
                        {LABELS[p.clasificacion] || "Sin análisis"}
                      </span>
                      {p.institucion && (
                        <span style={{ background: "#f1f5f9", borderRadius: 12, padding: "2px 8px", fontSize: "0.75rem", color: "#475569" }}>
                          {p.institucion}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                      style={{
                        width: "100%", padding: "6px 0", background: "#6366f1",
                        color: "#fff", border: "none", borderRadius: 6,
                        cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
                      }}
                    >
                      Ver paciente →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </Layout>
  );
}
