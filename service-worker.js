const CACHE_NAME = "field-trial-map-v5";
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

  `${BASE_PATH}filtros-dependientes-v3.js`,
  `${BASE_PATH}filtros-dependientes-v3.css`,

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
  Instalación del Service Worker.
  Guarda los recursos principales de la aplicación.
*/
self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );

  /*
    Activa inmediatamente esta nueva versión,
    sin esperar a que se cierren todas las pestañas.
  */
  self.skipWaiting();
});

/*
  Activación de la nueva versión.
  Elimina automáticamente los cachés anteriores.
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

  /*
    Permite que el nuevo Service Worker controle
    inmediatamente las páginas abiertas.
  */
  self.clients.claim();
});

/*
  Control de solicitudes de la aplicación.
*/
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  /*
    El Service Worker solo procesa solicitudes GET.
  */
  if (request.method !== "GET") {
    return;
  }

  /*
    NAVEGACIÓN E INDEX.HTML

    Primero intenta obtener la versión más reciente desde GitHub.
    Si no hay conexión, utiliza la última versión almacenada.
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
          const paginaGuardada = await caches.match(
            `${BASE_PATH}index.html`
          );

          if (paginaGuardada) {
            return paginaGuardada;
          }

          return caches.match(`${BASE_PATH}offline.html`);
        })
    );

    return;
  }

  /*
    ARCHIVOS CSV

    Siempre intenta descargar los datos más recientes.
    Si no hay conexión, utiliza la última versión disponible.
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
    FOTOGRAFÍAS DE LOS ACCESOS

    Primero intenta obtener la imagen desde GitHub Pages.
    Si no hay conexión, busca una copia previamente almacenada.
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
    RECURSOS LOCALES DE LA APLICACIÓN

    Para CSS, JavaScript, íconos y otros recursos:
    utiliza primero el caché y descarga el archivo
    cuando todavía no existe localmente.
  */
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(response => {
        /*
          No se almacenan respuestas inválidas,
          errores o recursos externos opacos.
        */
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
