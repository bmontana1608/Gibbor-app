self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo.png', // Logo de Gibbor
      badge: '/logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver detalle',
          icon: '/logo.png'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/logo.png'
        },
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Manejador de fetch (Obligatorio para que algunos navegadores consideren la PWA como válida/instalable)
self.addEventListener('fetch', function(event) {
  // Se deja el listener vacío. Esto es suficiente para engañar a los navegadores 
  // y que consideren la PWA como instalable, sin interceptar ni romper las peticiones de Next.js
});
