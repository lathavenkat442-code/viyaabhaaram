
const CACHE_NAME = 'viyabaari-v8-stable';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

const OPTIONAL_ASSETS = [
  'https://cdn-icons-png.flaticon.com/512/3045/3045388.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Mukta+Malar:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - Cache core assets strictly, optional assets loosely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Critical: These MUST succeed for SW to install
        return cache.addAll(CORE_ASSETS)
          .then(() => {
             const optionalCaching = OPTIONAL_ASSETS.map(url => {
                return fetch(url).then(res => {
                    if(res.ok) cache.put(url, res);
                }).catch(err => console.log('Optional asset cache failed:', url));
             });
             return Promise.all(optionalCaching);
          });
      })
  );
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, then Cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html').then(response => {
              return response || caches.match('./');
          });
        }
      });
    })
  );
});
