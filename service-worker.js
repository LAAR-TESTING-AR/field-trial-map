const CACHE_NAME = "field-trial-map-v20";
const BASE_PATH = "/field-trial-map/";

const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}viewer.html`,
  `${BASE_PATH}offline.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}manifest-viewer.webmanifest`,
  `${BASE_PATH}manifest-selector.js`,

  `${BASE_PATH}style.css`,
  `${BASE_PATH}summary-toolbar.css`,
  `${BASE_PATH}foto-access-addon.css`,
  `${BASE_PATH}popup-mobile-addon.css`,
  `${BASE_PATH}drop-trial-addon.css`,
  `${BASE_PATH}filtros-dependientes-v3.css`,
  `${BASE_PATH}field-photo-capture.css`,
  `${BASE_PATH}field-photo-history.css`,
  `${BASE_PATH}field-coordinate-capture.css`,
  `${BASE_PATH}field-coordinate-pending.css`,
  `${BASE_PATH}field-coordinate-sync-ui.css`,
  `${BASE_PATH}pwa-ui.css`,
  

  `${BASE_PATH}app-mode.js`,
  `${BASE_PATH}app-viewer-controls.js`,
  `${BASE_PATH}header-app.css`,
  `${BASE_PATH}app.js`,
  `${BASE_PATH}drop-trial-addon.js`,
  `${BASE_PATH}summary-toolbar.js`,
  `${BASE_PATH}foto-access-addon.js`,
  `${BASE_PATH}popup-mobile-addon.js`,
  `${BASE_PATH}filtros-dependientes-v3.js`,

  `${BASE_PATH}field-photo-capture.js`,
  `${BASE_PATH}field-photo-popup-integration.js`,
  `${BASE_PATH}field-photo-sync.js`,
  `${BASE_PATH}field-photo-pending.js`,
  `${BASE_PATH}field-photo-sync-ui.js`,
  `${BASE_PATH}field-photo-history.js`,
  `${BASE_PATH}field-photo-history-ui.js`,
  `${BASE_PATH}field-photo-history-viewer.js`,
  `${BASE_PATH}field-photo-timeline-icons.js`,

  `${BASE_PATH}field-coordinate-storage.js`,
  `${BASE_PATH}field-coordinate-capture.js`,
  `${BASE_PATH}field-coordinate-popup-integration.js`,
  `${BASE_PATH}field-coordinate-pending.js`,
  `${BASE_PATH}field-coordinate-sync.js`,
  `${BASE_PATH}field-coordinate-sync-ui.js`,

  `${BASE_PATH}pwa-ui.js`,

  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}apple-touch-icon.png`
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  /* Navegacion: red primero y cache como respaldo offline. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar la pagina principal");
          }

          const copia = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(`${BASE_PATH}index.html`, copia);
            })
          );

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(`${BASE_PATH}index.html`)
          ) || (
            await caches.match(`${BASE_PATH}offline.html`)
          );
        })
    );

    return;
  }

  /* Sitios.csv: red primero y clave fija sin parametros. */
  if (url.pathname.endsWith("/Sitios.csv")) {
    const claveSitios = `${BASE_PATH}Sitios.csv`;

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar Sitios.csv");
          }

          const copia = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(claveSitios, copia);
            })
          );

          return response;
        })
        .catch(() => caches.match(claveSitios))
    );

    return;
  }

  /* AccessPhotos.csv: red primero y clave fija sin parametros. */
  if (url.pathname.endsWith("/AccessPhotos.csv")) {
    const claveFotos = `${BASE_PATH}AccessPhotos.csv`;

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar AccessPhotos.csv");
          }

          const copia = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(claveFotos, copia);
            })
          );

          return response;
        })
        .catch(() => caches.match(claveFotos))
    );

    return;
  }

  /* JavaScript y CSS locales: red primero para recibir cambios nuevos. */
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith(".js") || url.pathname.endsWith(".css"))
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible actualizar el recurso");
          }

          const copia = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(url.pathname, copia);
            })
          );

          return response;
        })
        .catch(() => {
          return caches.match(url.pathname, {
            ignoreSearch: true
          });
        })
    );

    return;
  }

  /* Fotografias publicas: red primero y cache como respaldo. */
  if (
    url.pathname.includes("/images/access/") ||
    url.pathname.includes("/images/trial/")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (!response || !response.ok) {
            throw new Error("No fue posible descargar la fotografia");
          }

          const copia = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(request, copia);
            })
          );

          return response;
        })
        .catch(() => {
          return caches.match(request, {
            ignoreSearch: true
          });
        })
    );

    return;
  }

  /* Iconos y otros recursos: cache primero y red como alternativa. */
  event.respondWith(
    caches
      .match(request, {
        ignoreSearch: true
      })
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(response => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }

          const copia = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(request, copia);
            })
          );

          return response;
        });
      })
  );
});
