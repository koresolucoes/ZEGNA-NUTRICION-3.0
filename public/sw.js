// A more robust and modern service worker implementation.

const CACHE_NAME = 'zegna-nutricion-v3'; // Incremented cache version
// A safer list of assets to cache during installation.
// External resources were removed as they can fail due to CORS or redirects,
// causing the entire installation to fail. The browser's HTTP cache is
// better suited for these assets.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// --- INSTALL: Cache the app shell ---
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(urlsToCache).catch(error => {
          console.error('[Service Worker] Failed to cache one or more resources during install:', error);
      });
    })
  );
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// --- FETCH: Implement robust caching strategies ---
self.addEventListener('fetch', event => {
    // Ignore non-GET requests and requests to Supabase/APIs
    if (event.request.method !== 'GET' || event.request.url.includes('supabase.co') || event.request.url.includes('/api/')) {
        return;
    }

    // Strategy: Network falling back to cache for HTML navigation
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const networkResponse = await fetch(event.request);
                    // If we get a valid response, cache it and return it
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    console.log('[Service Worker] Fetch failed for navigation; returning from cache.', error);
                    const cachedResponse = await caches.match(event.request);
                    // Fallback to the root index.html if the specific page isn't cached
                    return cachedResponse || caches.match('/index.html');
                }
            })()
        );
        return;
    }

    // Strategy: Cache falling back to network for assets (JS, CSS, images)
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request);
            
            if (cachedResponse) {
                return cachedResponse;
            }
            
            try {
                const networkResponse = await fetch(event.request);
                // If we get a valid response, cache it for next time
                if (networkResponse && networkResponse.status === 200) {
                     await cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                 console.error('[Service Worker] Fetch failed for asset:', event.request.url, error);
                 // We don't have a fallback asset, so the request will fail as it would without a SW
            }
        })()
    );
});

// --- PUSH NOTIFICATION LISTENERS ---
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Nueva Notificación', body: event.data.text() };
  }

  const { title, body, icon, badge } = data;

  const options = {
    body: body,
    icon: icon, // Will be undefined if not in payload, which is valid
    badge: badge, // Will be undefined if not in payload, which is valid
    vibrate: [200, 100, 200],
    tag: 'zegna-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});