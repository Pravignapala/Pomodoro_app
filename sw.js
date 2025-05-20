const CACHE_NAME = 'pomodoro-app-v1';
const urlsToCache = [
  '/Pomodoro_app/',
  '/Pomodoro_app/index.html',
  '/Pomodoro_app/manifest.json',
  '/Pomodoro_app/sounds/bell.mp3',
  '/Pomodoro_app/sounds/chime.mp3',
  '/Pomodoro_app/icons/icon-72x72.png',
  '/Pomodoro_app/icons/icon-96x96.png',
  '/Pomodoro_app/icons/icon-128x128.png',
  '/Pomodoro_app/icons/icon-144x144.png',
  '/Pomodoro_app/icons/icon-152x152.png',
  '/Pomodoro_app/icons/icon-192x192.png',
  '/Pomodoro_app/icons/icon-384x384.png',
  '/Pomodoro_app/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Only handle http(s) requests
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 