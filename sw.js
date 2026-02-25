// ============================================
// MAA TARINI GAS AGENCY - Service Worker
// Enables offline use + home screen install
// ============================================

const CACHE_NAME = 'maatarini-gas-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ---- INSTALL: Cache all assets ----
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: Clean old caches ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: Serve from cache, fallback to network ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For Google Fonts & external APIs — network only (no cache)
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', {status: 503}))
    );
    return;
  }

  // For app files — Cache First strategy
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new resources dynamically
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});

// ---- BACKGROUND SYNC: Sync pending orders when back online ----
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    console.log('[SW] Background sync triggered');
    // App handles sync via JS when online
  }
});

// ---- PUSH NOTIFICATIONS (future use) ----
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'Maa Tarini Gas', {
    body: data.body || 'New update available',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200]
  });
});
