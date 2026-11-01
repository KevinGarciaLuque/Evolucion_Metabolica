import mysql from "mysql2/promise";

function escapeValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (Buffer.isBuffer(v)) return `X'${v.toString("hex")}'`;
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
  const escaped = String(v).replace(/[\0\n\r\b\t\x1a'"\\]/g, (c) => {
    switch (c) {
      case "\0": return "\\0";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\b": return "\\b";
      case "\t": return "\\t";
      case "\x1a": return "\\Z";
      case "'": return "\\'";
      case '"': return '\\"';
      case "\\": return "\\\\";
      default: return c;
    }
  });
  return `'${escaped}'`;
}

// Genera un dump SQL (DROP + CREATE + INSERT) de todas las tablas de la base
// apuntada por `pool`, sin depender del binario mysqldump del sistema.
export async function dumpDatabase(pool) {
  const [tables] = await pool.query("SHOW TABLES");
  const key = Object.keys(tables[0] || {})[0];
  const tableNames = tables.map((t) => t[key]);

  let sql = `SET FOREIGN_KEY_CHECKS=0;\n\n`;

  for (const table of tableNames) {
    const [[createRow]] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
    sql += `DROP TABLE IF EXISTS \`${table}\`;\n${createRow["Create Table"]};\n\n`;

    const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
    if (rows.length) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `\`${c}\``).join(", ");
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valuesSql = chunk
          .map((row) => `(${columns.map((c) => escapeValue(row[c])).join(", ")})`)
          .join(",\n");
        sql += `INSERT INTO \`${table}\` (${colList}) VALUES\n${valuesSql};\n`;
      }
      sql += "\n";
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS=1;\n`;
  return sql;
}

// Ejecuta un dump .sql completo (DROP/CREATE/INSERT) contra la base indicada,
// usando una conexión dedicada con multipleStatements (no el pool compartido).
export async function importSqlDump({ host, port, user, password, database }, sqlText) {
  const connection = await mysql.createConnection({
    host, port, user, password, database,
    multipleStatements: true,
    dateStrings: true,
  });
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    await connection.query(sqlText);
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    await connection.end();
  }
}

// Igual que importSqlDump, pero ejecuta el archivo por tandas (~2 MB) para poder informar el avance.
// `onProgreso(fraccion, bytesHechos, bytesTotal)` se llama después de cada tanda.
// Si el dump usa DELIMITER (rutinas/triggers) no se puede partir con seguridad: se ejecuta de una vez.
export async function importSqlDumpConProgreso({ host, port, user, password, database }, sqlText, onProgreso = () => {}) {
  const TANDA = 2 * 1024 * 1024;
  const connection = await mysql.createConnection({
    host, port, user, password, database,
    multipleStatements: true,
    dateStrings: true,
  });
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    const total = Buffer.byteLength(sqlText, "utf8");
    if (/^\s*DELIMITER\s/im.test(sqlText)) {
      await connection.query(sqlText);
      onProgreso(1, total, total);
    } else {
      let acc = [], bytes = 0, hechos = 0;
      for (const linea of sqlText.split("\n")) {
        acc.push(linea);
        bytes += Buffer.byteLength(linea, "utf8") + 1;
        // Se corta solo donde termina una sentencia (línea que acaba en ";")
        if (bytes >= TANDA && /;\s*$/.test(linea)) {
          await connection.query(acc.join("\n"));
          hechos += bytes;
          onProgreso(Math.min(hechos / total, 1), hechos, total);
          acc = []; bytes = 0;
        }
      }
      if (acc.length) await connection.query(acc.join("\n"));
      onProgreso(1, total, total);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    await connection.end();
  }
}
