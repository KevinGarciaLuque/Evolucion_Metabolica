import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import { HiOutlineChatBubbleLeftEllipsis, HiOutlinePaperAirplane, HiOutlineCheckCircle, HiOutlineXCircle, HiArrowPath } from "react-icons/hi2";

function formatFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-GT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    hour12: true,
  });
}

const CLASIFICACIONES = {
  ALTO_RIESGO: {
    label: "Alto Riesgo",
    color: "#ef4444",
    bgLight: "#fee2e2",
    preview: `Estimado/a {nombre}, le contactamos de la consulta de diabetes de Endocrinología de (Hospital María de Especialidades Pediátricas). Hemos detectado alteraciones en las métricas de tu monitor, vemos alertas con niveles altos en la glucosa, por favor revisa:\n1.- Tu Plan de alimentación\n2.- Cumplimiento de Ejercicio\n3.- Revisa tu dosis de insulina que sean las adecuadas\nSi persiste, por favor comuníquese con su médico tratante para coordinar su próxima cita. Gracias.`,
  },
  MODERADO: {
    label: "Moderado",
    color: "#d97706",
    bgLight: "#fef3c7",
    preview: `Estimado/a {nombre}, le contactamos de la consulta de diabetes de Endocrinología de (Hospital María de Especialidades Pediátricas). Hemos detectado que las métricas de tu monitor se encuentran en un nivel MODERADO. Te recomendamos revisar:\n1.- Tu Plan de alimentación\n2.- Cumplimiento de Ejercicio\n3.- Tu dosis de insulina\nPor favor comuníquese con su médico tratante para seguimiento. Gracias.`,
  },
  OPTIMO: {
    label: "TIR Óptimo",
    color: "#16a34a",
    bgLight: "#dcfce7",
    preview: `Estimado/a {nombre}, le contactamos de la consulta de diabetes de Endocrinología de (Hospital María de Especialidades Pediátricas). Sus métricas de monitoreo continuo de glucosa muestran un control ÓPTIMO. ¡Felicitaciones, siga con su excelente manejo! Recuerde mantener sus citas de seguimiento. Gracias.`,
  },
};

export default function MensajesPanel() {
  const [historial,   setHistorial]   = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pagina,      setPagina]      = useState(1);
  const [cargando,    setCargando]    = useState(true);
  const [enviando,         setEnviando]         = useState(false);
  const [resultado,        setResultado]        = useState(null);
  const [error,            setError]            = useState(null);
  const [clasificacionSel, setClasificacionSel] = useState("ALTO_RIESGO");
  const [mensajesEdit,     setMensajesEdit]     = useState({
    ALTO_RIESGO: CLASIFICACIONES.ALTO_RIESGO.preview,
    MODERADO:    CLASIFICACIONES.MODERADO.preview,
    OPTIMO:      CLASIFICACIONES.OPTIMO.preview,
  });

  const LIMIT = 50;

  const cargarHistorial = useCallback(async (p = 1) => {
    setCargando(true);
    try {
      const { data } = await api.get(`/mensajes?page=${p}&limit=${LIMIT}`);
      setHistorial(data.data);
      setTotal(data.total);
      setPagina(p);
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarHistorial(1); }, [cargarHistorial]);

  const handleEnviarMasivo = async () => {
    const cfg = CLASIFICACIONES[clasificacionSel];
    if (!window.confirm(`¿Enviar mensaje a todos los pacientes en ${cfg.label}?`)) return;
    setEnviando(true);
    setResultado(null);
    setError(null);
    try {
      const { data } = await api.post("/mensajes/enviar-alto-riesgo", { clasificacion: clasificacionSel, mensaje: mensajesEdit[clasificacionSel] });
      setResultado(data);
      cargarHistorial(1);
    } catch (err) {
      setError(err.response?.data?.error || "Error al enviar mensajes.");
    } finally {
      setEnviando(false);
    }
  };

  const totalPaginas = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>

        {/* Encabezado */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <HiOutlineChatBubbleLeftEllipsis size={28} color="var(--color-primary, #2563eb)" />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Mensajes WhatsApp</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
              Envío masivo por clasificación TIR e historial de mensajes
            </p>
          </div>
        </div>

        {/* Tarjeta de envío masivo */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          padding: "1.25rem 1.5rem", marginBottom: "1.5rem",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.2rem", color: "#111827" }}>
            Envío masivo por clasificación TIR
          </h2>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.8rem", color: "#6b7280" }}>
            Selecciona el grupo al que deseas enviar. El mensaje se personalizará con el nombre de cada paciente.
          </p>

          {/* Switches de clasificación */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {Object.entries(CLASIFICACIONES).map(([key, cfg]) => {
              const activo = clasificacionSel === key;
              return (
                <button
                  key={key}
                  onClick={() => { setClasificacionSel(key); setResultado(null); setError(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.55rem",
                    padding: "0.45rem 1rem", borderRadius: 20, cursor: "pointer",
                    border: `2px solid ${activo ? cfg.color : "#d1d5db"}`,
                    background: activo ? cfg.color + "18" : "#fff",
                    color: activo ? cfg.color : "#6b7280",
                    fontWeight: activo ? 700 : 500, fontSize: "0.85rem",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    display: "inline-flex", width: 30, height: 17, borderRadius: 9,
                    background: activo ? cfg.color : "#d1d5db",
                    alignItems: "center", padding: "0 2px", transition: "background 0.15s", flexShrink: 0,
                  }}>
                    <span style={{
                      width: 13, height: 13, borderRadius: "50%", background: "#fff",
                      marginLeft: activo ? 13 : 0, transition: "margin-left 0.15s",
                      boxShadow: "0 1px 3px rgba(0,0,0,.25)",
                    }} />
                  </span>
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Mensaje editable */}
          <div style={{ marginBottom: "1.1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: CLASIFICACIONES[clasificacionSel].color }}>
                Mensaje — {CLASIFICACIONES[clasificacionSel].label}
              </label>
              <button
                onClick={() => setMensajesEdit(prev => ({ ...prev, [clasificacionSel]: CLASIFICACIONES[clasificacionSel].preview }))}
                style={{
                  fontSize: "0.72rem", color: "#6b7280", background: "none",
                  border: "1px solid #d1d5db", borderRadius: 6, padding: "0.2rem 0.6rem",
                  cursor: "pointer",
                }}
              >
                Restaurar original
              </button>
            </div>
            <textarea
              rows={7}
              value={mensajesEdit[clasificacionSel]}
              onChange={e => setMensajesEdit(prev => ({ ...prev, [clasificacionSel]: e.target.value }))}
              style={{
                width: "100%", boxSizing: "border-box", padding: "0.65rem 0.85rem",
                border: `1.5px solid ${CLASIFICACIONES[clasificacionSel].color}60`,
                borderRadius: 8, fontSize: "0.815rem", fontFamily: "inherit",
                lineHeight: 1.6, resize: "vertical",
                background: CLASIFICACIONES[clasificacionSel].bgLight,
                color: "#1f2937",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={handleEnviarMasivo}
              disabled={enviando}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: CLASIFICACIONES[clasificacionSel].color,
                color: "#fff", border: "none",
                borderRadius: 8, padding: "0.55rem 1.25rem",
                fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando
                ? <><HiArrowPath size={16} style={{ animation: "spin 1s linear infinite" }} /> Enviando...</>
                : <><HiOutlinePaperAirplane size={16} /> Enviar a pacientes en {CLASIFICACIONES[clasificacionSel].label}</>
              }
            </button>

            {resultado && (
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.875rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#16a34a", fontWeight: 600 }}>
                  <HiOutlineCheckCircle size={16} /> {resultado.enviados} enviados
                </span>
                {resultado.errores > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#dc2626", fontWeight: 600 }}>
                    <HiOutlineXCircle size={16} /> {resultado.errores} errores
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <p style={{ marginTop: "0.75rem", color: "#dc2626", fontSize: "0.85rem" }}>{error}</p>
          )}
        </div>

        {/* Historial */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)"
        }}>
          <div style={{
            padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
              Historial de mensajes <span style={{ color: "#6b7280", fontWeight: 400 }}>({total})</span>
            </h2>
            <button
              onClick={() => cargarHistorial(pagina)}
              title="Actualizar"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
            >
              <HiArrowPath size={18} />
            </button>
          </div>

          {cargando ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Cargando...</p>
          ) : historial.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
              No hay mensajes enviados aún.
            </p>
          ) : (
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 420 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.855rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Fecha", "Paciente", "Teléfono", "Mensaje", "Estado", "Enviado por"].map(h => (
                      <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#6b7280" }}>{formatFecha(m.fecha)}</td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500 }}>{m.paciente_nombre}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{m.telefono}</td>
                      <td style={{ padding: "0.65rem 1rem", maxWidth: 320 }}>
                        <span style={{
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical", overflow: "hidden"
                        }}>
                          {m.mensaje}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {m.estado === "enviado" ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            background: "#dcfce7", color: "#16a34a",
                            borderRadius: 20, padding: "0.2rem 0.65rem", fontWeight: 600, fontSize: "0.78rem"
                          }}>
                            <HiOutlineCheckCircle size={13} /> Enviado
                          </span>
                        ) : (
                          <span
                            title={m.error_detalle || ""}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "0.3rem",
                              background: "#fee2e2", color: "#dc2626",
                              borderRadius: 20, padding: "0.2rem 0.65rem", fontWeight: 600, fontSize: "0.78rem",
                              cursor: "help"
                            }}
                          >
                            <HiOutlineXCircle size={13} /> Error
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{m.enviado_por_nombre || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", padding: "1rem" }}>
              <button
                onClick={() => cargarHistorial(pagina - 1)}
                disabled={pagina === 1}
                style={{ padding: "0.35rem 0.85rem", borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer", background: pagina === 1 ? "#f3f4f6" : "#fff" }}
              >
                ‹ Anterior
              </button>
              <span style={{ alignSelf: "center", fontSize: "0.85rem", color: "#6b7280" }}>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => cargarHistorial(pagina + 1)}
                disabled={pagina === totalPaginas}
                style={{ padding: "0.35rem 0.85rem", borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer", background: pagina === totalPaginas ? "#f3f4f6" : "#fff" }}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}
