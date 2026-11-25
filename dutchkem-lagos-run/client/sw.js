/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Dutchkem Ventures Presents: Lagos Run — Hustle Empire
 * Service worker: pre-cache the shell, keep the API honest, survive offline.
 * build.js rewrites the CACHE_VERSION line below on every production build.
 */

const CACHE_VERSION = '1.0.0-dev';
const PREFIX = 'dutchkem-lagosrun-';
const CACHE_NAME = PREFIX + CACHE_VERSION;
const RUNTIME_CACHE = 'dutchkem-runtime-v1';
const API_CACHE = 'dutchkem-api-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/config.js',
  '/game.js',
  '/manifest.json',
  '/privacy.html',
  '/terms.html',
  '/consent.html',
  '/robots.txt',
  '/sitemap.xml',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

const API_TIMEOUT_MS = 5000;

/* ───────── strategies ───────── */

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // API calls that never reached the network get an explicit, cache-proof answer.
    if (new URL(request.url).pathname.startsWith('/api/') || new URL(request.url).pathname === '/health') {
      return new Response(
        JSON.stringify({
          ok: false,
          offline: true,
          error: 'offline',
          message: 'No connection. Your action will sync when you are back online.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

/* ───────── lifecycle ───────── */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS).catch((error) => {
        // A single missing asset must not block activation of the whole shell.
        console.warn('[SW] Pre-cache partially failed:', error);
      });
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();

      const clientList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientList) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Backend calls: network first, then cache, then an explicit offline answer.
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
    event.respondWith(networkFirst(request, API_CACHE, API_TIMEOUT_MS));
    return;
  }

  // Cross-origin (fonts, CDNs): serve from cache instantly, refresh in the background.
  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Same-origin shell: cache first, with the app shell fallback for navigations.
  event.respondWith(
    cacheFirst(request).catch(async () => {
      if (request.mode === 'navigate') {
        const shell = await caches.match('/index.html');
        if (shell) return shell;
      }
      return new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
