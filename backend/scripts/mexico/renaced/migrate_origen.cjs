// Configuración de la base ORIGEN (dump del sistema PHP viejo) para los scripts ETL.
// Por defecto apunta al MySQL local (XAMPP) con la base renaced1, como siempre.
// El módulo web "Migrar BD PHP" la sobreescribe con ORIGEN_DB_* para apuntar a una base temporal.
module.exports = {
  host:     process.env.ORIGEN_DB_HOST     || "localhost",
  port:     Number(process.env.ORIGEN_DB_PORT || 3306),
  user:     process.env.ORIGEN_DB_USER     || "root",
  password: process.env.ORIGEN_DB_PASSWORD ?? "123456789",
  database: process.env.ORIGEN_DB_NAME     || "renaced1",
};
