// Who Was When service worker: offline for pages already viewed.
//
// Every page is prerendered but there's no list of every route to
// precache (and the culture data set keeps growing) - so instead of
// precaching, this caches each page/asset the first time it's fetched
// ("cache as you visit"), then serves that cache entry when the network
// is unavailable or too slow. Bump CACHE_NAME when this strategy changes so old
// runtime caches get cleared on the next activate.
const CACHE_NAME = "meanwhile-runtime-v3";
const NETWORK_TIMEOUT_MS = 3000;

// Prerendered pages serve the same HTML whatever the query string (?year= is
// read client-side), so a page is keyed by path and found again under any
// query. Router payloads (RSC header) come from the same path, and keying them
// by path would overwrite the HTML; their ?_rsc= is a hash of the headers they
// vary on, so the full URL keys each one correctly.
function cacheKey(request) {
  const url = new URL(request.url);
  return request.headers.get("RSC") === "1" ? url.href : url.origin + url.pathname;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only same-origin GETs: never cache POSTs, and never reach into a
  // cross-origin request (this app has none, but be explicit).
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const key = cacheKey(request);

  const network = fetch(request);
  // Clone before the page can start reading the body; waitUntil keeps the
  // worker alive until the copy is written.
  event.waitUntil(
    network
      .then((response) => {
        if (!response.ok) return;
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(key, copy));
      })
      .catch(() => {}),
  );
  event.respondWith(networkFirst(network, key));
});

/**
 * The network's answer, unless it fails, or takes longer than
 * NETWORK_TIMEOUT_MS while a cached copy exists (weak signal can hang for
 * much longer than an outright failure). With nothing cached, keep waiting.
 */
function networkFirst(network, key) {
  const networkOrCache = network.catch(() => caches.match(key).then((cached) => cached ?? Response.error()));
  const cacheAfterTimeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS))
    .then(() => caches.match(key))
    .then((cached) => cached ?? networkOrCache);
  return Promise.race([networkOrCache, cacheAfterTimeout]);
}
