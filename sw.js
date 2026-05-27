var CACHE = 'taskboard-v3';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var network = fetch(e.request).then(function(res) {
          cache.put(e.request, res.clone());
          return res;
        }).catch(function() { return cached; });
        return cached || network;
      });
    })
  );
});
