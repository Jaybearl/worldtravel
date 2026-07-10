export async function geocodeCity(
  city: string,
  countryNameEn: string
): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(`${city}, ${countryNameEn}`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}
