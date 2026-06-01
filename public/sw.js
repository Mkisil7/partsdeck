// PartsDeck service worker — offline viewing of cached read requests.
const CACHE = "partsdeck-v1";
const PRECACHE = ["/dashboard", "/inventory", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
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

  // Pages + static assets: network-first, fall back to cache when offline.
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort: cached dashboard shell for navigations.
    if (request.mode === "navigate") {
      const shell = await cache.match("/dashboard");
      if (shell) return shell;
    }
    throw err;
  }
}
