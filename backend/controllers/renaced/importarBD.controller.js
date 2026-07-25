import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getTenantPool } from "../../config/db.renaced.js";
import { dumpDatabase, importSqlDump } from "../../utils/sqlDump.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupsDir = path.join(__dirname, "..", "..", "uploads", "renaced_backups");

// Restaura un dump .sql completo sobre renaced_mexico. Antes de aplicarlo,
// genera un backup local de la base actual por si hay que revertir.
// Restringido al tenant México — no debe usarse para otros países RENACED.
export async function importarBaseDatosMexico(req, res) {
  if (req.usuario?.perfil_id !== 1) {
    return res.status(403).json({ error: "Acceso denegado: se requiere perfil Administrador" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Debes subir un archivo .sql" });
  }
  if (!req.file.originalname.toLowerCase().endsWith(".sql")) {
    return res.status(400).json({ error: "El archivo debe tener extensión .sql" });
  }

  const dbName = req.usuario.db_name || process.env.RENACED_MX_DB_NAME || "renaced_mexico";
  const dbHost = req.usuario.db_host || process.env.DB_HOST;
  const dbMexico = process.env.RENACED_MX_DB_NAME || "renaced_mexico";

  if (req.usuario.tenant !== "mx" || dbName !== dbMexico) {
    return res.status(403).json({ error: "Este módulo solo está habilitado para RENACED México" });
  }

  try {
    fs.mkdirSync(backupsDir, { recursive: true });

    const pool = getTenantPool(dbName, dbHost);
    const backupSql = await dumpDatabase(pool);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupsDir, `renaced_mexico_${timestamp}.sql`);
    fs.writeFileSync(backupPath, backupSql, "utf8");

    const sqlText = req.file.buffer.toString("utf8");
    await importSqlDump(
      {
        host: dbHost,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: dbName,
      },
      sqlText
    );

    res.json({
      mensaje: "Base de datos de RENACED México importada correctamente",
      backup: path.basename(backupPath),
    });
  } catch (error) {
    console.error("Error al importar base de datos RENACED México:", error);
    res.status(500).json({
      error: "Error al importar la base de datos. Se generó un backup antes de intentar la importación; si el esquema quedó a medias, puede restaurarse desde ese backup.",
      detalle: error?.message || String(error),
    });
  }
}
