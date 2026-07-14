import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Pool exclusivo para la base de datos RENACED México
// Completamente separado de Evolucion Metabolica — los datos nunca se mezclan
const poolRenaced = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

export default poolRenaced;
