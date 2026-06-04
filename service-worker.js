// Bump this version string every time you want to force-clear old caches.
// Changed from v1 → v4 to fix stale index.html serving old JS bundles,
// ignore unsupported request types, and bypass third-party requests.
const CACHE_NAME = 'pitstop-cache-v4'

// Only pre-cache truly static assets — never index.html.
// index.html must always be fetched fresh so new JS chunk hashes are picked up.
const PRECACHE_ASSETS = ['/favicon.ico']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle normal HTTP(S) GET requests. Ignore extension URLs and POST/
  // other methods so the Cache API never sees unsupported requests.
  if (!['http:', 'https:'].includes(url.protocol) || event.request.method !== 'GET') {
    return
  }

  // Never proxy cross-origin requests through this service worker.
  // This avoids interfering with Google Maps scripts/tiles and other CDNs.
  if (url.origin !== self.location.origin) {
    return
  }

  // Always network-first for Firebase auth handlers and API calls
  if (
    url.pathname.startsWith('/__/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/functions/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }

  // Network-first for HTML navigation requests.
  // This ensures fresh index.html (with correct JS chunk hashes) is always
  // used after a new deployment, preventing stale-bundle auth bugs.
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Cache-first for content-hashed static assets (JS, CSS, images, fonts).
  // These are immutable — their hash changes when content changes.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {})
          }
          return res
        })
        .catch(() => cached || caches.match('/favicon.ico'))
    })
  )
})
