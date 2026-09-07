/* Basic service worker for "Add to Home Screen" and light offline shell. */
// Bumped to v2: previous versions incorrectly cache-first'd API GETs; the new
// version only caches static assets and the activate handler purges v1.
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

// Same-origin static asset paths that are safe to cache-first. Everything else
// — the whole REST API (any origin), socket.io, dynamic data — is left to the
// network so freshly created/updated data is never served stale from cache.
function isCacheableAsset(request) {
  if (request.method !== 'GET') return false;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  // Only ever cache assets served from the frontend's own origin.
  if (url.origin !== self.location.origin) return false;
  if (APP_SHELL.includes(url.pathname)) return true;
  // Hashed build assets and static files (never API JSON).
  return /\.(js|css|woff2?|ttf|png|jpe?g|svg|gif|webp|ico|webmanifest)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Network-first for navigations (fall back to cached shell offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || fetch(request))),
    );
    return;
  }

  // Never intercept anything that isn't a same-origin static asset — API and
  // socket traffic must always hit the network.
  if (!isCacheableAsset(request)) return;

  // Cache-first for static assets.
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
