// Increment this version for every published release.
const CACHE_NAME = 'big-orange-chord-beta2-20261008';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest'];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('big-orange-chord-') && key !== CACHE_NAME).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            // Fresh content online; cached content offline. No stale HTML forever.
            const response = await fetch(request);
            if (response.ok) await cache.put(request, response.clone());
            return response;
        } catch {
            return (await cache.match(request)) || (request.mode === 'navigate' ? await cache.match('./index.html') : Response.error());
        }
    })());
});
