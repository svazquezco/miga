const CACHE = 'miga-shell-v2';
const BUILD_ASSETS = [];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          ...BUILD_ASSETS,
          './',
          './index.html',
          './icon.svg',
          './manifest.webmanifest',
          './icon-192.png',
          './icon-512.png',
          './icon-180.png',
        ]),
      ),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('miga-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put('./index.html', clone)));
          }
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, clone)));
          }
          return response;
        }),
    ),
  );
});
