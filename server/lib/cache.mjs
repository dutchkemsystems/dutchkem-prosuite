// Simple in-memory cache for holiday discounts and other ephemeral data.
// Replace with Redis in production: import { createClient } from 'redis';

const store = new Map();
const TTL = 60 * 60 * 1000; // 1 hour default

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttl = TTL) {
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

export function cacheDelete(key) {
  store.delete(key);
}

export function cacheClear() {
  store.clear();
}
