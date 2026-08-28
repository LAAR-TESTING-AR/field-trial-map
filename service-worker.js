const CACHE_NAME = "field-trial-map-v11";
const BASE_PATH = "/field-trial-map/";

const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}offline.html`,
  `${BASE_PATH}manifest.webmanifest`,

  `${BASE_PATH}style.css`,
  `${BASE_PATH}foto-access-addon.css`,
  `${BASE_PATH}popup-mobile-addon.css`,
  `${BASE_PATH}drop-trial-addon.css`,
  `${BASE_PATH}filtros-dependientes-v3.css`,
  `${BASE_PATH}field-photo-capture.css`,
  `${BASE_PATH}field-photo-history.css`,
  `${BASE_PATH}pwa-ui.css`,
  `${BASE_PATH}header-app.css`,

  `${BASE_PATH}app.js`,
  `${BASE_PATH}drop-trial-addon.js`,
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

  /*
    Navegacion:
    primero red; si no hay conexion, usar index.html u offline.html.
  */
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

  /*
    Sitios.csv:
    siempre intentar descargar la version mas reciente.
    La copia se guarda con una clave fija, sin parametros ?v=...
  */
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

  /*
    AccessPhotos.csv:
    siempre intentar descargar la version mas reciente.
    La copia se guarda con una clave fija, sin parametros ?v=...
  */
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

  /*
    JavaScript y CSS propios de la aplicacion:
    red primero para recibir cambios nuevos sin Ctrl + Shift + R.
    Si no hay conexion, usar la ultima copia guardada.
  */
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
          const claveSinVersion = url.pathname;

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.put(claveSinVersion, copia);
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

  /*
    Fotografias publicas:
    red primero y cache como respaldo offline.
  */
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

  /*
    Recursos externos, iconos y otros archivos:
    usar cache primero y recurrir a la red si no estan guardados.
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
