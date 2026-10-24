import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Cache de pools por tenant — cada país RENACED tiene su propia base de datos
// y su propia conexión; nunca se comparte ni se mezcla entre tenants.
const poolCache = new Map();

export function getTenantPool(dbName, dbHost) {
  const host = dbHost || process.env.DB_HOST;
  const database = dbName || process.env.RENACED_MX_DB_NAME || "renaced_mexico";
  const key = `${host}::${database}`;

  if (!poolCache.has(key)) {
    poolCache.set(key, mysql.createPool({
      host,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database,
      port: process.env.DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    }));
  }

  return poolCache.get(key);
}

// Pool por defecto (México) — usado por el login legacy y scripts de migración
const poolRenaced = getTenantPool(process.env.RENACED_MX_DB_NAME || "renaced_mexico", null);

export default poolRenaced;
