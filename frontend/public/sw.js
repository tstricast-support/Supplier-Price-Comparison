// BuySmart service worker
// Caches the app shell so the installed app can open even with a flaky
// connection, and lets the browser treat the site as "installable".
// It does NOT cache API calls (/api/...) — those should always hit the
// network so prices stay live.

const CACHE_NAME = 'buysmart-shell-v1'
const SHELL_FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never cache API requests — prices must always be fresh.
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Only handle GET requests for the shell; everything else passes through.
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          // Keep the cached shell up to date in the background.
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => cached) // offline fallback to cache

      return cached || networkFetch
    })
  )
})