// Web Push handlers, imported into the generated Workbox service worker via
// `workbox.importScripts` (see vite.config.ts). Kept as a plain, unbundled file so it
// can live in public/ and be importScripts()'d at service-worker startup. The payload
// shape ({ title, body, url }) is produced by Typerek::Push::Send on the backend.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Typerek', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Typerek'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    // Carried through to the click handler so we can deep-link to the right screen.
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an already-open app tab (and navigate it) instead of opening a duplicate.
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    }),
  )
})
