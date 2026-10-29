import { createHash } from "crypto";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// A simple in-memory, per-process cache for deterministic-ish AI results (summary,
// explain) so repeatedly clicking the same action on the same note doesn't re-spend
// tokens. Personal single-instance app - no need for Redis. Entries expire on their own;
// a light sweep on writes keeps the map from growing unbounded over a long uptime.
const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES_BEFORE_SWEEP = 500;

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  if (cache.size >= MAX_ENTRIES_BEFORE_SWEEP) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function hashText(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

export function buildCacheKey(parts: (string | number | boolean)[]): string {
  return parts.join("::");
}

export const ONE_HOUR_MS = 60 * 60 * 1000;
