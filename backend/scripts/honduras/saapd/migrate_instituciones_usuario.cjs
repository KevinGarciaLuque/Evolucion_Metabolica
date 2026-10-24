/**
 * Agrega columna instituciones_acceso (JSON) a usuarios.
 * Uso: node migrate_instituciones_usuario.cjs "mysql://user:pass@host:3306/db"
 */
const mysql = require("mysql2/promise");

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Uso: node migrate_instituciones_usuario.cjs <DATABASE_URL>");
  process.exit(1);
}

const DEFAULT_INST = JSON.stringify(["HMEP", "IHSS", "HEU"]);

(async () => {
  const conn = await mysql.createConnection(DATABASE_URL);
  try {
    const [rows] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'instituciones_acceso'"
    );

    if (rows.length === 0) {
      await conn.query("ALTER TABLE usuarios ADD COLUMN instituciones_acceso JSON NULL AFTER mostrar_info_graficas");
      console.log("Columna instituciones_acceso agregada");
    } else {
      console.log("La columna instituciones_acceso ya existe");
    }

    await conn.query("UPDATE usuarios SET instituciones_acceso = ? WHERE instituciones_acceso IS NULL", [DEFAULT_INST]);
    console.log("Usuarios existentes actualizados con instituciones por defecto");
  } finally {
    await conn.end();
  }
})();
