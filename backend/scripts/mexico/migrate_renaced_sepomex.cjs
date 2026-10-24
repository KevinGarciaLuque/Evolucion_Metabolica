// Importa el catálogo nacional de códigos postales de Correos de México (SEPOMEX)
// a la tabla cat_codigo_postal de renaced_mexico.
// Ejecutar: node backend/migrate_renaced_sepomex.cjs [--force] [--archivo=ruta/cpdescarga.txt]
// El catálogo es de uso libre pero no redistribuible: se descarga al ejecutar, no se versiona.

const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const URL_SEPOMEX = "https://www.correosdemexico.gob.mx/datosabiertos/cp/cpdescarga.txt";

// c_estado de SEPOMEX (INEGI) → clave CURP usada en paciente.estado_residencia
const NUMERICO_A_CURP = {
  "01": "AS", "02": "BC", "03": "BS", "04": "CC", "05": "CL", "06": "CM",
  "07": "CS", "08": "CH", "09": "DF", "10": "DG", "11": "GT", "12": "GR",
  "13": "HG", "14": "JC", "15": "MC", "16": "MN", "17": "MS", "18": "NT",
  "19": "NL", "20": "OC", "21": "PL", "22": "QT", "23": "QR", "24": "SP",
  "25": "SL", "26": "SR", "27": "TC", "28": "TS", "29": "TL", "30": "VZ",
  "31": "YN", "32": "ZS",
};

async function obtenerTexto() {
  const arg = process.argv.find((a) => a.startsWith("--archivo="));
  const buf = arg
    ? fs.readFileSync(arg.slice("--archivo=".length))
    : Buffer.from(await (await fetch(URL_SEPOMEX)).arrayBuffer());
  return new TextDecoder("latin1").decode(buf);
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  const dbName = process.env.RENACED_MX_DB_NAME || "renaced_mexico";
  try {
    await conn.query(`USE \`${dbName}\``);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cat_codigo_postal (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cp          CHAR(5)      NOT NULL,
        colonia     VARCHAR(150) NOT NULL,
        tipo_asenta VARCHAR(50)  DEFAULT NULL,
        municipio   VARCHAR(120) DEFAULT NULL,
        estado_cve  CHAR(2)      NOT NULL,
        INDEX idx_estado_colonia (estado_cve, colonia),
        INDEX idx_cp (cp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM cat_codigo_postal");
    if (n > 0 && !process.argv.includes("--force")) {
      console.log(`cat_codigo_postal ya tiene ${n} filas. Usa --force para recargarla.`);
      return;
    }

    console.log("Obteniendo catálogo SEPOMEX…");
    const lineas = (await obtenerTexto()).split(/\r?\n/);
    const iHeader = lineas.findIndex((l) => l.startsWith("d_codigo|"));
    if (iHeader < 0) throw new Error("Formato de archivo SEPOMEX no reconocido");

    const filas = [];
    for (const linea of lineas.slice(iHeader + 1)) {
      if (!linea.trim()) continue;
      const c = linea.split("|");
      const estado = NUMERICO_A_CURP[(c[7] || "").padStart(2, "0")];
      if (!estado || !c[0] || !c[1]) continue;
      filas.push([c[0].padStart(5, "0"), c[1], c[2] || null, c[3] || null, estado]);
    }
    console.log(`${filas.length} asentamientos leídos. Cargando…`);

    await conn.query("TRUNCATE TABLE cat_codigo_postal");
    for (let i = 0; i < filas.length; i += 2000) {
      await conn.query(
        "INSERT INTO cat_codigo_postal (cp, colonia, tipo_asenta, municipio, estado_cve) VALUES ?",
        [filas.slice(i, i + 2000)]
      );
    }
    console.log(`cat_codigo_postal cargada con ${filas.length} filas`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
