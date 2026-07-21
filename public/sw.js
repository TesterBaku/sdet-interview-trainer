// Bump this string on each deploy to invalidate stale caches
const CACHE_NAME = "sdet-trainer-v2";

// App shell routes to pre-cache on install
const PRECACHE_URLS = ["/", "/topics", "/coding-gym", "/progress", "/practice", "/commute"];

self.addEventListener("install", (event) => {
  // addAll is all-or-nothing; cache each URL individually so a single
  // failure doesn't abort the entire install
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from this origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Cache-first for immutable hashed assets (JS, CSS, fonts)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
            return response;
          })
      )
    );
    return;
  }

  // Network-first with cache fallback for everything else (pages, icons, manifest)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
