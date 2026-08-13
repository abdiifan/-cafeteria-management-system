// ============================================================
// Minimal offline service worker
// ============================================================
// Goal: the POS page (and the app shell around it) still opens
// when the tablet has no signal, so a cashier isn't stuck on a
// blank white screen mid-shift. This is intentionally simple —
// no build-time manifest of hashed filenames, no Workbox — just
// "cache what's been visited, serve it if the network fails."
//
// Actual sale data is handled separately by the localStorage
// outbox in src/lib/offlineQueue.js. This worker only deals with
// the app's own HTML/JS/CSS/fonts, not Supabase API traffic.
// ============================================================

const CACHE_NAME = 'cms-shell-v1'
const CORE_ASSETS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch Supabase (or any cross-origin API) traffic — that's the
  // offline outbox's job, not this worker's. Only cache same-origin
  // app-shell requests (HTML/JS/CSS/fonts/images).
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const fallback = await caches.match('/index.html')
          if (fallback) return fallback
        }
        return Response.error()
      })
  )
})
