// Simple in-memory cache for external API calls (exchange rate, population)
// keyed by an arbitrary string. Lives for the page's lifetime - re-selecting
// the same country within a session reuses the cached value instead of
// hitting the API again. A full page reload clears it, which is fine since
// these values don't need to persist across visits.
const cache = new Map<string, { value: unknown; expires: number }>();

export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.value as T;
  }
  const value = await fetcher();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
