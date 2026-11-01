import { useState, useRef, useEffect } from "react";
import RenacedLayout from "../components/RenacedLayout";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useRenacedAuth } from "../context/RenacedAuthContext";
import { importarBaseDatosMexico, iniciarMigracionPHP, getEstadoMigracionPHP } from "../api/renacedApi";
import ImportarConsentimientos from "../components/ImportarConsentimientos";
import { HiOutlineDocumentArrowUp, HiOutlineExclamationTriangle } from "react-icons/hi2";

function MigrarBDPHP() {
  const [archivo, setArchivo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [trabajoId, setTrabajoId] = useState(null);
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");
  const [modo, setModo] = useState("actualizar");
  const [subida, setSubida] = useState(null); // { cargado, total } mientras el archivo viaja al servidor
  const inputRef = useRef(null);
  const logRef = useRef(null);
  const corriendo = !!subida || (!!trabajoId && (!estado || estado.estado === "corriendo"));

  useEffect(() => {
    if (!trabajoId) return;
    let activo = true;
    const tick = async () => {
      try {
        const { data } = await getEstadoMigracionPHP(trabajoId);
        if (!activo) return;
        setEstado(data);
        if (data.estado === "corriendo") setTimeout(tick, 1000);
      } catch (e) {
        if (!activo) return;
        setError(e.response?.data?.error || "Se perdió la conexión con el servidor");
        setTrabajoId(null);
      }
    };
    tick();
    return () => { activo = false; };
  }, [trabajoId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [estado?.log?.length]);

  function handleSeleccionar(e) {
    const f = e.target.files?.[0] || null;
    setError("");
    if (f && !f.name.toLowerCase().endsWith(".sql")) {
      setError("El archivo debe tener extensión .sql");
      setArchivo(null);
      return;
    }
    setArchivo(f);
  }

  async function handleIniciar() {
    setConfirmando(false);
    setError("");
    setEstado(null);
    setSubida({ cargado: 0, total: archivo.size });
    try {
      const { data } = await iniciarMigracionPHP(archivo, modo, (ev) =>
        setSubida({ cargado: ev.loaded, total: ev.total || archivo.size }));
      setTrabajoId(data.id);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo iniciar la migración");
    } finally {
      setSubida(null);
    }
  }

  const mb = (n) => (n / 1048576).toFixed(1);
  const pctSubida = subida && subida.total ? Math.round((subida.cargado / subida.total) * 100) : 0;
  const pct = subida ? pctSubida : estado ? (estado.estado === "terminado" ? 100 : estado.porcentaje ?? 0) : 0;
  const titulo = subida ? "Subiendo archivo al servidor…"
    : estado ? (estado.estado === "terminado" ? "Terminado" : estado.estado === "error" ? "Error" : estado.paso) : "";
  const detalle = subida ? `${mb(subida.cargado)} MB de ${mb(subida.total)} MB` : estado?.detalle || "";
  const mostrarBarra = !!subida || !!estado;

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Migrar base del sistema anterior (PHP)</h3>
      <p style={{ color: "#64748b", fontSize: 13.5, marginBottom: 14 }}>
        Sube el archivo <strong>renaced1.sql</strong> exportado del sistema anterior.
        Antes de empezar se genera un backup automático.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {[
          ["actualizar", "Actualizar (recomendado)",
            "Vacía los datos de pacientes del sistema anterior y los carga de nuevo desde el archivo. Conserva usuarios, clínicas, catálogos y escaneos de monitores. Los pacientes que ya existían conservan su folio."],
          ["fusionar", "Fusionar",
            "Agrega lo nuevo sin borrar nada. Puede duplicar registros de algunas tablas y no actualiza otras: úsalo solo si sabes por qué."],
        ].map(([valor, titulo, desc]) => (
          <label key={valor} style={{
            display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, cursor: corriendo ? "default" : "pointer",
            border: `1px solid ${modo === valor ? "#6366f1" : "#e2e8f0"}`, background: modo === valor ? "#eef2ff" : "#fff",
          }}>
            <input type="radio" name="modo-migracion" checked={modo === valor} disabled={corriendo} onChange={() => setModo(valor)} style={{ marginTop: 3 }} />
            <span>
              <strong style={{ fontSize: 14 }}>{titulo}</strong>
              <span style={{ display: "block", fontSize: 12.5, color: "#64748b" }}>{desc}</span>
            </span>
          </label>
        ))}
      </div>

      <input ref={inputRef} type="file" accept=".sql" onChange={handleSeleccionar}
        disabled={corriendo} style={{ marginBottom: 16, display: "block" }} />

      {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

      <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}
        disabled={!archivo || corriendo} onClick={() => setConfirmando(true)}>
        <HiOutlineDocumentArrowUp size={16} />
        {corriendo ? (modo === "actualizar" ? "Actualizando…" : "Migrando…") : (modo === "actualizar" ? "Actualizar base de datos" : "Migrar base de datos")}
      </button>

      {mostrarBarra && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <strong style={{ fontSize: 14 }}>{titulo}</strong>
            <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: estado?.estado === "error" ? "#dc2626" : "#166534" }}>{pct}%</span>
          </div>
          <div style={{ background: "#e2e8f0", borderRadius: 8, height: 14, overflow: "hidden", marginBottom: 6 }}>
            <div style={{
              width: `${pct}%`, height: "100%", transition: "width .6s ease",
              background: estado?.estado === "error" ? "#dc2626" : "linear-gradient(90deg,#22c55e,#16a34a)",
            }} />
          </div>
          {detalle && <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 10 }}>{detalle}</div>}
          {estado?.estado === "error" && <p style={{ color: "#dc2626" }}>{estado.error} Hay un respaldo previo: {estado.backup || "no se alcanzó a generar"}.</p>}
          {estado?.estado === "terminado" && (
            <p style={{ color: "#166534" }}>Migración completada. Backup previo: {estado.backup}</p>
          )}
          {estado && (
            <pre ref={logRef} style={{
              background: "#0f172a", color: "#e2e8f0", fontSize: 12, padding: 10, borderRadius: 8,
              maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap", margin: 0,
            }}>{estado.log.join("\n")}</pre>
          )}
        </div>
      )}

      {confirmando && (
        <div className="modal-overlay" onClick={() => setConfirmando(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modo === "actualizar" ? "Confirmar actualización" : "Confirmar migración"}</h3>
            {modo === "actualizar" ? (
              <p style={{ color: "#64748b", marginBottom: 16 }}>
                Se <strong>vaciarán los datos de pacientes</strong> (pacientes, consultas, laboratorio, tratamientos, etc.) y se cargarán de nuevo
                desde <strong>{archivo?.name}</strong>. Los pacientes creados solo en esta aplicación (por ejemplo, de prueba) se eliminarán.
                Usuarios, clínicas, catálogos y escaneos de monitores no se tocan. Se genera un respaldo antes. El proceso puede tardar varios minutos
                y no debe cerrarse la página hasta que termine. ¿Continuar?
              </p>
            ) : (
              <p style={{ color: "#64748b", marginBottom: 16 }}>
                Se cargará <strong>{archivo?.name}</strong> y se fusionará con los datos actuales de RENACED México.
                El proceso puede tardar varios minutos. ¿Continuar?
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleIniciar}>{modo === "actualizar" ? "Sí, actualizar" : "Sí, migrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RenacedImportarBD() {
  const { usuario } = useRenacedAuth();
  const { usuario: usuarioSA } = useAuth();
  const esSuperAdmin = usuarioSA?.rol === "SUPER_ADMIN" || !!usuario?.super_admin;
  const [archivo, setArchivo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function handleSeleccionar(e) {
    const f = e.target.files?.[0] || null;
    setError("");
    setResultado(null);
    if (f && !f.name.toLowerCase().endsWith(".sql")) {
      setError("El archivo debe tener extensión .sql");
      setArchivo(null);
      return;
    }
    setArchivo(f);
  }

  async function handleImportar() {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    setResultado(null);
    try {
      const { data } = await importarBaseDatosMexico(archivo);
      setResultado(data);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e.response?.data?.error || "Error al importar la base de datos");
    } finally {
      setSubiendo(false);
      setConfirmando(false);
    }
  }

  return (
    <RenacedLayout>
      <div className="page-header">
        <div>
          <h1>Importar base de datos</h1>
          <p className="page-subtitle">RENACED México — reemplaza los datos actuales con un archivo .sql</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
          padding: 12, marginBottom: 18, color: "#991b1b", fontSize: 13.5,
        }}>
          <HiOutlineExclamationTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Esta acción <strong>reemplaza</strong> las tablas incluidas en el archivo (DROP + recrear)
            en la base de datos de RENACED México. Antes de aplicar los cambios se genera
            automáticamente un backup del estado actual en el servidor, por si hay que revertir.
          </div>
        </div>

        <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
          Archivo .sql
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".sql"
          onChange={handleSeleccionar}
          disabled={subiendo}
          style={{ marginBottom: 16 }}
        />

        {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

        {resultado && (
          <p style={{ color: "#166534", marginBottom: 12 }}>
            {resultado.mensaje} (backup: {resultado.backup})
          </p>
        )}

        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          disabled={!archivo || subiendo}
          onClick={() => setConfirmando(true)}
        >
          <HiOutlineDocumentArrowUp size={16} />
          {subiendo ? "Importando…" : "Importar base de datos"}
        </button>
      </div>

      {confirmando && (
        <div className="modal-overlay" onClick={() => !subiendo && setConfirmando(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar importación</h3>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              Vas a reemplazar los datos actuales de RENACED México con el contenido de{" "}
              <strong>{archivo?.name}</strong>. Se generará un backup antes de aplicar los cambios.
              ¿Continuar?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmando(false)} disabled={subiendo}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleImportar} disabled={subiendo}>
                {subiendo ? "Importando…" : "Sí, importar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {esSuperAdmin && <MigrarBDPHP />}
      {esSuperAdmin && <ImportarConsentimientos />}
    </RenacedLayout>
  );
}
