const CACHE_NAME = "field-trial-map-v4";
const BASE_PATH = "/field-trial-map/";
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`, `${BASE_PATH}style.css`, `${BASE_PATH}app.js`,
  `${BASE_PATH}drop-trial-addon.css`, `${BASE_PATH}drop-trial-addon.js`,
  `${BASE_PATH}foto-access-addon.css`, `${BASE_PATH}foto-access-addon.js`,
  `${BASE_PATH}popup-mobile-addon.css`, `${BASE_PATH}popup-mobile-addon.js`,
  `${BASE_PATH}filtros-dependientes-v2.js`, `${BASE_PATH}pwa-ui.css`,
  `${BASE_PATH}pwa-ui.js`, `${BASE_PATH}header-app.css`,
  `${BASE_PATH}manifest.webmanifest`, `${BASE_PATH}offline.html`,
  `${BASE_PATH}icon-192.png`, `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}apple-touch-icon.png`
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
  )));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(`${BASE_PATH}index.html`, copy));
      return response;
    }).catch(async () => (await caches.match(`${BASE_PATH}index.html`)) || (await caches.match(`${BASE_PATH}offline.html`))));
    return;
  }
  if (url.pathname.endsWith("/Sitios.csv") || url.pathname.endsWith("/AccessPhotos.csv") || url.pathname.includes("/images/access/")) {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (!response || response.status !== 200 || response.type === "opaque") return response;
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    return response;
  })));
});
