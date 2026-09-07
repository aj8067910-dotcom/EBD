/* Service worker for "Add to Home Screen" and a light offline shell.
 *
 * IMPORTANT: only same-origin STATIC assets are cached. API and WebSocket
 * traffic — including the backend running on another origin — always goes to
 * the network, so dynamic data (lessons, daily readings, etc.) is never served
 * stale from the cache. Caching API GETs here previously froze lists at their
 * first (often empty) response even though writes had persisted. */
const CACHE = 'koinonia-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only ever touch same-origin requests. The API/WebSocket live on another
  // origin (or under /api and /socket.io when same-origin behind a proxy) and
  // must always hit the network so fresh data is never masked by the cache.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  // Network-first for navigations (fall back to the cached shell when offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || fetch(request))),
    );
    return;
  }

  // Cache-first ONLY for same-origin static assets: the hashed files under
  // /assets and the app-shell files. Everything else goes to the network.
  const isStatic = url.pathname.startsWith('/assets/') || APP_SHELL.includes(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((resp) => {
          const copy = resp.clone();
          if (resp.ok) caches.open(CACHE).then((c) => c.put(request, copy));
          return resp;
        }),
    ),
  );
});
