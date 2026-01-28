// Simple in-memory cache to reduce Firebase reads
const cache = new Map();
const TTL_MS = 60 * 1000; // 1 minute TTL

export function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return hit.data;
  }
  cache.delete(key);
  return null;
}

export function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function clearCache(pattern) {
  if (pattern) {
    // Clear specific pattern
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all
    cache.clear();
  }
}
