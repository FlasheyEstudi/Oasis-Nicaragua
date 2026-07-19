// firebase-messaging-sw.js
// ⚠️ Este Service Worker SOLO maneja notificaciones push de Firebase
// NO intercepta fetch, NO cachea nada, NO interfiere con Next.js ni Turbopack

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Leer credenciales desde los query params de la URL del Service Worker
// Ejemplo: /firebase-messaging-sw.js?apiKey=...&projectId=...
const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
});

const messaging = firebase.messaging();

// ✅ NO interceptar fetch (esto evita conflictos con Next.js)
self.addEventListener('fetch', (event) => {
  // NO hacer nada - dejar que el navegador maneje todas las peticiones
  return;
});

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Oasis Nicaragua';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva actualización',
    icon: '/oasis-logo.png',
    badge: '/oasis-icon.png',
    data: payload.data || {},
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
