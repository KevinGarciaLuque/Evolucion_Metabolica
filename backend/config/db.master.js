import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Pool para la base de datos maestra del Super Admin ALAD
// Contiene la tabla de tenants (países) y configuración global
const poolMaster = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.MASTER_DB_NAME || "alad_master",
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  dateStrings: true,
});

export default poolMaster;
