// geocodificar_municipios_mexico.cjs
// Geocodifica (una sola vez) los municipios/delegaciones de México que
// realmente tienen pacientes registrados en RENACED, usando Nominatim
// (OpenStreetMap). Guarda lat/lng en cat_municipio.
// Ejecutar desde backend/: node geocodificar_municipios_mexico.cjs

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const NOMBRES_ESTADO = {
  AS: "Aguascalientes", BC: "Baja California", BS: "Baja California Sur",
  CC: "Campeche", CL: "Coahuila", CM: "Colima", CS: "Chiapas", CH: "Chihuahua",
  DF: "Ciudad de México", DG: "Durango", GT: "Guanajuato", GR: "Guerrero",
  HG: "Hidalgo", JC: "Jalisco", MC: "México", MN: "Michoacán", MS: "Morelos",
  NT: "Nayarit", NL: "Nuevo León", OC: "Oaxaca", PL: "Puebla", QT: "Querétaro",
  QR: "Quintana Roo", SP: "San Luis Potosí", SL: "Sinaloa", SR: "Sonora",
  TC: "Tabasco", TS: "Tamaulipas", TL: "Tlaxcala", VZ: "Veracruz",
  YN: "Yucatán", ZS: "Zacatecas",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocodificar(nombreMunicipio, nombreEstado) {
  const query = [nombreMunicipio, nombreEstado, "México"].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q: query, format: "json", limit: "1" }).toString();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "RenacedMexico/1.0 (registro-diabetes-tipo1)" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function migrar() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.RENACED_MX_DB_NAME || "renaced_mexico",
    connectTimeout: 60000,
  });

  const [combos] = await conn.query(`
    SELECT DISTINCT p.estado_residencia AS estado, p.municipio_residencia AS municipio,
           m.nombre AS municipio_nombre
    FROM paciente p
    LEFT JOIN cat_municipio m ON m.estado_cve = p.estado_residencia AND m.clave = p.municipio_residencia
    WHERE p.estado_residencia IS NOT NULL AND p.estado_residencia <> ''
      AND p.municipio_residencia IS NOT NULL AND p.municipio_residencia <> ''
  `);

  console.log(`📍 ${combos.length} combinaciones estado+municipio a geocodificar…\n`);

  let ok = 0, sinNombre = 0, sinResultado = 0, yaCache = 0;

  for (const c of combos) {
    if (!c.municipio_nombre) { sinNombre++; continue; }

    const [[existente]] = await conn.query(
      "SELECT lat, lng FROM cat_municipio WHERE estado_cve = ? AND clave = ?",
      [c.estado, c.municipio]
    );
    if (existente?.lat != null) { yaCache++; continue; }

    const nombreEstado = NOMBRES_ESTADO[c.estado] || c.estado;
    const geo = await geocodificar(c.municipio_nombre, nombreEstado);
    if (!geo) {
      console.log(`   ❌ Sin resultado: ${c.municipio_nombre}, ${nombreEstado}`);
      sinResultado++;
    } else {
      await conn.query(
        "UPDATE cat_municipio SET lat = ?, lng = ?, geocodificado_en = NOW() WHERE estado_cve = ? AND clave = ?",
        [geo.lat, geo.lng, c.estado, c.municipio]
      );
      ok++;
      console.log(`   ✅ ${c.municipio_nombre}, ${nombreEstado} → ${geo.lat}, ${geo.lng}`);
    }
    await sleep(1100); // respeta 1 req/s de Nominatim
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ Geocodificados: ${ok}  |  Ya en caché: ${yaCache}  |  Sin nombre: ${sinNombre}  |  Sin resultado: ${sinResultado}`);
  console.log(`════════════════════════════════════════`);

  await conn.end();
}

migrar().catch((e) => {
  console.error("❌ Error fatal:", e.message);
  process.exit(1);
});
