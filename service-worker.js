const CACHE_NAME = "field-trial-map-v2";

const BASE_PATH = "/field-trial-map/";

const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}style.css`,
  `${BASE_PATH}app.js`,
  `${BASE_PATH}foto-access-addon.css`,
  `${BASE_PATH}foto-access-addon.js`,
  `${BASE_PATH}popup-mobile-addon.css`,
  `${BASE_PATH}popup-mobile-addon.js`,
  `${BASE_PATH}filtros-dependientes-v2.js`,
  `${BASE_PATH}pwa-ui.css`,
  `${BASE_PATH}pwa-ui.js`,
  `${BASE_PATH}header-app.css`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}offline.html`,
  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}apple-touch-icon.png`
];

/*
  Instalar la nueva versión del Service Worker
  y guardar los recursos principales.
*/
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

/*
  Eliminar automáticamente las versiones anteriores
  del caché.
*/
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

/*
  Controlar las solicitudes de la aplicación.
*/
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  /*
    Para index.html y navegación:
    primero buscar la versión más reciente en la red.
  */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copia = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(`${BASE_PATH}index.html`, copia);
          });

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

  /*
    Para Sitios.csv y AccessPhotos.csv:
    primero red para obtener la información actualizada.
    Si no hay conexión, usar la última versión guardada.
  */
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

  /*
    Para imágenes públicas de los accesos:
    red primero y caché como respaldo.
  */
  if (url.pathname.includes("/images/access/")) {
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

  /*
    Para CSS, JavaScript, íconos y demás recursos:
    usar caché primero y descargar si todavía no existe.
  */
  event.respondWith(
    caches.match(request).then(cachedResponse => {
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
