import { useState, useRef } from "react";
import RenacedLayout from "../../components/RenacedLayout";
import { importarBaseDatosMexico } from "../../api/renacedApi";
import { HiOutlineDocumentArrowUp, HiOutlineExclamationTriangle } from "react-icons/hi2";

export default function RenacedImportarBD() {
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
    </RenacedLayout>
  );
}
