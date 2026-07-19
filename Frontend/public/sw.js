// OASIS - PWA Service Worker
// Manages offline assets caching and Firebase Cloud Messaging push events

const CACHE_NAME = 'oasis-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/oasis-icon.png',
  '/oasis-logo.png',
  '/robots.txt'
];

// Installation: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('OASIS SW: Pre-caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('OASIS SW: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch events strategy: Network-First with Cache Fallback for assets, bypass API/WebSockets
self.addEventListener('fetch', (event) => {
  // 1. Only intercept GET requests (Service Worker cannot handle stateful POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 2. ABSOLUTE BYPASS: Ignore Socket.io, backend API routes, hot updates, local/remote backend, and Next.js dynamic chunks
  if (
    url.pathname.includes('/_next/static/chunks/') || // Next.js dynamic code chunks
    url.pathname.includes('/_next/static/webpack/') || // Webpack hot updates
    url.pathname.includes('/socket.io/') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/auth/') ||
    url.port === '8000' ||
    url.host.includes('localhost:8000') ||
    url.hostname !== self.location.hostname // Bypasses all cross-origin requests
  ) {
    return; // Pass through to the browser network layer
  }

  // 3. Only handle HTTP/HTTPS protocols (avoid chrome-extension:// etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 4. Network-First Strategy with Cache Fallback, and a guaranteed fallback response (NEVER return undefined)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid static responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Offline Fallback
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Page navigation fallback to '/' shell
        if (event.request.headers.get('accept')?.includes('text/html')) {
          const appShell = await caches.match('/');
          if (appShell) return appShell;
        }

        // Return a valid standard offline response instead of resolving to undefined
        return new Response('Network error occurred. Resource not cached offline.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});

// Push Notifications receiver
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'Oasis Nicaragua', body: event.data.text() };
    }
  }

  const title = payload.title || 'Oasis Nicaragua';
  const options = {
    body: payload.body || 'Tienes una nueva notificación.',
    icon: '/oasis-icon.png',
    badge: '/oasis-icon.png',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ver Detalles' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const redirectUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find window client and focus if open
      for (const client of clientList) {
        const clientPath = new URL(client.url).pathname;
        if (clientPath === redirectUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(redirectUrl);
      }
    })
  );
});
