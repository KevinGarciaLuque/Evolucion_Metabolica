import { useState, useRef, useEffect } from "react";
import RenacedLayout from "../components/RenacedLayout";
import { useAuth } from "../../../shared/context/AuthContext";
import { useRenacedAuth } from "../context/RenacedAuthContext";
import { importarBaseDatosMexico, iniciarMigracionPHP, getEstadoMigracionPHP } from "../api/renacedApi";
import { HiOutlineDocumentArrowUp, HiOutlineExclamationTriangle } from "react-icons/hi2";

function MigrarBDPHP() {
  const [archivo, setArchivo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [trabajoId, setTrabajoId] = useState(null);
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const logRef = useRef(null);
  const corriendo = !!trabajoId && (!estado || estado.estado === "corriendo");

  useEffect(() => {
    if (!trabajoId) return;
    let activo = true;
    const tick = async () => {
      try {
        const { data } = await getEstadoMigracionPHP(trabajoId);
        if (!activo) return;
        setEstado(data);
        if (data.estado === "corriendo") setTimeout(tick, 2000);
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
    try {
      const { data } = await iniciarMigracionPHP(archivo);
      setTrabajoId(data.id);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo iniciar la migración");
    }
  }

  const pct = estado ? Math.round((estado.pasoActual / estado.totalPasos) * 100) : 0;

  return (
    <div className="card" style={{ maxWidth: 640, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Migrar base del sistema anterior (PHP)</h3>
      <p style={{ color: "#64748b", fontSize: 13.5, marginBottom: 14 }}>
        Sube el archivo <strong>renaced1.sql</strong> exportado del sistema anterior. Los registros se
        fusionan con los datos actuales conservando sus identificadores originales; no se borra lo existente.
        Antes de empezar se genera un backup automático.
      </p>

      <input ref={inputRef} type="file" accept=".sql" onChange={handleSeleccionar}
        disabled={corriendo} style={{ marginBottom: 16, display: "block" }} />

      {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

      <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}
        disabled={!archivo || corriendo} onClick={() => setConfirmando(true)}>
        <HiOutlineDocumentArrowUp size={16} />
        {corriendo ? "Migrando…" : "Migrar base de datos"}
      </button>

      {estado && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13.5, marginBottom: 6 }}>
            <strong>{estado.estado === "terminado" ? "Terminado" : estado.estado === "error" ? "Error" : estado.paso}</strong>
            {" "}({estado.pasoActual}/{estado.totalPasos})
          </div>
          <div style={{ background: "#e2e8f0", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 10 }}>
            <div style={{
              width: `${estado.estado === "terminado" ? 100 : pct}%`, height: "100%",
              background: estado.estado === "error" ? "#dc2626" : "#16a34a", transition: "width .3s",
            }} />
          </div>
          {estado.estado === "error" && <p style={{ color: "#dc2626" }}>{estado.error}</p>}
          {estado.estado === "terminado" && (
            <p style={{ color: "#166534" }}>Migración completada. Backup previo: {estado.backup}</p>
          )}
          <pre ref={logRef} style={{
            background: "#0f172a", color: "#e2e8f0", fontSize: 12, padding: 10, borderRadius: 8,
            maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap", margin: 0,
          }}>{estado.log.join("\n")}</pre>
        </div>
      )}

      {confirmando && (
        <div className="modal-overlay" onClick={() => setConfirmando(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar migración</h3>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              Se cargará <strong>{archivo?.name}</strong> y se fusionará con los datos actuales de RENACED México.
              El proceso puede tardar varios minutos. ¿Continuar?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleIniciar}>Sí, migrar</button>
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
    </RenacedLayout>
  );
}
