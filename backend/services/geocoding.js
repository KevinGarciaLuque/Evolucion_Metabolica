/**
 * Geocodifica una dirección hondureña usando Nominatim (OpenStreetMap).
 * Devuelve { lat, lng } o null si no encuentra resultado.
 * Respeta el límite de 1 req/s de Nominatim.
 */
export async function geocodificar(municipio, departamento) {
  const query = [municipio, departamento, "Honduras"]
    .filter(Boolean)
    .join(", ");

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q: query, format: "json", limit: "1" }).toString();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EvolucionMetabolica/1.0 (medical-app)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
