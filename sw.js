// Macht die Web-App nach dem ersten Besuch offline spielbar.
// precache.json wird von scripts/deploy_web.ps1 erzeugt.
const PREFIX = 'lojra-shqip-';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch('precache.json', { cache: 'no-store' });
      const manifest = await response.json();
      const cache = await caches.open(PREFIX + manifest.version);
      await cache.addAll(
        manifest.files.map((file) => new Request(file, { cache: 'no-store' })),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch('precache.json', { cache: 'no-store' });
      const { version } = await response.json();
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith(PREFIX) && n !== PREFIX + version)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })().catch(() => self.clients.claim()),
  );
});

// Die Seite meldet, welche Grafik-Engine dieser Browser wirklich geladen hat.
// So landet auf dem Handy nur diese eine Variante im Offline-Speicher.
self.addEventListener('message', (event) => {
  const urls = event.data?.cacheEngine;
  if (!Array.isArray(urls)) return;
  event.waitUntil(
    (async () => {
      const response = await fetch('precache.json', { cache: 'no-store' });
      const { version } = await response.json();
      const cache = await caches.open(PREFIX + version);
      const scope = new URL(self.registration.scope);
      const allowed = urls.filter((u) => {
        const url = new URL(u);
        return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
      });
      await cache.addAll(allowed);
    })().catch(() => {}),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Seiten zuerst aus dem Netz, damit Updates sofort ankommen.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const hit = await caches.match('index.html', { ignoreSearch: true });
        return hit || Response.error();
      }),
    );
    return;
  }
  event.respondWith(
    caches
      .match(request, { ignoreSearch: true })
      .then((hit) => hit || fetch(request)),
  );
});
