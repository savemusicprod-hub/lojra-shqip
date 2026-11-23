// Macht die Web-App nach dem ersten Besuch offline spielbar.
// scripts/deploy_web.ps1 setzt die Version ein. Dadurch erkennt der Browser jedes Update.
const VERSION = 'c5f18ee800687fd2';
const CACHE = 'lojra-shqip-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch('precache.json', { cache: 'no-store' });
      const manifest = await response.json();
      const cache = await caches.open(CACHE);
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
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('lojra-shqip-') && n !== CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// Die Seite meldet, welche Grafik-Engine dieser Browser wirklich geladen hat.
// So landet auf dem Handy nur diese eine Variante im Offline-Speicher.
self.addEventListener('message', (event) => {
  const urls = event.data?.cacheEngine;
  if (!Array.isArray(urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
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
