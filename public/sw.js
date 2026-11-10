// Service worker mínimo: news.json sempre da rede (com fallback ao cache); resto cache-first.
const CACHE = 'noticias-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const isData = request.url.includes('news.json');
  e.respondWith(
    (isData
      ? fetch(request).catch(() => caches.match(request))
      : caches.match(request).then((hit) => hit || fetch(request))
    ).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })
  );
});
