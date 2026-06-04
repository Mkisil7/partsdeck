// PartsDeck service worker — offline viewing of cached read requests.
// Bump CACHE on any change here so old caches are purged on activate.
const CACHE = "partsdeck-v3";
const PRECACHE = ["/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  );
  // Take over as soon as installed so new deploys apply on next load.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Allow the page to tell a waiting worker to activate immediately.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth or mutation API traffic.
  if (url.pathname.startsWith("/api/")) {
    // Allow read APIs (GET /api/jobs*) to be cached network-first.
    if (url.pathname.startsWith("/api/jobs")) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  // Navigations (HTML): always go to network so a new deploy shows up
  // immediately; only fall back to cache when truly offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, { cacheOnSuccess: false }));
    return;
  }

  // Static assets (hashed JS/CSS, images): network-first, cache as backup.
  event.respondWith(networkFirst(request));
});

async function networkFirst(request, { cacheOnSuccess = true } = {}) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (cacheOnSuccess && response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
