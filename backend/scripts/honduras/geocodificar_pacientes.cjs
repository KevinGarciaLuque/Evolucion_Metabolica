/**
 * Geocodifica todos los pacientes existentes sin lat/lng usando Nominatim.
 * Ejecutar UNA sola vez:
 *   node geocodificar_pacientes.cjs                          <- local
 *   node geocodificar_pacientes.cjs "mysql://...railway..."  <- producción
 *
 * Respeta el límite de Nominatim: 1 solicitud/segundo.
 */
const mysql  = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

async function geocodificar(municipio, departamento) {
  const query = [municipio, departamento, "Honduras"].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q: query, format: "json", limit: "1" }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EvolucionMetabolica/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  } catch {
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const url = process.argv[2];
  const conn = url
    ? await mysql.createConnection(url)
    : await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

  const [pacientes] = await conn.query(
    "SELECT id, nombre, municipio, departamento FROM pacientes WHERE estado = 1 AND (latitud IS NULL OR longitud IS NULL)"
  );

  console.log(`📍 Geocodificando ${pacientes.length} pacientes...`);

  let ok = 0, fail = 0;
  for (const p of pacientes) {
    const coords = await geocodificar(p.municipio, p.departamento);
    if (coords) {
      await conn.query("UPDATE pacientes SET latitud=?, longitud=? WHERE id=?",
        [coords.lat, coords.lng, p.id]);
      console.log(`  ✅ ${p.nombre} → ${coords.lat}, ${coords.lng}`);
      ok++;
    } else {
      console.log(`  ⚠️  ${p.nombre} (${p.municipio}, ${p.departamento}) — sin resultado`);
      fail++;
    }
    await sleep(1100); // respetar límite Nominatim: 1 req/s
  }

  console.log(`\n✅ Geocodificados: ${ok} | ⚠️  Sin resultado: ${fail}`);
  await conn.end();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
