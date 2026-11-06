const CACHE_PREFIX = 'thailand-slow-travel-';
const CACHE = `${CACHE_PREFIX}v21`;
const ASSETS = ["./", "./index.html", "./styles.css?v=98", "./data.js?v=98", "./app.js?v=98", "./manifest.webmanifest", "./photo-credits.html", "./assets/photos/cover.jpg", "./assets/photos/summary.jpg", "./assets/photos/day-1-tiffany.jpg", "./assets/photos/day-2-elephants.jpg", "./assets/photos/day-3.jpg", "./assets/photos/day-4.jpg", "./assets/photos/day-5.jpg", "./assets/photos/day-6.jpg", "./assets/photos/transport-pattaya.jpg", "./assets/photos/transport-bangkok.jpg", "./assets/photos/budget.jpg", "./assets/photos/reminders.jpg", "./assets/photos/checks.jpg", "./assets/photos/emergency.jpg"];
self.addEventListener('install', (event) => event.waitUntil(
  caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (event.request.destination === 'image' && cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const page = await cache.match('./index.html');
        if (page) return page;
      }
      return Response.error();
    }
  })());
});
