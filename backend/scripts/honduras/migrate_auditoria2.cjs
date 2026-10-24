/* Migración: ampliar tabla auditoria_sesiones para registrar acciones de usuarios */
const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
  });

  // Cambiar accion de ENUM a VARCHAR para soportar más tipos
  await conn.execute(`
    ALTER TABLE auditoria_sesiones
      MODIFY COLUMN accion VARCHAR(60) NOT NULL DEFAULT 'login'
  `).catch(() => console.log("accion ya es VARCHAR o ya existe"));

  // Agregar columnas entidad, entidad_id, descripcion si no existen
  for (const sql of [
    `ALTER TABLE auditoria_sesiones ADD COLUMN entidad     VARCHAR(60)  DEFAULT NULL AFTER accion`,
    `ALTER TABLE auditoria_sesiones ADD COLUMN entidad_id  INT          DEFAULT NULL AFTER entidad`,
    `ALTER TABLE auditoria_sesiones ADD COLUMN descripcion VARCHAR(255) DEFAULT NULL AFTER entidad_id`,
  ]) {
    await conn.execute(sql).catch(() => {/* columna ya existe */});
  }

  console.log("✅ Tabla auditoria_sesiones actualizada.");
  await conn.end();
})();
