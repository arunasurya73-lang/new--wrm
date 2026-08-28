self.addEventListener('push', function(e) {
  const data = e.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'aqi-alert',
    requireInteraction: true
  })
})

self.addEventListener('notificationclick', function(e) {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})
