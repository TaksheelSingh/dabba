const CACHE_NAME = 'dabba-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first strategy to guarantee fresh updates
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
