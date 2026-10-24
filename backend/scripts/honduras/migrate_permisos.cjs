/**
 * Crea la tabla permisos_modulos y asigna todos los módulos por defecto
 * a los usuarios existentes que no sean admin.
 *
 * Uso: node migrate_permisos.cjs "mysql://user:pass@host:port/db"
 */

const mysql = require("mysql2/promise");

const MODULOS = ["dashboard", "consolidado", "pacientes", "analisis", "consultas", "mapa"];

async function main() {
  const url = process.argv[2] || process.env.DATABASE_URL;
  if (!url) {
    console.error("Uso: node migrate_permisos.cjs <DATABASE_URL>");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  console.log("✅ Conectado a la base de datos");

  // 1. Crear tabla
  await conn.query(`
    CREATE TABLE IF NOT EXISTS permisos_modulos (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id  INT NOT NULL,
      modulo      VARCHAR(50) NOT NULL,
      UNIQUE KEY uk_usuario_modulo (usuario_id, modulo),
      CONSTRAINT fk_pm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✅ Tabla permisos_modulos creada (o ya existía)");

  // 2. Obtener usuarios no-admin
  const [usuarios] = await conn.query(
    "SELECT id, nombre, rol FROM usuarios WHERE rol != 'admin'"
  );
  console.log(`ℹ️  Usuarios no-admin encontrados: ${usuarios.length}`);

  // 3. Insertar módulos por defecto para los que aún no tienen permisos
  let insertados = 0;
  for (const u of usuarios) {
    const [existentes] = await conn.query(
      "SELECT COUNT(*) as total FROM permisos_modulos WHERE usuario_id = ?",
      [u.id]
    );
    if (existentes[0].total === 0) {
      for (const modulo of MODULOS) {
        await conn.query(
          "INSERT IGNORE INTO permisos_modulos (usuario_id, modulo) VALUES (?, ?)",
          [u.id, modulo]
        );
        insertados++;
      }
      console.log(`  → Permisos completos asignados a: ${u.nombre} (${u.rol})`);
    } else {
      console.log(`  ↷ Ya tiene permisos configurados: ${u.nombre}`);
    }
  }

  console.log(`✅ Migración completada. Entradas insertadas: ${insertados}`);
  await conn.end();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
