self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Anime Rilis Baru!';
    const options = {
      body: data.body || 'Ada episode baru tayang hari ini.',
      icon: data.icon || '/Logo.png',
      badge: '/Logo.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // If a window client is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
