export async function getPopulation(alpha3: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${alpha3}/indicator/SP.POP.TOTL?format=json&per_page=1&mrv=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const value = data?.[1]?.[0]?.value;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}
