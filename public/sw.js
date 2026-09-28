// Meanwhile service worker: offline for pages already viewed.
//
// A static export means there's no server-side list of every route to
// precache (and the culture data set keeps growing) - so instead of
// precaching, this caches each page/asset the first time it's fetched
// ("cache as you visit"), then serves that cache entry when the network
// is unavailable. Bump CACHE_NAME when this strategy changes so old
// runtime caches get cleared on the next activate.
const CACHE_NAME = "meanwhile-runtime-v2";

// A static export serves the same file whatever the query string (?year= is
// read client-side, ?_rsc= only busts HTTP caches), so entries are keyed by
// path: one entry per page, found again under any query.
function cacheKey(request) {
  const url = new URL(request.url);
  return url.origin + url.pathname;
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

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(key, copy));
        }
        return response;
      })
      .catch(() => caches.match(key).then((cached) => cached ?? Response.error())),
  );
});
