const CACHE_NAME = "field-trial-map-v1";

const APP_SHELL = [
  "/field-trial-map/",
  "/field-trial-map/index.html",
  "/field-trial-map/style.css",
  "/field-trial-map/app.js",
  "/field-trial-map/foto-access-addon.css",
  "/field-trial-map/foto-access-addon.js",
  "/field-trial-map/popup-mobile-addon.css",
  "/field-trial-map/popup-mobile-addon.js",
  "/field-trial-map/filtros-dependientes-v2.js",
  "/field-trial-map/manifest.webmanifest",
  "/field-trial-map/offline.html",
  "/field-trial-map/icons/icon-192.png",
  "/field-trial-map/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (
    url.pathname.endsWith("/Sitios.csv") ||
    url.pathname.endsWith("/AccessPhotos.csv")
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copia);
          });

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }

          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copia);
          });

          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match("/field-trial-map/offline.html");
          }

          return Response.error();
        });
    })
  );
});
