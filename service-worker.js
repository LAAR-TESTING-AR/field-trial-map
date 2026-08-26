const CACHE_NAME = "field-trial-map-v6";
const BASE_PATH = "/field-trial-map/";

const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}style.css`,
  `${BASE_PATH}app.js`,

  `${BASE_PATH}drop-trial-addon.css`,
  `${BASE_PATH}drop-trial-addon.js`,

  `${BASE_PATH}foto-access-addon.css`,
  `${BASE_PATH}foto-access-addon.js`,

  `${BASE_PATH}popup-mobile-addon.css`,
  `${BASE_PATH}popup-mobile-addon.js`,

  `${BASE_PATH}filtros-dependientes-v3.css`,
  `${BASE_PATH}filtros-dependientes-v3.js`,

  `${BASE_PATH}field-photo-capture.css`,
  `${BASE_PATH}field-photo-capture.js`,

  `${BASE_PATH}pwa-ui.css`,
  `${BASE_PATH}pwa-ui.js`,
  `${BASE_PATH}header-app.css`,

  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}offline.html`,

  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}apple-touch-icon.png`
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  /*
    Navegación:
    primero red; si no hay conexión, usar index.html guardado.
  */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(
              `${BASE_PATH}index.html`,
              copia
            );
          });

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(
              `${BASE_PATH}index.html`
            )
          ) || (
            await caches.match(
              `${BASE_PATH}offline.html`
            )
          );
        })
    );

    return;
  }

  /*
    Sitios.csv:
    se guarda siempre con una clave fija,
    ignorando el parámetro ?v=...
  */
  if (url.pathname.endsWith("/Sitios.csv")) {
    const claveSitios =
      `${BASE_PATH}Sitios.csv`;

    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || !response.ok) {
            throw new Error(
              "No fue posible actualizar Sitios.csv"
            );
          }

          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(claveSitios, copia);
          });

          return response;
        })
        .catch(() => {
          return caches.match(claveSitios);
        })
    );

    return;
  }

  /*
    AccessPhotos.csv:
    misma estrategia con una clave fija.
  */
  if (
    url.pathname.endsWith(
      "/AccessPhotos.csv"
    )
  ) {
    const claveFotos =
      `${BASE_PATH}AccessPhotos.csv`;

    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || !response.ok) {
            throw new Error(
              "No fue posible actualizar AccessPhotos.csv"
            );
          }

          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(claveFotos, copia);
          });

          return response;
        })
        .catch(() => {
          return caches.match(claveFotos);
        })
    );

    return;
  }

  /*
    Fotografías públicas:
    red primero y caché como respaldo.
  */
  if (
    url.pathname.includes(
      "/images/access/"
    ) ||
    url.pathname.includes(
      "/images/trial/"
    )
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || !response.ok) {
            throw new Error(
              "No fue posible descargar la fotografía"
            );
          }

          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copia);
          });

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

  /*
    JavaScript, CSS, íconos y otros recursos:
    ignorar parámetros como ?v=10 al buscar en caché.
  */
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

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copia);
          });

          return response;
        });
      })
  );
});
