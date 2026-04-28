import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import { HiOutlineChatBubbleLeftEllipsis, HiOutlinePaperAirplane, HiOutlineCheckCircle, HiOutlineXCircle, HiArrowPath } from "react-icons/hi2";
import "./MensajesPanel.css";

function formatFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-HN", {
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
    preview: `🏥 *Hospital María, Especialidades Pediátricas*\n_Consulta de Diabetes · Endocrinología_\n\n━━━━━━━━━━━━━━━━━━━━\n\nEstimado/a *{nombre}*, 👋\n\nHemos revisado las métricas de tu monitor de glucosa y hemos detectado ⚠️ *alertas con niveles elevados* que requieren tu atención.\n\nPor favor, revisa los siguientes puntos:\n\n1️⃣ 🥗 *Plan de alimentación* — Verifica que estés siguiendo las indicaciones nutricionales.\n2️⃣ 🏃 *Cumplimiento de ejercicio* — El ejercicio regular ayuda a estabilizar la glucosa.\n3️⃣ 💉 *Dosis de insulina* — Asegúrate de que las dosis sean las indicadas por tu médico.\n\n📌 Si los niveles persisten elevados, por favor comunícate con tu médico tratante para coordinar tu próxima cita.\n\n¡Tu salud es nuestra prioridad! 💙\n\n━━━━━━━━━━━━━━━━━━━━\n_Este mensaje es informativo. En caso de emergencia, acude a tu doctor._`,
  },
  MODERADO: {
    label: "Moderado",
    color: "#d97706",
    bgLight: "#fef3c7",
    preview: `🏥 *Hospital María, Especialidades Pediátricas*\n_Consulta de Diabetes · Endocrinología_\n\n━━━━━━━━━━━━━━━━━━━━\n\nEstimado/a *{nombre}*, 👋\n\nHemos revisado las métricas de tu monitor de glucosa y observamos que tu control se encuentra en un nivel 🟡 *MODERADO*.\n\nTe recomendamos prestar atención a:\n\n1️⃣ 🥗 *Plan de alimentación* — Mantén una dieta equilibrada según tus indicaciones.\n2️⃣ 🏃 *Cumplimiento de ejercicio* — El ejercicio regular es clave para un buen control.\n3️⃣ 💉 *Dosis de insulina* — Verifica que estés administrando las dosis correctas.\n\n📅 Por favor, comunícate con tu médico tratante para dar seguimiento y mejorar tu control glucémico.\n\n¡Pequeños cambios hacen grandes diferencias! 💛\n\n━━━━━━━━━━━━━━━━━━━━\n_Este mensaje es informativo. En caso de emergencia, acude a tu doctor._`,
  },
  OPTIMO: {
    label: "TIR Óptimo",
    color: "#16a34a",
    bgLight: "#dcfce7",
    preview: `🏥 *Hospital María, Especialidades Pediátricas*\n_Consulta de Diabetes · Endocrinología_\n\n━━━━━━━━━━━━━━━━━━━━\n\nEstimado/a *{nombre}*, 👋\n\n¡Tenemos excelentes noticias! 🎉 Las métricas de tu monitor de glucosa muestran un control ✅ *ÓPTIMO*.\n\n🌟 *¡Felicitaciones por tu esfuerzo y dedicación!* Seguir así marca una gran diferencia en tu salud a largo plazo.\n\nRecuerda continuar con:\n\n✔️ Tu plan de alimentación\n✔️ Tu rutina de ejercicio\n✔️ La administración correcta de insulina\n📅 Tus citas de seguimiento programadas\n\n¡Sigue adelante, vas por el camino correcto! 💚\n\n━━━━━━━━━━━━━━━━━━━━\n_Este mensaje es informativo. En caso de emergencia, acude a tu doctor._`,
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
      <div className="mensajes-page">

        {/* Encabezado */}
        <div className="mensajes-header">
          <HiOutlineChatBubbleLeftEllipsis size={28} color="var(--color-primary, #2563eb)" />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Mensajes WhatsApp</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
              Envío masivo por clasificación TIR e historial de mensajes
            </p>
          </div>
        </div>

        {/* Tarjeta de envío masivo */}
        <div className="mensajes-card mensajes-card-body">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.2rem", color: "#111827" }}>
            Envío masivo por clasificación TIR
          </h2>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.8rem", color: "#6b7280" }}>
            Selecciona el grupo al que deseas enviar. El mensaje se personalizará con el nombre de cada paciente.
          </p>

          {/* Switches de clasificación */}
          <div className="mensajes-switches">
            {Object.entries(CLASIFICACIONES).map(([key, cfg]) => {
              const activo = clasificacionSel === key;
              return (
                <button
                  key={key}
                  onClick={() => { setClasificacionSel(key); setResultado(null); setError(null); }}
                  className="mensajes-switch-btn"
                  style={{
                    border: `2px solid ${activo ? cfg.color : "#d1d5db"}`,
                    background: activo ? cfg.color + "18" : "#fff",
                    color: activo ? cfg.color : "#6b7280",
                    fontWeight: activo ? 700 : 500,
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
            <div className="mensajes-label-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: CLASIFICACIONES[clasificacionSel].color }}>
                Mensaje — {CLASIFICACIONES[clasificacionSel].label}
              </label>
              <button
                onClick={() => setMensajesEdit(prev => ({ ...prev, [clasificacionSel]: CLASIFICACIONES[clasificacionSel].preview }))}
                style={{
                  fontSize: "0.72rem", color: "#6b7280", background: "none",
                  border: "1px solid #d1d5db", borderRadius: 6, padding: "0.2rem 0.6rem",
                  cursor: "pointer", whiteSpace: "nowrap",
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
                color: "#1f2937", outline: "none",
              }}
            />
          </div>

          <div className="mensajes-accion-row">
            <button
              onClick={handleEnviarMasivo}
              disabled={enviando}
              className="mensajes-btn-enviar"
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
              <div className="mensajes-resultado">
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
        <div className="mensajes-card" style={{ overflow: "hidden" }}>
          <div className="mensajes-hist-header">
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
            <div className="mensajes-tabla-wrap">
              <table className="mensajes-tabla">
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
                      <td style={{ padding: "0.65rem 1rem", maxWidth: 280 }}>
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
            <div className="mensajes-paginacion">
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
