import { getDb, CACHE_STORE } from './storage';

// Cache key includes `params` (not just the URL) so two GETs to the same
// path with different query params (e.g. platform requests filtered by
// status) don't clobber each other's cached "last known good" response.
export function cacheKeyFor(method: string, url: string, params?: unknown): string {
  const suffix = params ? `?${JSON.stringify(params)}` : '';
  return `${method.toLowerCase()}:${url}${suffix}`;
}

export async function getCachedResponse(key: string): Promise<unknown> {
  const db = await getDb();
  if (!db) return undefined;
  return db.get(CACHE_STORE, key);
}

export async function setCachedResponse(key: string, data: unknown): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put(CACHE_STORE, data, key);
}
